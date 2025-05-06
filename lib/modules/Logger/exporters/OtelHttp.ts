import {sleep} from '@valkyriestudios/utils/function/sleep';
import {
    type TriFrostLoggerSpanPayload,
    type TriFrostLogLevel,
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
} from '../types';

const LEVELSMAP:Record<TriFrostLogLevel, string> = {
    debug: 'DEBUG',
    error: 'ERROR',
    info: 'INFO',
    log: 'LOG',
    warn: 'WARN',
};

type OtelAttribute = {key:string, value: {stringValue: string}};

function convertObjectToAttributes (obj:Record<string, unknown>, prefix:string = ''):OtelAttribute[] {
    const acc:OtelAttribute[] = [];
    for (const key in obj) {
        acc.push({
            key: `${prefix}${key}`,
            value: {stringValue: String(obj[key])},
        });
    }
    return acc;
}

export class OtelHttpExporter implements TriFrostLoggerExporter {

    #logEndpoint:string;

    #spanEndpoint:string;

    #headers: Record<string, string>;

    #buffer: TriFrostLoggerLogPayload[] = [];

    #spanBuffer: TriFrostLoggerSpanPayload[] = [];

    #maxBatchSize: number;

    #maxRetries: number;

    #resourceAttributes:OtelAttribute[] = [];

    constructor (cfg: {
        logEndpoint: string;
        spanEndpoint?: string;
        headers?: Record<string, string>;
        maxBatchSize?: number;
        maxRetries?: number;
    }) {
        this.#logEndpoint = cfg.logEndpoint;
        this.#spanEndpoint = cfg.spanEndpoint || cfg.logEndpoint;
        this.#headers = {
            'Content-Type': 'application/json',
            ...cfg.headers || {},
        };
        this.#maxBatchSize = cfg.maxBatchSize ?? 20;
        this.#maxRetries = cfg.maxRetries ?? 3;
    }

    init (trifrost:Record<string, unknown>) {
        this.#resourceAttributes = convertObjectToAttributes(trifrost);
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

        const batch = this.#buffer.splice(0, this.#buffer.length);

        /* Convert logs */
        const logRecords = [];
        for (let i = 0; i < batch.length; i++) {
            const log = batch[i];

            const attributes = [
                ...convertObjectToAttributes(log.context || {}, 'ctx.'),
                ...convertObjectToAttributes(log.data || {}, 'data.'),
            ];
            if (log.trace_id) attributes.push({key: 'trace_id', value: {stringValue: log.trace_id}});
            if (log.span_id) attributes.push({key: 'span_id', value: {stringValue: log.span_id}});
            if (log.parent_span_id) attributes.push({key: 'parent_span_id', value: {stringValue: log.parent_span_id}});

            logRecords.push({
                timeUnixNano: log.time.getTime() * 1_000_000,
                severityText: LEVELSMAP[log.level],
                body: {stringValue: log.message},
                attributes,
            });
        }

        await this.#sendWithRetry(this.#logEndpoint, {resourceLogs: [{
            resource: {
                attributes: this.#resourceAttributes,
            },
            scopeLogs: [{
                scope: {name: 'trifrost.logger', version: '1.0.0'},
                logRecords,
            }],
        }]});
    }

    /**
     * Flushes Otel Spans
     */
    async flushSpans (): Promise<void> {
        if (this.#spanBuffer.length === 0) return;
        const spans = this.#spanBuffer.splice(0, this.#spanBuffer.length);

        /* Convert to otel format */
        const otelSpans = [];
        for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            otelSpans.push({
                name: span.name,
                traceId: span.traceId,
                spanId: span.spanId,
                startTimeUnixNano: span.start * 1_000_000,
                endTimeUnixNano: span.end * 1_000_000,
                attributes: convertObjectToAttributes(span.context),
                ...span.parentSpanId && {parentSpanId: span.parentSpanId},
                ...span.status && {status: span.status},
            });
        }

        await this.#sendWithRetry(this.#spanEndpoint, {resourceSpans: [{
            resource: {
                attributes: this.#resourceAttributes,
            },
            scopeSpans: [{
                scope: {name: 'trifrost.logger', version: '1.0.0'},
                spans: otelSpans,
            }],
        }]});
    }

    async #sendWithRetry (endpoint:string, body: Record<string, unknown>) {
        let attempt = 0;
        let delay = 100;

        while (attempt < this.#maxRetries) {
            try {
                const res = await globalThis.fetch(endpoint, {
                    method: 'POST',
                    headers: this.#headers,
                    body: JSON.stringify(body),
                });

                if (res.ok) return;
                throw new Error(`Transport received HTTP ${res.status}`);
            } catch (err) {
                attempt++;
                if (attempt >= this.#maxRetries) {
                    console.error('[Logger] Transport failed after retries', err);
                    return;
                }

				/* Jittered exponential backoff */
                const jitter = delay * 0.5 * Math.random();
                await sleep(delay + jitter);
                delay *= 2;
            }
        }
    }

}
