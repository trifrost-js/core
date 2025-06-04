import {isIntBetween} from '@valkyriestudios/utils/number';
import {
    type TriFrostRuntimeOnIncoming,
    type TriFrostRuntimeBootOptions,
    type TriFrostRuntime,
} from '../types';
import {UWSContext} from './Context';
import {
    type TriFrostRootLogger,
    ConsoleExporter,
} from '../../modules/Logger';
import {isDevMode} from '../../utils/Generic';

export class UWSRuntime implements TriFrostRuntime {

    /* UWS Apis */
    #apis: typeof import('uWebSockets.js') | null = null;

    /* UWS App instance */
    #app: ReturnType<(typeof import('uWebSockets.js'))['App']> | null = null;

    /* Runtime version */
    #version:string|null = null;

    /* UWS Socket when runtime has started */
    #socket: Socket | null = null;

    /* Global logger instance when runtime has started */
    #logger: TriFrostRootLogger | null = null;

    /* Incoming handler which is to be called by the runtime when an incoming request happens */
    #onIncoming: TriFrostRuntimeOnIncoming|null = null;

/**
 * MARK: Runtime Implementation
 */

    exports = null;

    get name () {
        return 'uWebSockets';
    }

    get version () {
        if (this.#version) return this.#version;

        try {
            if (Bun.version) {
                this.#version = 'bun:' + Bun.version;
                return this.#version;
            }
        } catch {
            /* Nothing to do here */
        }

        try {
            if (process.version) {
                this.#version = 'node:' + process.version;
                return this.#version;
            }
        } catch {
            /* Nothing to do here */     
        }

        this.#version = 'N/A';
        return this.#version;
    }

    async boot (opts:TriFrostRuntimeBootOptions):Promise<void> {
        let UWS:typeof import('uWebSockets.js');
        let statSync:typeof import('node:fs')['statSync'];
        let createReadStream:typeof import('node:fs')['createReadStream'];
        let ReadStream:typeof import('node:fs')['ReadStream'];
        try {
            UWS = await import('uWebSockets.js');
            ({statSync, createReadStream, ReadStream} = await import('node:fs'));
        } catch {
            throw new Error('UWSRuntime@boot: Failed to load required modules');
        }

        /* Ensure port is valid */
        if (!isIntBetween(opts?.cfg?.port, 1, 65535)) {
            throw new Error('UWSRuntime@boot: Port needs to be in range of 1-65535');
        }

        /* Reject if socket is already set */
        if (this.#socket !== null) {
            throw new Error('UWSRuntime@boot: Socket already listening');
        }

        /**
         * Context config.
         * Take Note: Given that we don't know whether or not uws will run standalone or
         * behind a proxy we default trustProxy to false here.
         */
        const cfg = {
            trustProxy: false,
            ...opts.cfg,
            env: {...process.env || {}, ...opts.cfg.env},
        };

        /* Set onIncoming handler */
        this.#onIncoming = opts.onIncoming;

        /* Set logger instance */
        this.#logger = opts.logger;

        /* Set apis */
        this.#apis = UWS;

        /* Context apis */
        const ctx_apis = {
            statSync,
            createReadStream,
            ReadStream,
            getParts: UWS.getParts,
        };

        /* Instantiate new app */
        this.#app = UWS.App();

        return new Promise((resolve, reject) => {
            if (!this.#app) return;

            /* Listen on port */
            this.#app.listen(cfg.port, 1, socket => {
                if (!socket) return reject(new Error(`UWSRuntime@boot: Failed to listen on port ${cfg.port}`));

                /* Set Socket */
                this.#socket = socket as Socket;

                this.#logger!.info(`UWSRuntime@boot: Listening on port ${opts.cfg.port}`);
                return resolve();
            });

            /**
             * Set up the global route proxy to handle incoming requests.
             *
             * If router matched anything it will call get context with the args we pass to it
             * - method
             * - path
             * - {req, res}
             */
            this.#app.any(
                '/*',
                async (res, req) => this.#onIncoming!(new UWSContext(cfg, opts.logger, ctx_apis, res, req))
            );
        });
    }

    defaultExporter (env:Record<string, unknown>) {
        return isDevMode(env)
            ? new ConsoleExporter()
            : new ConsoleExporter({include: ['trace_id']});
    }

    async shutdown () {
        if (!this.#app || !this.#socket) return;
        this.#logger!.debug('UWSRuntime@shutdown');

        /* Shutdown socket */
        if (this.#apis?.us_listen_socket_close && this.#socket) {
            try {
                this.#apis.us_listen_socket_close(this.#socket);
            } catch (err) {
                this.#logger!.error('UWSRuntime@shutdown: Failed to close socket', {msg: (err as Error).message});
            }
            this.#socket = null;
        }

        /* Close App */
        if (this.#app) {
            this.#app.close();
            this.#app = null;
        }

        this.#onIncoming = null;
        this.#logger = null;
    }

}
