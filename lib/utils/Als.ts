import {AsyncLocalStorage} from 'node:async_hooks';
import {type TriFrostContext} from '../types/context';

/**
 * AsyncLocalStorage instance for tracking a unique request ID (UID)
 * during the lifetime of an async execution context.
 *
 * Instead of storing the whole context in AsyncLocalStorage (which can
 * have perf/memory costs), we only store a UID, and keep the actual
 * TriFrostContext in a plain in-memory map keyed by that UID.
 */
const als = new AsyncLocalStorage<string>();

/**
 * A map from UID -> TriFrostContext instance.
 *
 * This allows us to quickly retrieve the active request's context
 * without passing it explicitly down the call stack.
 */
const map = {} as Record<string, TriFrostContext<any, any>>;

/**
 * Retrieve the current TriFrostContext bound to the active async
 * execution context, if any.
 */
export function ctx<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}>() {
    const uid = als.getStore();
    return uid ? (map[uid] as TriFrostContext<Env, State> | undefined) : undefined;
}

/**
 * Activate an AsyncLocalStorage execution context with a given UID
 * and bind it to a TriFrostContext for the duration of `fn`.
 *
 * This ensures that any code running within `fn` (and its async descendants)
 * can call `context()` to retrieve the bound TriFrostContext without
 * having to pass it manually.
 *
 * @param {string} uid - UID to store in als
 * @param {TriFrostContext} ctx - Context for als run
 * @param {() => Promise<void | Response>} fn - Method to bind to als
 */
export async function activateCtx<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}>(
    uid: string,
    ctx: TriFrostContext<Env, State>,
    fn: () => Promise<void | Response>,
) {
    // Store the context in the map for retrieval during execution
    map[uid] = ctx;

    try {
        // Run the function within the ALS scope, storing the UID as the "current store" value
        return await als.run(uid, fn);
    } finally {
        // Clean up after run is finished
        delete map[uid];
    }
}
