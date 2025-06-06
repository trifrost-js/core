export type TriFrostLogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

export type TriFrostLogScramblerValue = string | {global:string};

export type TriFrostLoggerLogPayload = {
    level: TriFrostLogLevel;
    time: Date;
    message: string;
    data?: Record<string, unknown>;
    trace_id?: string;
    span_id?: string;
    ctx: Record<string, unknown>;
};

export type TriFrostLoggerSpanPayload = {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    start: number;
    end: number;
    ctx: Record<string, unknown>;
    status?: {code: 1 | 2, message?: string};
};

export interface TriFrostLoggerExporter {
    init: (globalAttributes:Record<string, unknown>) => void;
    scramble: (val:Record<string, unknown>) => Record<string, unknown>;
    pushLog: (log:TriFrostLoggerLogPayload) => Promise<void>;
    pushSpan?: (span:TriFrostLoggerSpanPayload) => void;
    flush: () => Promise<void>;
}

export interface TriFrostLoggerSpan {
    uid: () => string;

    setAttribute: (key:string, value:unknown) => TriFrostLoggerSpan;
    setAttributes: (obj:Record<string, unknown>) => TriFrostLoggerSpan;

    end: () => void;
}

export interface TriFrostLogger {
    get traceId ():string|null;

    debug: (msg:string, data?:Record<string, unknown>) => void;
    info: (msg:string, data?:Record<string, unknown>) => void;
    log: (msg:string, data?:Record<string, unknown>) => void;
    warn: (msg:string, data?:Record<string, unknown>) => void;
    error: (msg:string|Error|unknown, data?:Record<string, unknown>) => void;

    span: <T> (name:string, fn:() => Promise<T>|T) => Promise<T>;
    startSpan: (name:string) => TriFrostLoggerSpan;

    setAttribute: (key:string, value:unknown) => TriFrostLogger;
    setAttributes: (obj:Record<string, unknown>) => TriFrostLogger;

    flush: () => Promise<void>;
}
