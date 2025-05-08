/* eslint-disable no-console */

import {isNeObject} from '@valkyriestudios/utils/object';
import {
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
} from '../types';

export class ConsoleExporter implements TriFrostLoggerExporter {

    #trifrost:Record<string, unknown>|null = null;

    init (trifrost:Record<string, unknown>) {
        this.#trifrost = trifrost;
    }

    async pushLog (log: TriFrostLoggerLogPayload): Promise<void> {
        const msg = `[${log.time.toISOString()}] [${log.level}] ${log.message}`;

        let meta: Record<string, unknown>|null = {};
        if (log.trace_id) meta.trace_id = log.trace_id;
        if (log.span_id) meta.span_id = log.span_id;
        if (log.parent_span_id) meta.parent_span_id = log.parent_span_id;
        if (log.context) meta.context = log.context;
        if (log.data) meta.data = log.data;
        if (this.#trifrost) meta.$trifrost = this.#trifrost;
        if (!isNeObject(meta)) meta = null;

        switch (log.level) {
            case 'error':
                if (meta) console.error(msg, meta);
                else console.error(msg);
                break;
            case 'warn':
                if (meta) console.warn(msg, meta);
                else console.warn(msg);
                break;
            case 'debug':
                if (meta) console.debug(msg, meta);
                else console.debug(msg);
                break;
            case 'info':
                if (meta) console.info(msg, meta);
                else console.info(msg);
                break;
            default:
                if (meta) console.log(msg, meta);
                else console.log(msg);
                break;
        }
    }

    async flush (): Promise<void> {
        /* No-Op for console */
    }

}
