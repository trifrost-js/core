import {isFn} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {
    Lazy,
    type LazyInitFn,
} from '../../utils/Lazy';
import {type Store} from '../../storage/_Storage';
import {type TriFrostStoreValue} from '../../storage/types';
import {cacheSkipped} from './util';
import {type TriFrostContext} from '../../types';

export type CacheOptions = {
    ttl?: number;
};

export type TriFrostCacheValue = number|string|boolean|null|TriFrostStoreValue;

export class TriFrostCache <Env extends Record<string, any> = Record<string, any>> {

    #store: Lazy<Store, Env>;

    constructor (opts:{store: LazyInitFn<Store, Env>|Store}) {
        if (isObject(opts?.store)) {
            this.#store = new Lazy(opts.store);
        } else if (isFn(opts?.store)) {
            this.#store = new Lazy(opts.store as LazyInitFn<Store, Env>);
        } else {
            throw new Error('TriFrostCache: Expected a store initializer');
        }
    }

    init (env:Env) {
        if (this.#store.resolved) return;
        this.#store.resolve({env});
    }

    protected get resolvedStore (): Store|null {
        return this.#store?.resolved;
    }

    /**
     * Retrieves a cached value by key.
     * 
     * @note If value doesn't exist will return null
     * @param {string} key - Key of the value you wish to retrieve
     */
    async get<TVal extends TriFrostCacheValue = TriFrostCacheValue> (
        key: string
    ): Promise<TVal | null> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@get: Cache needs to be initialized first');
        const stored = await this.#store.resolved.get(key);
        return isObject(stored) && 'v' in stored ? stored.v as TVal : null;
    }

    /**
     * Sets a value in cache
     * 
     * @param {string} key - Key to set the value on in cache
     * @param {TVal} value - Value to set
     * @param {CacheOptions?} opts - Options for caching, eg: {ttl: 3600} means cache for 1 hour
     */
    async set<TVal extends TriFrostCacheValue = TriFrostCacheValue> (
        key: string,
        value: TVal,
        opts?: CacheOptions
    ): Promise<void> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@set: Cache needs to be initialized first');
        if (value === undefined) throw new Error('TriFrostCache@set: Value can not be undefined');
        await this.#store.resolved.set(key, {v: value}, opts);
    }

    /**
     * Deletes a cached value by key or prefix
     * 
     * @param {string|{prefix:string}} val - Value or group you wish to delete
     */
    async del (val:string|{prefix:string}): Promise<void> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@del: Cache needs to be initialized first');
        await this.#store.resolved.del(val);
    }

    /**
     * Wraps a get + set combined as a utility method.
     * 
     * @param {string} key - Key the value is/will be cached on
     * @param {Function} compute - Function to wrap which computes the value to cache
     * @param {CacheOptions?} opts - Options for caching, eg: {ttl: 3600} means cache for 1 hour
     */
    async wrap <TVal extends TriFrostCacheValue = TriFrostCacheValue> (
        key:string,
        compute: () => Promise<TVal>,
        opts?: CacheOptions
    ):Promise<TVal> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@wrap: Cache needs to be initialized first');

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
     * Stops the cache, for most storage adapters this is a no-op, but some storage adapters (eg: Memory) use
     * this to kill internal timers and what not.
     */
    async stop () {
        if (!this.#store.resolved) return;
        await this.#store.resolved.stop();
    }

    /**
     * Returns a context-scoped clone of this cache
     * 
     * @note This is an internal method
     */
    private spawn (ctx: TriFrostContext<Env>): TriFrostCache<Env> {
        const resolved = this.#store.resolved ?? this.#store.resolve({env: ctx.env as Env});
        const store_spawn = resolved.spawn(ctx);
    
        return new TriFrostCache<Env>({
            store: store_spawn,
        });
    }    

}
