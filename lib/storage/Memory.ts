/* eslint-disable max-classes-per-file */

import {isNeArray} from '@valkyriestudios/utils/array';
import {isFunction} from '@valkyriestudios/utils/function';
import {isIntGt} from '@valkyriestudios/utils/number';
import {TriFrostCache} from '../modules/Cache/_Cache';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from '../modules/RateLimit/_RateLimit';
import {type TriFrostRateLimitObject} from '../modules/RateLimit/strategies/_Strategy';
import {type TriFrostStoreAdapter, type TriFrostStoreValue} from './types';
import {Store} from './_Storage';

type GCFilter<Value> = (key: string, value: Value, now:number, exp:number) => boolean;

/**
 * MARK: Adapter
 */

export type MemoryStoreAdapterOptions <T extends TriFrostStoreValue = TriFrostStoreValue> = {
    gc_interval?: number;
    gc_filter?: GCFilter<T>;
    max_items?: number|null;
}

export class MemoryStoreAdapter<T extends TriFrostStoreValue = TriFrostStoreValue> implements TriFrostStoreAdapter<T> {

    #store = new Map<string, {value:T; expires:number}>();

    /* Garbage collection interval */
    #gc:ReturnType<typeof setInterval>|null = null;

    /* Used for lru (least-recently-used) tracking */
    #lru:Set<string> = new Set();

    /* Set to the max amount of items allowed in our store if configured */
    #lruMax:number|null = null;

    constructor (opts?:MemoryStoreAdapterOptions<T>) {
        /* Configure garbage collection interval */
        const filter = isFunction(opts?.gc_filter)
            ? opts.gc_filter
            : (_key:string, _v:T, _now:number, _exp:number) => _exp <= _now;
        if (isIntGt(opts?.gc_interval, 0)) {
            this.#gc = setInterval(() => {
                const now = Date.now();
                for (const [key, entry] of this.#store.entries()) {
                    if (filter(key, entry.value, now, entry.expires)) {
                        this.#store.delete(key);
                        if (this.isLRU) this.#lru.delete(key);
                    }
                }
            }, opts.gc_interval);
        }

        /* Set max usage value if max entries is provided */
        if (isIntGt(opts?.max_items, 0)) this.#lruMax = opts.max_items;
    }

    private get isLRU () {
        return this.#lruMax !== null;
    }

    async get (key:string): Promise<T|null> {
        const val = this.#store.get(key);
        if (!val) return null;

        if (this.isLRU) this.#lru.delete(key);

        if (Date.now() > val.expires) {
            this.#store.delete(key);
            return null;
        } else {
            if (this.isLRU) this.#lru.add(key);
            return val.value as T;
        }
    }

    async set (key:string, value:T, ttl:number): Promise<void> {
        if (this.isLRU) {
            /* Mark as most recently used in LRU */
            this.#lru.delete(key);
            this.#lru.add(key);

            /* Evict if above size */
            if (this.#lru.size > this.#lruMax!) {
                const to_evict = this.#lru.values().next().value;
                if (to_evict) {
                    this.#store.delete(to_evict);
                    this.#lru.delete(to_evict);
                }
            }
        }

        this.#store.set(key, {value, expires: Date.now() + (ttl * 1000)});
    }

    async del (key:string) {
        this.#store.delete(key);
        if (this.isLRU) this.#lru.delete(key);
    }

    async delPrefixed (prefix:string):Promise<void> {
        for (const k of this.#store.keys()) {
            if (k.startsWith(prefix)) {
                this.#store.delete(k);
                if (this.isLRU) this.#lru.delete(k);
            }
        }
    }

    async stop () {
        if (!this.#gc) return;
        clearInterval(this.#gc);
        this.#gc = null;
    }

}

/**
 * MARK: Store
 */

export class MemoryStore <T extends TriFrostStoreValue = TriFrostStoreValue> extends Store<T> {

    constructor (opts?:MemoryStoreAdapterOptions<T>) {
        super('MemoryStore', new MemoryStoreAdapter<T>(opts));
    }

}

/**
 * MARK: Cache
 */

export class MemoryCache <Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {

    constructor (cfg?: Pick<MemoryStoreAdapterOptions, 'gc_interval' | 'max_items'>) {
        super({
            store: () => new Store('MemoryCache', new MemoryStoreAdapter({
                gc_interval: isIntGt(cfg?.gc_interval, 0) ? cfg?.gc_interval : 60_000,
                ...cfg?.max_items !== null && {max_items: isIntGt(cfg?.max_items, 0) ? cfg.max_items : 1_000},
            })),
        });
    }

}

/**
 * MARK: RateLimit
 */

export class MemoryRateLimit <Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg?: Omit<TriFrostRateLimitOptions<Env>, 'store'> & Pick<MemoryStoreAdapterOptions, 'gc_interval'>) {
        const window = isIntGt(cfg?.window, 0) ? cfg.window : 60_000;

        let adapter:MemoryStoreAdapter;
        if (cfg?.strategy === 'sliding') {
            adapter = new MemoryStoreAdapter<number[]>({
                gc_interval: isIntGt(cfg?.gc_interval, 0) ? cfg.gc_interval : 60_000,
                gc_filter: (_, timestamps, now) => isNeArray(timestamps) && timestamps[timestamps.length - 1] < (now - window),
            });
        } else {
            adapter = new MemoryStoreAdapter<TriFrostRateLimitObject>({
                gc_interval: isIntGt(cfg?.gc_interval, 0) ? cfg.gc_interval : 60_000,
                gc_filter: (_, value, now) => value.reset <= now,
            });
        }

        super({
            ...cfg || {},
            store: () => new Store('MemoryRateLimit', adapter),
        });
    }

}
