/* eslint-disable no-console */

import {isFn} from '@valkyriestudios/utils/function';
import {scramble} from '@valkyriestudios/utils/object';
import {
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
    type TriFrostLogLevel,
    type TriFrostLogScramblerValue,
} from '../types';
import {normalizeScramblerValues, OMIT_PRESETS} from '../util';

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
    #omit:string[];

    /**
     * Sink for the json entries, if not defined will be console
     */
    #sink:JsonExporterSink|null = null;

    constructor (options?:{
        omit?:TriFrostLogScramblerValue[];
        sink?:JsonExporterSink;
    }) {
        /* Configure omit */
        this.#omit = normalizeScramblerValues(Array.isArray(options?.omit)
            ? options.omit
            : OMIT_PRESETS.default
        );

        /* Configure sink if passed */
        if (isFn(options?.sink)) this.#sink = options.sink;
    }

    init (global_attrs:Record<string, unknown>) {
        this.#global_attrs = this.scramble(global_attrs);
    }

    scramble (val:Record<string, unknown>) {
        return this.#omit.length ? scramble(val, this.#omit) : val;
    }

    async pushLog (log: TriFrostLoggerLogPayload): Promise<void> {
        const entry = {
            time: log.time.toISOString(),
            level: log.level,
            message: log.message,
        } as JsonExporterEntry;

        /* Add trace id */
        if (log.trace_id) entry.trace_id = log.trace_id;

        /* Add span id */
        if (log.span_id) entry.span_id = log.span_id;

        /* Add context */
        if (log.ctx) entry.ctx = this.scramble(log.ctx);

        /* Add data */
        if (log.data) entry.data = this.scramble(log.data);

        /* Add global attributes */
        if (this.#global_attrs) entry.global = this.#global_attrs;

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
