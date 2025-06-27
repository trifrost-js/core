/// <reference types="bun-types" />

import {isInt, isIntBetween} from '@valkyriestudios/utils/number';
import {
    ConsoleExporter,
    type TriFrostRootLogger,
} from '../../modules/Logger';
import {BunContext} from './Context';
import {
    type TriFrostRuntime,
    type TriFrostRuntimeOnIncoming,
    type TriFrostRuntimeBootOptions,
} from '../types';
import {determinePort, isDevMode} from '../../utils/Generic';

export class BunRuntime implements TriFrostRuntime {

    /* Bun Http server instance */
    #server: ReturnType<(typeof import('bun'))['serve']> | null = null;

    /* Global logger instance when runtime has started */
    #logger: TriFrostRootLogger | null = null;

    /* Incoming handler which is to be called by the runtime when an incoming request happens */
    #onIncoming: TriFrostRuntimeOnIncoming|null = null;

/**
 * MARK: Runtime Implementation
 */

    exports = null;

    get name () {
        return 'Bun';
    }

    get version () {
        return Bun.version || 'N/A';
    }

    async boot (opts:TriFrostRuntimeBootOptions):Promise<void> {
        let serve: typeof import('bun')['serve'];
        let file: typeof import('bun')['file'];

        try {
            ({serve, file} = await import('bun'));
        } catch {
            throw new Error('BunRuntime@boot: Failed to load required modules');
        }

        /* Ensure port is valid */
        if (!isIntBetween(opts?.cfg?.port, 1, 65535)) {
            throw new Error('BunRuntime@boot: Port needs to be in range of 1-65535');
        }

        /* Reject if server is already set */
        if (this.#server !== null) {
            throw new Error('BunRuntime@boot: Server already listening');
        }

        /* Set onIncoming handler */
        this.#onIncoming = opts.onIncoming;

        /* Set logger instance */
        this.#logger = opts.logger;

        /* Specific APIs used by the context */
        const apis = {file};

        /**
         * Context config.
         * Take Note: Given that we don't know whether or not bun will run standalone or
         * behind a proxy we default trustProxy to false here.
         */
        const cfg = {
            trustProxy: false,
            ...opts.cfg,
            env: {...process.env || {}, ...opts.cfg.env},
        };

        /* Construct options for serve */
        const serveOpts = {
            port: determinePort(cfg.env, cfg.port || null),
            hostname: cfg.host || '0.0.0.0',
            fetch: async (req:Request) => {
                const ctx = new BunContext(cfg, opts.logger, apis, req);

                try {
                    await this.#onIncoming!(ctx);
                    if (!ctx.response) throw new Error('BunContext@onIncoming: Handler did not respond');
                    return ctx.response;
                } catch (err) {
                    opts.logger.error(err);
                    return new Response('Internal Server Error', {status: 500});
                }
            },
        } as {port:number; hostname: string; fetch: (req:Request) => Promise<Response>; idleTimeout?: number};

        /* Use timeout as idleTimeout if configured */
        if (isInt(cfg.timeout)) {
            const timeout_s = cfg.timeout/1000;
            /* Ensure timeout stays within 255 seconds as bun limitation */
            serveOpts.idleTimeout = isIntBetween(timeout_s, 0, 255) ? timeout_s : 255;
        }

        /* Bun serve */
        this.#server = serve(serveOpts);

        this.#logger!.debug(`BunRuntime@boot: Listening on port ${opts.cfg.port}`);
    }

    defaultExporter (env:Record<string, unknown>) {
        return isDevMode(env)
            ? new ConsoleExporter()
            : new ConsoleExporter({include: ['trace_id']});
    }

    async shutdown () {
        if (!this.#server) return;
        this.#logger!.debug('BunRuntime@shutdown');
        this.#server!.stop();
        this.#server = null;
        this.#onIncoming = null;
        this.#logger = null;
    }

}
