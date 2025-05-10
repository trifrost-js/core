import {isArray} from '@valkyriestudios/utils/array';
import {isFunction} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';
import {
    type TriFrostStore,
    type TriFrostStoreValue,
} from './types';

type GCFilter<Value> = (key: string, value: Value, now:number, exp?:number) => boolean;

export class MemoryStore <T extends TriFrostStoreValue = TriFrostStoreValue> implements TriFrostStore<T> {

    #store = new Map<string, {value:T; expires?:number}>();

    /* Garbage collection interval */
    #gc:ReturnType<typeof setInterval>|null = null;

    /* Used for lru (least-recently-used) tracking */
    #lru:Set<string> = new Set();

    /* Set to the max amount of items allowed in our store if configured */
    #lruMax:number|null = null;

    constructor (opts?: {
        gc_interval?: number;
        gc_filter?: GCFilter<T>;
        max_items?: number;
    }) {
        /* Configure garbage collection interval */
        const filter = isFunction(opts?.gc_filter)
            ? opts.gc_filter
            : (_key:string, _v:T, _now:number, _exp?:number) => isIntGt(_exp, 0) && _exp <= _now;
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

    async get (key: string): Promise<T|null> {
        if (!isNeString(key)) throw new Error('TriFrostMemoryStore@get: Invalid key');

        const val = this.#store.get(key);
        if (!val) return null;

        if (isIntGt(val.expires, 0) && Date.now() > val.expires) {
            this.#store.delete(key);
            /* Remove from LRU */
            if (this.isLRU) this.#lru.delete(key);
            return null;
        } else {
            /* Mark as most recently used in LRU */
            if (this.isLRU) {
                this.#lru.delete(key);
                this.#lru.add(key);
            }

            return val.value as T;
        }
    }

    async set (
        key: string,
        value: T,
        opts?: {ttl?: number}
    ): Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostMemoryStore@set: Invalid key');
        if (!isObject(value) && !isArray(value)) throw new Error('TriFrostMemoryStore@set: Invalid value');

        /* If configured as an LRU, update and see if we need to evict any keys */
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

        const expires = isIntGt(opts?.ttl, 0)
            ? Date.now() + (opts.ttl * 1000)
            : undefined;
        this.#store.set(key, {value, expires});
    }

    async delete (key: string): Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostMemoryStore@delete: Invalid key');
        this.#store.delete(key);
        
        /* Remove from lru */
        if (this.isLRU) this.#lru.delete(key);
    }

    async stop () {
        if (!this.#gc) return;
        clearInterval(this.#gc);
        this.#gc = null;
    }

}
