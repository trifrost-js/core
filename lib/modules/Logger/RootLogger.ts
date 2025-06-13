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

export class TriFrostRootLogger <Env extends Record<string, any> = Record<string, any>> {

    #debug:boolean;

    #exporters:Lazy<TriFrostLoggerExporter[], Env>;

    #spanAwareExporters:TriFrostLoggerSpanAwareExporter[] = [];

    #trifrost:Record<string, unknown>;

    #logger:Logger;

    constructor (cfg:{
        name: string;
        version: string;
        debug: boolean;
        rootExporter: TriFrostLoggerExporter;
        exporters: LazyInitFn<TriFrostLoggerExporter[], Env>;
        trifrost?: Record<string, unknown>;
    }) {
        this.#debug = cfg.debug;
        this.#exporters = new Lazy(cfg.exporters) as Lazy<TriFrostLoggerExporter[], Env>;
        this.#trifrost = {
            'service.name': cfg.name,
            'service.version': cfg.version,
            'telemetry.sdk.name': 'trifrost',
            'telemetry.sdk.language': 'javascript',
            ...cfg.trifrost || {},
        };

        this.#logger = new Logger({
            debug: this.#debug,
            exporters: [cfg.rootExporter],
            spanAwareExporters: (typeof cfg.rootExporter.pushSpan === 'function'
                ? [cfg.rootExporter]
                : []) as TriFrostLoggerSpanAwareExporter[],
        });

        cfg.rootExporter.init(this.#trifrost);
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

                /* Add a spanAware flag on exporters */
                const exporters:TriFrostLoggerExporter[] = this.#exporters.resolved!;
                const spanAware:TriFrostLoggerSpanAwareExporter[] = [];
                for (let i = 0; i < exporters.length; i++) {
                    const exp = exporters[i];

                    /* Initialize exporter */
                    exp.init(this.#trifrost);

                    /* If span aware, push exporter into span aware exporters */
                    if (typeof exp.pushSpan === 'function') spanAware.push(exp as TriFrostLoggerSpanAwareExporter);
                }
                this.#spanAwareExporters = spanAware;
            }

            return new Logger({
                debug: this.#debug,
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
