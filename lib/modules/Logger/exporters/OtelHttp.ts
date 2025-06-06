import {sleep} from '@valkyriestudios/utils/function';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isObject, scramble} from '@valkyriestudios/utils/object';
import {
    type TriFrostLoggerSpanPayload,
    type TriFrostLogLevel,
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
    type TriFrostLogScramblerValue,
} from '../types';
import {normalizeScramblerValues, OMIT_PRESETS} from '../util';

const LEVELSMAP:Record<TriFrostLogLevel, string> = {
    debug: 'DEBUG',
    error: 'ERROR',
    info: 'INFO',
    log: 'LOG',
    warn: 'WARN',
};

type OtelAttribute = {key:string, value: {stringValue: string}|{intValue:number}|{doubleValue:number}|{boolValue:boolean}};

function convertObjectToAttributes (obj:Record<string, unknown>, prefix:string = ''):OtelAttribute[] {
    const acc:OtelAttribute[] = [];
    for (const key in obj) {
        const val = obj[key];
        switch (typeof val) {
            case 'string':
                acc.push({key: prefix + key, value: {stringValue: val as string}});
                break;
            case 'number':
                if (Number.isFinite(val)) {
                    acc.push({key: prefix + key, value: Number.isInteger(val) ? {intValue: val as number} : {doubleValue: val as number}});
                }
                break;
            case 'boolean':
                acc.push({key: prefix + key, value: {boolValue: val as boolean}});
                break;
            default:
                if (isObject(val) || Array.isArray(val)) {
                    acc.push({key: prefix + key, value: {stringValue: JSON.stringify(val)}});
                }
                break;
        }
    }
    return acc;
}

export class OtelHttpExporter implements TriFrostLoggerExporter {

    #logEndpoint:string;

    #spanEndpoint:string;

    #headers:Record<string, string>;

    /**
     * Internal buffer for logs
     */
    #buffer:TriFrostLoggerLogPayload[] = [];

    /**
     * Internal buffer for spans
     */
    #spanBuffer:TriFrostLoggerSpanPayload[] = [];

    /**
     * Max size per batch that we send through to source system
     */
    #maxBatchSize:number = 20;

    /**
     * Max internal buffer size
     */
    #maxBufferSize:number = 10_000;

    /**
     * Max retries when sending batch to source system
     */
    #maxRetries:number = 3;

    #resourceAttributes:OtelAttribute[] = [];

    /**
     * Omit keys from the meta object that is logged to console
     */
    #omit:string[];

    constructor (options: {
        logEndpoint:string;
        spanEndpoint?:string;
        headers?:Record<string, string>;
        maxBatchSize?:number;
        maxBufferSize?:number;
        maxRetries?:number;
        omit?:TriFrostLogScramblerValue[];
    }) {
        this.#logEndpoint = options.logEndpoint;
        this.#spanEndpoint = options.spanEndpoint || options.logEndpoint;
        this.#headers = {
            'Content-Type': 'application/json',
            ...options.headers || {},
        };

        /* Configure max batch size */
        if (isIntGt(options.maxBatchSize, 0)) this.#maxBatchSize = options.maxBatchSize;

        /* Configure max buffer size */
        if (isIntGt(options.maxBufferSize, 0)) this.#maxBufferSize = options.maxBufferSize;

