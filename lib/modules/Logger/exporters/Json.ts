/* eslint-disable no-console */

import {isNeArray} from '@valkyriestudios/utils/array';
import {isFn} from '@valkyriestudios/utils/function';
import {omit} from '@valkyriestudios/utils/object';
import {
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
    type TriFrostLogLevel,
} from '../types';

type JsonExporterEntry = {
    time: string;
    level: TriFrostLogLevel;
    message: string;
    trace_id: string;
    span_id: string;
    parent_span_id: string;
    ctx: Record<string, unknown>;
    data: Record<string, unknown>;
    global: Record<string, unknown>;
};
type JsonExporterSink = (entry:JsonExporterEntry) => void;

export class JsonExporter implements TriFrostLoggerExporter {

    #global_attrs:Record<string, unknown>|null = null;

    /**
     * Omit keys from the meta object that is logged to console
     */
    #omit:string[]|null = null;

    /**
     * Sink for the json entries, if not defined will be console
     */
    #sink:JsonExporterSink|null = null;

    constructor (options?:{
        omit?:string[];
        sink?:JsonExporterSink;
    }) {
        /* Configure omit */
        if (isNeArray(options?.omit)) this.#omit = options.omit;

        /* Configure sink if passed */
        if (isFn(options?.sink)) this.#sink = options.sink;
    }

    init (global_attrs:Record<string, unknown>) {
        this.#global_attrs = global_attrs;
    }

    async pushLog (log: TriFrostLoggerLogPayload): Promise<void> {
        let entry = {
            time: log.time.toISOString(),
            level: log.level,
            message: log.message,
        } as JsonExporterEntry;

        /* Add trace id */
        if (log.trace_id) entry.trace_id = log.trace_id;

        /* Add span id */
        if (log.span_id) entry.span_id = log.span_id;

        /* Add context */
        if (log.ctx) entry.ctx = log.ctx;

        /* Add data */
        if (log.data) entry.data = log.data;

        /* Add global attributes */
        if (this.#global_attrs) entry.global = this.#global_attrs;

        /* Clean */
        /* @ts-expect-error Should be good */
        if (this.#omit) entry = omit(entry, this.#omit) as JsonExporterEntry;

        if (this.#sink) {
            this.#sink(entry);
        } else {
            console[log.level](JSON.stringify(entry));
        }
    }

    async flush (): Promise<void> {
		/* No-Op for Json console exporter */
    }

}
