import {ConsoleExporter, type TriFrostRootLogger} from '../../modules/Logger';
import {type TriFrostRuntime, type TriFrostRuntimeOnIncoming, type TriFrostRuntimeBootOptions} from '../types';
import {NodeContext} from './Context';
import {type IncomingMessage, type ServerResponse} from './types';
import {determinePort, determineTrustProxy, isDevMode} from '../../utils/Generic';

export class NodeRuntime implements TriFrostRuntime {
    /* Node Http server instance */
    #server: Awaited<ReturnType<(typeof import('node:http'))['createServer']>> | null = null;

    /* Global logger instance when runtime has started */
    #logger: TriFrostRootLogger | null = null;

    /* Incoming handler which is to be called by the runtime when an incoming request happens */
    #onIncoming: TriFrostRuntimeOnIncoming | null = null;

    /**
     * MARK: Runtime Implementation
     */

    exports = null;

    get name() {
        return 'Node';
    }

    get version() {
        return process.version || null;
    }

    async boot(opts: TriFrostRuntimeBootOptions): Promise<void> {
        const {Readable} = await import('node:stream');
        const {createServer} = await import('node:http');
        const {statSync, createReadStream} = await import('node:fs');
        const {pipeline} = await import('node:stream/promises');

        return new Promise((resolve, reject) => {
            /* Reject if server is already set */
            if (this.#server !== null) {
                return reject(new Error('NodeRuntime@boot: Server already listening'));
            }

            /* Set onIncoming handler */
            this.#onIncoming = opts.onIncoming;

            /* Set logger instance */
            this.#logger = opts.logger;

            /* Specific APIs used by the context */
            const apis = {statSync, createReadStream, pipeline, Readable};

            /**
             * Context config
             * Take Note: Given that we don't know whether or not node will run standalone or
             * behind a proxy we default trustProxy to false here.
             */
            const cfg = {
                ...opts.cfg,
                env: {...process.env, ...opts.cfg.env},
            };

            /* Determine trust proxy */
            cfg.trustProxy = determineTrustProxy(cfg.env, false);

            /* Create new server instance */
            this.#server = createServer(async (req, res) =>
                this.#onIncoming!(new NodeContext(cfg, opts.logger, apis, req as IncomingMessage, res as ServerResponse)),
            );

            /* Listen on the provided port, resolve if succeeds, reject if fails */
            this.#server!.listen(determinePort(cfg.env, opts.cfg.port), () => {
                this.#logger!.debug(`NodeRuntime@boot: Listening on port ${opts.cfg.port}`);
                return resolve();
            }).on('error', () => {
                this.#server = null;
                this.#onIncoming = null;
                return reject(new Error(`NodeRuntime@boot: Failed to listen on port ${opts.cfg.port}`));
            });
        });
    }

    defaultExporter(env: Record<string, unknown>) {
        return isDevMode(env) ? new ConsoleExporter() : new ConsoleExporter({include: ['trace_id']});
    }

    async shutdown() {
        if (!this.#server) return;
        this.#logger!.debug('NodeRuntime@shutdown');
        await new Promise<void>(resolve => this.#server!.close(() => resolve()));
        this.#server = null;
        this.#onIncoming = null;
        this.#logger = null;
    }
}