        /* Cap max batch size to max buffer size */
        if (this.#maxBatchSize > this.#maxBufferSize) this.#maxBatchSize = this.#maxBufferSize;

        /* Configure max retries */
        if (isIntGt(options.maxRetries, 0)) this.#maxRetries = options.maxRetries;

        /* Configure omit */
        this.#omit = normalizeScramblerValues(Array.isArray(options?.omit)
            ? options.omit
            : OMIT_PRESETS.default
        );
    }

    init (trifrost:Record<string, unknown>) {
        this.#resourceAttributes = convertObjectToAttributes(this.scramble(trifrost));
    }

    scramble (val:Record<string, unknown>) {
        return this.#omit.length ? scramble(val, this.#omit) : val;
    }

    async pushLog (log:TriFrostLoggerLogPayload): Promise<void> {
        this.#buffer.push(log);
        if (this.#buffer.length >= this.#maxBatchSize) await this.flushLogs();
    }

    async pushSpan (span:TriFrostLoggerSpanPayload) {
        this.#spanBuffer.push(span);
        if (this.#spanBuffer.length >= this.#maxBatchSize) await this.flushSpans();
    }

    async flush ():Promise<void> {
        await Promise.all([
            this.flushLogs(),
            this.flushSpans(),
        ]);
    }

    /**
     * Flushes Otel Logs
     */
    async flushLogs (): Promise<void> {
        if (this.#buffer.length === 0) return;

        /* swap out buffer */
        const batch = this.#buffer;
        this.#buffer = [];

        /* Convert logs */
        const logRecords = [];
        for (let i = 0; i < batch.length; i++) {
            const log = batch[i];

            /* Scramble sensitive values and convert to attributes */
            const attributes = [
                ...log.ctx ? convertObjectToAttributes(this.scramble(log.ctx), 'ctx.') : [],
                ...log.data ? convertObjectToAttributes(this.scramble(log.data), 'data.') : [],
            ];
            if (log.trace_id) attributes.push({key: 'trace_id', value: {stringValue: log.trace_id}});
            if (log.span_id) attributes.push({key: 'span_id', value: {stringValue: log.span_id}});

            logRecords.push({
                timeUnixNano: log.time.getTime() * 1_000_000,
                severityText: LEVELSMAP[log.level],
                body: {stringValue: log.message},
                attributes,
            });
        }

        const success = await this.sendWithRetry(this.#logEndpoint, {resourceLogs: [{
            resource: {
                attributes: this.#resourceAttributes,
            },
            scopeLogs: [{
                scope: {name: 'trifrost.logger', version: '1.0.0'},
                logRecords,
            }],
        }]});

        /* If failed, requeue batch */
        if (!success) {
            const newSize = this.#buffer.length + batch.length;
            /* Only add if new size does not go over buffer max size */
            if (newSize <= this.#maxBufferSize) this.#buffer.unshift(...batch);
        }
    }

    /**
     * Flushes Otel Spans
     */
    async flushSpans (): Promise<void> {
        if (this.#spanBuffer.length === 0) return;

        /* swap out buffer */
        const batch = this.#spanBuffer;
        this.#spanBuffer = [];

        /* Convert to otel format */
        const otelSpans = [];
        for (let i = 0; i < batch.length; i++) {
            const span = batch[i];

            otelSpans.push({
                name: span.name,
                traceId: span.traceId,
                spanId: span.spanId,
                startTimeUnixNano: span.start * 1_000_000,
                endTimeUnixNano: span.end * 1_000_000,
                attributes: convertObjectToAttributes(this.scramble(span.ctx)),
                ...span.parentSpanId && {parentSpanId: span.parentSpanId},
                ...span.status && {status: span.status},
            });
        }

        const success = await this.sendWithRetry(this.#spanEndpoint, {resourceSpans: [{
            resource: {
                attributes: this.#resourceAttributes,
            },
            scopeSpans: [{
                scope: {name: 'trifrost.logger', version: '1.0.0'},
                spans: otelSpans,
            }],
        }]});

        /* If failed, requeue batch */
        if (!success) {
            const newSize = this.#spanBuffer.length + batch.length;
            /* Only add if new size does not go over buffer max size */
            if (newSize <= this.#maxBufferSize) this.#spanBuffer.unshift(...batch);
        }
    }

    private async sendWithRetry (endpoint:string, body: Record<string, unknown>) {
        let attempt = 0;
        let delay = 100;

        while (attempt < this.#maxRetries) {
            try {
                const res = await globalThis.fetch(endpoint, {
                    method: 'POST',
                    headers: this.#headers,
                    body: JSON.stringify(body),
                });

                if (res.ok) return true;
                throw new Error(`Transport received HTTP ${res.status}`);
            } catch (err) {
                attempt++;
                if (attempt >= this.#maxRetries) {
                    console.error('[Logger] Transport failed after retries', err);
                    return true; /* We return true here to prevent memory overflows */
                }

                /* Jittered exponential backoff */
                const jitter = delay * 0.5 * Math.random();
                await sleep(delay + jitter);
                delay *= 2;
            }
        }

        return false;
    }

}
