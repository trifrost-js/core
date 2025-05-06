import {type TriFrostRuntime} from './Types';
import {WorkerdRuntime} from './Workerd/Runtime';

/**
 * Runtime detector function which returns a promise for the current runtime
 */
export async function getRuntime (): Promise<TriFrostRuntime> {
    /* Workerd */
    if (typeof (globalThis as {WorkerGlobalScope?: Record<string, unknown>}).WorkerGlobalScope !== 'undefined') {
        return new WorkerdRuntime();
    }

    /* Bun */
    if (typeof Bun !== 'undefined') {
        const {BunRuntime} = await import('./Bun/Runtime.js');
        return new BunRuntime() as TriFrostRuntime;
    }

    /* NodeJS */
    if (process?.versions?.node) {
        try {
            /* UWS */
            await import('uWebSockets.js');
            const {UWSRuntime} = await import('./UWS/Runtime.js');
            return new UWSRuntime() as TriFrostRuntime;
        } catch {
            /* Node */
            const {NodeRuntime} = await import('./Node/Runtime.js');
            return new NodeRuntime() as TriFrostRuntime;
        }
    }

    throw new Error('TriFrost: No supported runtime detected. Please specify a runtime.');
}
