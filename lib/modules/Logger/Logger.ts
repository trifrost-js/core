import {hexId} from '@valkyriestudios/utils/hash';
import {
    type TriFrostLogger,
    type TriFrostLoggerSpan,
    type TriFrostLoggerExporter,
    type TriFrostLogLevel,
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerSpanPayload,
    type TriFrostLoggerSpanAwareExporter,
} from './types';

/* Ensure valid trace id, a otel trace id IS a 32 hexadecimal char string 0-9 a-f */
export function isValidTraceId(str: string): boolean {
    if (str.length !== 32) return false;

    let c: number;
    let i = 32;
    while (--i >= 0) {
        c = str.charCodeAt(i);
        if ((c < 48 || c > 57) && (c < 97 || c > 102)) return false;
    }
    return true;
}

export class Logger implements TriFrostLogger {
    #debug: boolean;

    #traceId: string | null = null;

    #activeSpanId: string | null = null;

    #attributes: Record<string, unknown> = {};

    #exporters: TriFrostLoggerExporter[];

    #spanAwareExporters: TriFrostLoggerSpanAwareExporter[] = [];

    constructor(cfg: {
        debug: boolean;
        traceId?: string;
        context?: Record<string, unknown>;
        exporters: TriFrostLoggerExporter[];
        spanAwareExporters: TriFrostLoggerSpanAwareExporter[];
    }) {
        this.#debug = cfg.debug;
        this.#attributes = {...(cfg.context ?? {})};

        /* Set trace id */
        if (cfg.traceId) this.#traceId = isValidTraceId(cfg.traceId) ? cfg.traceId : hexId(16);

        this.#exporters = cfg.exporters;
        this.#spanAwareExporters = cfg.spanAwareExporters;
    }

    get traceId(): string | null {
        return this.#traceId;
    }

    setDebug(val: boolean) {
        this.#debug = !!val;
    }

    setAttribute(key: string, value: unknown): this {
        this.#attributes[key] = value;
        return this;
    }

    setAttributes(obj: Record<string, unknown>): this {
        Object.assign(this.#attributes, obj);
        return this;
    }

    debug(msg: string, data?: Record<string, unknown>) {
        if (this.#debug) this.#log('debug', msg, data);
    }

    info(msg: string, data?: Record<string, unknown>) {
        this.#log('info', msg, data);
    }

    log(msg: string, data?: Record<string, unknown>) {
        this.#log('log', msg, data);
    }

    warn(msg: string, data?: Record<string, unknown>) {
        this.#log('warn', msg, data);
    }

    error(msg: string | Error | unknown, data?: Record<string, unknown>) {
        if (msg instanceof Error) {
            this.#log('error', msg.message, {
                ...data,
                stack: msg.stack,
            });
        } else if (typeof msg === 'string') {
            this.#log('error', msg, data);
        } else {
            this.#log('error', 'Unknown error', {...data, raw: msg});
        }
    }

    async span<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
        const span = this.startSpan(name);
        try {
            return await fn();
        } finally {
            span.end();
        }
    }

    startSpan(name: string): TriFrostLoggerSpan {
        const start = Date.now();
        const attributes: Record<string, unknown> = {};
        const parentSpanId = this.#activeSpanId;
        const spanId = hexId(8);
        this.#activeSpanId = spanId;
        const obj: TriFrostLoggerSpan = {
            uid: () => spanId,
            setAttribute: (key, value) => {
                attributes[key] = value;
                return obj;
            },
            setAttributes: val => {
                Object.assign(attributes, val);
                return obj;
            },
            end: () => {
                const end = Date.now();

                if (this.#spanAwareExporters.length && this.#traceId) {
                    const span: TriFrostLoggerSpanPayload = {
                        traceId: this.#traceId,
                        spanId,
                        parentSpanId: parentSpanId ?? undefined,
                        name,
                        start,
                        end,
                        ctx: {...this.#attributes, ...attributes},
                    };

                    /* Set span status */
                    if ('otel.status_code' in attributes) {
                        span.status = {code: attributes['otel.status_code'] === 'OK' ? 1 : 2};
                        if ('otel.status_message' in attributes) span.status.message = attributes['otel.status_message'] as string;
                    }

                    for (let i = 0; i < this.#spanAwareExporters.length; i++) {
                        this.#spanAwareExporters[i].pushSpan(span);
                    }
                }

                this.#activeSpanId = parentSpanId ?? null;
            },
        };

        return obj;
    }

    async flush(): Promise<void> {
        const proms: Promise<void>[] = [];
        for (let i = 0; i < this.#exporters.length; i++) {
            proms.push(this.#exporters[i].flush());
        }
        await Promise.all(proms);
    }

    #log(level: TriFrostLogLevel, message: string, data?: Record<string, unknown>) {
        const log: TriFrostLoggerLogPayload = {
            level,
            time: new Date(),
            message,
            data,
            ctx: {...this.#attributes},
        };
        if (this.#traceId) log.trace_id = this.#traceId;
        if (this.#activeSpanId) log.span_id = this.#activeSpanId;
        for (let i = 0; i < this.#exporters.length; i++) this.#exporters[i].pushLog(log);
    }
}
