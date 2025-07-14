import {type Store} from '../../storage/_Storage';
import {type TriFrostStoreValue} from '../../storage/types';
import {cacheSkip, cacheSkipped} from './util';
import {type TriFrostContext} from '../../types';

export type CacheOptions = {
    ttl?: number;
};

export type TriFrostCacheValue = number | string | boolean | null | TriFrostStoreValue;

export class TriFrostCache<Env extends Record<string, any> = Record<string, any>> {
    #store: Store;

    constructor(opts: {store: Store}) {
        if (typeof opts?.store?.set === 'function' && typeof opts?.store?.get === 'function' && typeof opts?.store?.del === 'function') {
            this.#store = opts.store;
        } else {
            throw new Error('TriFrostCache: Expected a store');
        }
    }

    protected get store(): Store {
        return this.#store;
    }

    /**
     * Retrieves a cached value by key.
     *
     * @note If value doesn't exist will return null
     * @param {string} key - Key of the value you wish to retrieve
     */
    async get<TVal extends TriFrostCacheValue = TriFrostCacheValue>(key: string): Promise<TVal | null> {
        const stored = (await this.#store.get(key)) as {v: TriFrostStoreValue} | null;
        return Object.prototype.toString.call(stored) === '[object Object]' && 'v' in stored! ? (stored.v as TVal) : null;
    }

    /**
     * Sets a value in cache
     *
     * @param {string} key - Key to set the value on in cache
     * @param {TVal} value - Value to set
     * @param {CacheOptions?} opts - Options for caching, eg: {ttl: 3600} means cache for 1 hour
     */
    async set<TVal extends TriFrostCacheValue = TriFrostCacheValue>(key: string, value: TVal, opts?: CacheOptions): Promise<void> {
        if (value === undefined) throw new Error('TriFrostCache@set: Value can not be undefined');
        await this.#store.set(key, {v: value}, opts);
    }

    /**
     * Deletes a cached value by key or prefix
     *
     * @param {string|{prefix:string}} val - Value or group you wish to delete
     */
    async del(val: string | {prefix: string}): Promise<void> {
        await this.#store.del(val);
    }

    /**
     * Wraps a get + set combined as a utility method.
     *
     * @param {string} key - Key the value is/will be cached on
     * @param {Function} compute - Function to wrap which computes the value to cache
     * @param {CacheOptions?} opts - Options for caching, eg: {ttl: 3600} means cache for 1 hour
     */
    async wrap<TVal extends TriFrostCacheValue = TriFrostCacheValue>(
        key: string,
        compute: () => Promise<TVal>,
        opts?: CacheOptions,
    ): Promise<TVal> {
        /* Check if it exists in cache */
        const existing = await this.get<TVal>(key);
        if (existing !== null) return existing;

        /* If not exists, compute the value and set */
        const result = await compute();
        if (result === undefined) return result;

        /* If cache was skipped from inside the method do not cache */
        if (cacheSkipped<TVal>(result)) return result.value;

        await this.set(key, result, opts);

        return result;
    }

    /**
     * Instance alias for cacheSkip
     */
    skip<T>(value: T): T {
        return cacheSkip(value);
    }

    /**
     * Stops the cache, for most storage adapters this is a no-op, but some storage adapters (eg: Memory) use
     * this to kill internal timers and what not.
     */
    async stop() {
        await this.#store.stop();
    }

    /**
     * Returns a context-scoped clone of this cache
     *
     * @note This is an internal method
     */
    private spawn(ctx: TriFrostContext<Env>): TriFrostCache<Env> {
        return new TriFrostCache<Env>({
            store: this.#store.spawn(ctx),
        });
    }
}
