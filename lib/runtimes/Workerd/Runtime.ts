/// <reference types="@cloudflare/workers-types" />

import {type TriFrostRootLogger, ConsoleExporter, JsonExporter} from '../../modules/Logger';
import {determineTrustProxy, isDevMode} from '../../utils/Generic';
import {type TriFrostRuntime, type TriFrostRuntimeOnIncoming, type TriFrostRuntimeBootOptions} from '../types';
import {WorkerdContext} from './Context';

export class WorkerdRuntime implements TriFrostRuntime {
    /* Global logger instance when runtime has started */
    #logger: TriFrostRootLogger | null = null;

    /* Runtime Start Options */
    #cfg: TriFrostRuntimeBootOptions['cfg'] | null = null;

    /* Runtime-Enriched Config */
    #runtimeCfg: TriFrostRuntimeBootOptions['cfg'] | null = null;

    /* Incoming handler which is to be called by the runtime when an incoming request happens */
    #onIncoming: TriFrostRuntimeOnIncoming | null = null;

    /**
     * MARK: Workerd handlers
     */

    exports = {
        fetch: async (request: Request, env: any, cloudflareCtx: ExecutionContext) => {
            if (!this.#onIncoming) return new Response('Internal Server Error', {status: 500});

            /* JIT Runtime config resolution */
            if (!this.#runtimeCfg) {
                const runtimeEnv = {...env, ...(this.#cfg!.env || {})};

                this.#runtimeCfg = {
                    ...this.#cfg,
                    env: runtimeEnv,
                    trustProxy: determineTrustProxy(runtimeEnv, true),
                } as TriFrostRuntimeBootOptions['cfg'];
            }

            /* Instantiate context */
            const ctx = new WorkerdContext(this.#runtimeCfg, this.#logger!, request, cloudflareCtx);

            try {
                await this.#onIncoming!(ctx);
                if (!ctx.response) throw new Error('Handler did not respond');
                return ctx.response;
            } catch (err) {
                this.#logger!.error(err, {ctx: ctx.method, path: ctx.path});
                return new Response('Internal Server Error', {status: 500});
            }
        },
    };

    /**
     * MARK: Runtime Implementation
     */

    get name() {
        return 'Workerd';
    }

    get version() {
        return null;
    }

    async boot(opts: TriFrostRuntimeBootOptions): Promise<void> {
        /* Set onIncoming handler */
        this.#onIncoming = opts.onIncoming;

        /* Set logger instance */
        this.#logger = opts.logger;

        /**
         * Set global config.
         * Take Note: Given that cloudflare workers/workerd by design runs in a trusted environment
         * we default trustProxy to true here.
         */
        this.#cfg = {...opts.cfg};

        this.#logger!.debug('WorkerdRuntime@boot');
    }

    defaultExporter(env: Record<string, unknown>) {
        return isDevMode(env) ? new ConsoleExporter() : new JsonExporter();
    }

    async shutdown() {
        if (!this.#onIncoming) return;

        this.#logger!.debug('WorkerdRuntime@stop');

        /* Clear onIncoming handler */
        this.#onIncoming = null;

        /* Clear logger instance */
        this.#logger = null;

        /* Clear global config */
        this.#cfg = null;
    }
}
