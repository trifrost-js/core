import {isIntBetween} from '@valkyriestudios/utils/number';
import {
    ConsoleExporter,
    type TriFrostRootLogger,
} from '../../modules/Logger';
import {
    type TriFrostRuntime,
    type TriFrostRuntimeOnIncoming,
    type TriFrostRuntimeBootOptions,
} from '../types';
import {NodeContext} from './Context';
import {
    type IncomingMessage,
    type ServerResponse,
} from './types';

export class NodeRuntime implements TriFrostRuntime {

    /* Node Http server instance */
    #server: Awaited<ReturnType<typeof import('node:http')['createServer']>>|null = null;

    /* Global logger instance when runtime has started */
    #logger: TriFrostRootLogger|null = null;

    /* Incoming handler which is to be called by the runtime when an incoming request happens */
    #onIncoming: TriFrostRuntimeOnIncoming|null = null;

/**
 * MARK: Runtime Implementation
 */

    exports = null;

    get name () {
        return 'Node';
    }

    get version () {
        return process.version || 'N/A';
    }

    async boot (opts:TriFrostRuntimeBootOptions):Promise<void> {
        let createServer: typeof import('node:http')['createServer'];
        let statSync:typeof import('node:fs')['statSync'];
        let createReadStream:typeof import('node:fs')['createReadStream'];
        let pipeline: typeof import('node:stream/promises')['pipeline'];

        try {
            ({createServer} = await import('node:http'));
            ({statSync, createReadStream} = await import('node:fs'));
            ({pipeline} = await import('node:stream/promises'));
        } catch {
            throw new Error('NodeRuntime@boot: Failed to load required modules');
        }

        return new Promise((resolve, reject) => {
            /* Ensure port is valid */
            if (!isIntBetween(opts?.cfg?.port, 1, 65535)) {
                return reject(new Error('NodeRuntime@boot: Port needs to be in range of 1-65535'));
            }

            /* Reject if server is already set */
            if (this.#server !== null) {
                return reject(new Error('NodeRuntime@boot: Server already listening'));
            }

            /* Set onIncoming handler */
            this.#onIncoming = opts.onIncoming;

            /* Set logger instance */
            this.#logger = opts.logger;

            /* Specific APIs used by the context */
            const apis = {statSync, createReadStream, pipeline};

            /**
             * Context config
             * Take Note: Given that we don't know whether or not node will run standalone or
             * behind a proxy we default trustProxy to false here.
             */
            const cfg = {trustProxy: false, ...opts.cfg};

            /* Create new server instance */
            this.#server = createServer(async (req, res) => this.#onIncoming!(new NodeContext(
                cfg,
                opts.logger,
                apis,
                req as IncomingMessage,
                res as ServerResponse
            )));

            /* Listen on the provided port, resolve if succeeds, reject if fails */
            this.#server!
                .listen(opts.cfg.port, () => {
                    this.#logger!.debug('NodeRuntime@boot');
                    return resolve();
                })
                .on('error', () => {
                    this.#server = null;
                    this.#onIncoming = null;
                    reject(new Error(`NodeRuntime@boot: Failed to listen on port ${opts.cfg.port}`));
                });
        });
    }

    defaultExporter () {
        return new ConsoleExporter();
    }

    async shutdown () {
        if (!this.#server) return;
        this.#logger!.debug('NodeRuntime@shutdown');
        await new Promise<void>(resolve => this.#server!.close(() => resolve()));
        this.#server = null;
        this.#onIncoming = null;
        this.#logger = null;
    }

}
