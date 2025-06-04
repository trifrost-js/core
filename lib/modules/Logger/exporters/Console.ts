/* eslint-disable no-console */

import {isNeArray} from '@valkyriestudios/utils/array';
import {isBoolean} from '@valkyriestudios/utils/boolean';
import {isFn} from '@valkyriestudios/utils/function';
import {isNeObject, omit} from '@valkyriestudios/utils/object';
import {
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
} from '../types';

/* Default format function */
const DEFAULT_FORMAT = (log:TriFrostLoggerLogPayload) => '[' + log.time.toISOString() + '] [' + log.level + '] ' + log.message;

const INCLUSION_FIELDS = ['ctx', 'trace_id', 'span_id', 'time', 'level', 'global'] as const;

type ConsoleExporterFormatter = (log:TriFrostLoggerLogPayload) => string;
type ConsoleExporterIncludeField = typeof INCLUSION_FIELDS[number];

function normalizeInclusion (inclusion:ConsoleExporterIncludeField[]) {
    const acc:Set<ConsoleExporterIncludeField> = new Set();
    for (let i = 0; i < inclusion.length; i++) {
        const val = inclusion[i];
        if (INCLUSION_FIELDS.includes(val)) acc.add(val);
    }
    return [...acc.values()];
}

/**
 * A structured console logger with support for grouping, custom formatting,
 * and selective metadata inclusion.
 *
 * Ideal for local development, where concise yet contextual logs are key.
 */
export class ConsoleExporter implements TriFrostLoggerExporter {

    #global_attrs:Record<string, unknown>|null = null;

    /**
     * Whether or not to use console groups (defaults to false)
     */
    #grouped:boolean = false;

    /**
     * What aspects of the log object to be included
     */
    #inclusions:ConsoleExporterIncludeField[];

    /**
     * Omit keys from the meta object that is logged to console
     */
    #omit:string[]|null = null;

    /**
     * Function to use to format the primary label.
     * default format is "[{time}] [{level}] {message}"
     */
    #format:ConsoleExporterFormatter = DEFAULT_FORMAT;

    constructor (options?:{
        grouped?:boolean;
        omit?:string[];
        format?:ConsoleExporterFormatter;
        include?:ConsoleExporterIncludeField[];
    }) {
        /* Configure grouped if passed */
        if (isBoolean(options?.grouped)) this.#grouped = options.grouped;

        /* Configure omit */
        if (isNeArray(options?.omit)) this.#omit = options.omit;

        /* Configure format if passed */
        if (isFn(options?.format)) this.#format = options.format;

        /* Configure include if passed */
        this.#inclusions = normalizeInclusion(isNeArray(options?.include) ? options.include : []);
    }

    init (global_attrs:Record<string, unknown>) {
        this.#global_attrs = global_attrs;
    }

    async pushLog (log:TriFrostLoggerLogPayload):Promise<void> {
        const msg = this.#format(log);

        let has_meta:boolean = false;
        let meta:Record<string, unknown> = {};

        /* Data */
        if (isNeObject(log.data)) {
            has_meta = true;
            meta.data = log.data;
        }
        
        /* Run inclusions */
        if (this.#inclusions.length) {
            has_meta = true;
            for (let i = 0; i < this.#inclusions.length; i++) {
                const inc = this.#inclusions[i];
                switch (inc) {
                    case 'global':
                        meta.global = this.#global_attrs;
                        break;
                    default:
                        meta[inc] = log[inc];
                    
                }
            }
        }

        /* Clean */
        if (this.#omit) meta = omit(meta, this.#omit);

        /* Write */
        if (this.#grouped && has_meta) {
            console.groupCollapsed(msg);
            console[log.level](meta);
            console.groupEnd();
        } else if (has_meta) {
            console[log.level](msg, meta);
        } else {
            console[log.level](msg);
        }
    }

    async flush ():Promise<void> {
        /* No-Op for console */
    }

}
