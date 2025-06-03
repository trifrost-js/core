/* eslint-disable no-console */

import {isBoolean} from '@valkyriestudios/utils/boolean';
import {isFn} from '@valkyriestudios/utils/function';
import {
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
} from '../types';

/* Default format function */
const DEFAULT_FORMAT = (log:TriFrostLoggerLogPayload) => '[' + log.time.toISOString() + '] [' + log.level + '] ' + log.message;

export class ConsoleExporter implements TriFrostLoggerExporter {

    #global_attrs:Record<string, unknown>|null = null;

    /**
     * Whether or not to use console groups (defaults to true)
     */
    #grouped:boolean = true;

    /**
     * Function to use to format the primary label.
     * default format is "[{time}] [{level}] {message}"
     */
    #format:(log: TriFrostLoggerLogPayload) => string = DEFAULT_FORMAT;

    constructor (options?: {
        grouped?: boolean;
        format?: (log:TriFrostLoggerLogPayload) => string;
    }) {
        /* Configure grouped if passed */
        if (isBoolean(options?.grouped)) this.#grouped = options.grouped;

        /* Configure format if passed */
        if (isFn(options?.format)) this.#format = options?.format;
    }

    init (global_attrs:Record<string, unknown>) {
        this.#global_attrs = global_attrs;
    }

    async pushLog (log: TriFrostLoggerLogPayload): Promise<void> {
        const msg = this.#format(log);

        const meta:Record<string, unknown>|null = {
            time: log.time,
            level: log.level,
        };

        /* Add trace id */
        if (log.trace_id) meta.trace_id = log.trace_id;

        /* Add span id */
        if (log.span_id) meta.span_id = log.span_id;

        /* Add parent span id */
        if (log.parent_span_id) meta.parent_span_id = log.parent_span_id;

        /* Add context */
        if (log.context) meta.context = log.context;

        /* Add data */
        if (log.data) meta.data = log.data;

        /* Add global attributes */
        if (this.#global_attrs) meta.attributes = this.#global_attrs;

        /* Write */
        if (this.#grouped) {
            console.groupCollapsed(msg);
            switch (log.level) {
                case 'error':
                    console.error(meta);
                    break;
                case 'warn':
                    console.warn(meta);
                    break;
                case 'debug':
                    console.debug(meta);
                    break;
                case 'info':
                    console.info(meta);
                    break;
                case 'log':
                default:
                    console.log(meta);
                    break;
            }
            console.groupEnd();
        } else {
            switch (log.level) {
                case 'error':
                    console.error(msg, meta);
                    break;
                case 'warn':
                    console.warn(msg, meta);
                    break;
                case 'debug':
                    console.debug(msg, meta);
                    break;
                case 'info':
                    console.info(msg, meta);
                    break;
                case 'log':
                default:
                    console.log(msg, meta);
                    break;
            }
        }
    }

    async flush (): Promise<void> {
        /* No-Op for console */
    }

}
