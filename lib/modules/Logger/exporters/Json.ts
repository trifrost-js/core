/* eslint-disable no-console */

import {
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerExporter,
} from '../types';

export class JsonExporter implements TriFrostLoggerExporter {

    #trifrost:Record<string, unknown>|null = null;

    init (trifrost:Record<string, unknown>) {
        this.#trifrost = trifrost;
    }

    async pushLog (log: TriFrostLoggerLogPayload): Promise<void> {
        const entry: Record<string, unknown> = {
            time: log.time.toISOString(),
            level: log.level,
            message: log.message,
        };

        if (log.trace_id) entry.trace_id = log.trace_id;
        if (log.span_id) entry.span_id = log.span_id;
        if (log.parent_span_id) entry.parent_span_id = log.parent_span_id;
        if (log.data) entry.data = log.data;
        if (log.context) entry.context = log.context;
        if (this.#trifrost) entry.$trifrost = this.#trifrost;

        switch (log.level) {
            case 'error':
                console.error(JSON.stringify(entry));
                break;
            case 'warn':
                console.warn(JSON.stringify(entry));
                break;
            case 'debug':
                console.debug(JSON.stringify(entry));
                break;
            case 'info':
                console.info(JSON.stringify(entry));
                break;
            default:
                console.log(JSON.stringify(entry));
                break;
        }
    }

    async flush (): Promise<void> {
		/* No-Op for Json console exporter */
    }

}
