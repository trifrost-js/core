import {type TriFrostLoggerExporter, type TriFrostRootLogger} from '../modules/Logger';
import {type TriFrostContext, type TriFrostContextConfig} from '../types/context';

/**
 * Type for the incoming handler on a runtime. This incoming handler is used by the runtime to pass a generalized
 * format (method, path, runtime args) to the TriFrost App which can then be used to determine the consumer-defined
 * route stack to run.
 */
export type TriFrostRuntimeOnIncoming = (ctx: TriFrostContext) => Promise<void>;

/**
 * Boot Options for the runtime. The only truly required bit is the onIncoming handler.
 */
export type TriFrostRuntimeBootOptions = {
    /**
     * Global tracer instance
     */
    logger: TriFrostRootLogger;
    /**
     * Global Context config (with eg: Host)
     */
    cfg: TriFrostContextConfig;
    /**
     * Incoming handler which is to be called by the runtime when an incoming request happens
     */
    onIncoming: TriFrostRuntimeOnIncoming;
};

export interface TriFrostRuntime {
    /**
     * Runtime exports that will be bound to the app instance.
     * Used for example in workerd to export main fetch handler
     */
    exports: Record<string, any> | null;

    /**
     * Name of the runtime
     */
    get name(): string;

    /**
     * Version of the runtime (eg: Nodejs version, Bun version)
     */
    get version(): string | null;

    /**
     * Start the runtime (eg: listen to port in NodeJS/Bun/uWS)
     */
    boot(opts: TriFrostRuntimeBootOptions): Promise<void>;

    /**
     * Returns the default exporter for this runtime
     */
    defaultExporter(env: Record<string, unknown>): TriFrostLoggerExporter;

    /**
     * Shutdown the runtime (only has effect if booted)
     */
    shutdown(): Promise<void>;
}
