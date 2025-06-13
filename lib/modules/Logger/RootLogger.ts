import {
    Lazy,
    type LazyInitFn,
} from '../../utils/Lazy';
import {
    type TriFrostLoggerSpanAwareExporter,
    type TriFrostLogger,
    type TriFrostLoggerExporter,
} from './types';
import {Logger} from './Logger';
import {
    determineDebug,
    determineName,
    determineVersion,
} from '../../utils/Generic';
import {type TriFrostRuntime} from '../../runtimes/types';
import {ConsoleExporter} from './exporters';

export class TriFrostRootLogger <Env extends Record<string, any> = Record<string, any>> {

    #debug:boolean = false;

    #exporters:Lazy<TriFrostLoggerExporter[], Env>;

    #spanAwareExporters:TriFrostLoggerSpanAwareExporter[] = [];

    #logger:Logger;

    #runtime:Record<string, unknown>;

    constructor (cfg:{
        runtime: TriFrostRuntime;
        exporters: LazyInitFn<TriFrostLoggerExporter[], Env>;
    }) {
        this.#exporters = new Lazy(cfg.exporters) as Lazy<TriFrostLoggerExporter[], Env>;
        this.#runtime = {
            ...typeof cfg.runtime.name === 'string' && {'runtime.name': cfg.runtime.name},
            ...typeof cfg.runtime.version === 'string' && {'runtime.version': cfg.runtime.version},
        };

        const rootExporter = new ConsoleExporter();

        this.#logger = new Logger({
            debug: false,
            exporters: [rootExporter],
            spanAwareExporters: [],
        });

        rootExporter.init({
            'service.name': 'trifrost-root',
            'service.version': '1.0.0',
            'telemetry.sdk.name': 'trifrost',
            'telemetry.sdk.language': 'javascript',
            ...this.#runtime,
        });
    }

    debug (msg:string, data?:Record<string, unknown>) {
        if (this.#debug) this.#logger.debug(msg, data);
    }

    info (msg:string, data?:Record<string, unknown>) {
        this.#logger.info(msg, data);
    }

    log (msg:string, data?:Record<string, unknown>) {
        this.#logger.log(msg, data);
    }

    warn (msg:string, data?:Record<string, unknown>) {
        this.#logger.warn(msg, data);
    }

    error (msg:string|Error|unknown, data?:Record<string, unknown>) {
        this.#logger.error(msg, data);
    }

    spawn (ctx: {
        traceId: string;
        env:Env;
        context?: Record<string, unknown>;
    }): TriFrostLogger {
        try {
            if (!this.#exporters.resolved) {
                this.#exporters.resolve(ctx);

                /* Determine debug */
                this.#debug = determineDebug(ctx.env);

                /* Determine trifrost */
                const attributes = {
                    'service.name': determineName(ctx.env),
                    'service.version': determineVersion(ctx.env),
                    'telemetry.sdk.name': 'trifrost',
                    'telemetry.sdk.language': 'javascript',
                    ...this.#runtime,
                };

                /* Set global logger debug state */
                this.#logger.setDebug(this.#debug);

                /* Add a spanAware flag on exporters */
                const exporters:TriFrostLoggerExporter[] = this.#exporters.resolved!;
                const spanAware:TriFrostLoggerSpanAwareExporter[] = [];
                for (let i = 0; i < exporters.length; i++) {
                    const exp = exporters[i];

                    /* Initialize exporter */
                    exp.init(attributes);

                    /* If span aware, push exporter into span aware exporters */
                    if (typeof exp.pushSpan === 'function') spanAware.push(exp as TriFrostLoggerSpanAwareExporter);
                }
                this.#spanAwareExporters = spanAware;
            }

            return new Logger({
                debug: this.#debug!,
                traceId: ctx.traceId,
                context: ctx.context,
                exporters: this.#exporters.resolved!,
                spanAwareExporters: this.#spanAwareExporters,
            });
        } catch (err) {
            console.error(err);
            return new Logger({debug: false, exporters: [], spanAwareExporters: []});
        }
    }

}
