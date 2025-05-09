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

    #gc:ReturnType<typeof setInterval>|null = null;

    constructor (opts?: {gc_interval?: number; gc_filter?: GCFilter<T>}) {
        const interval = opts?.gc_interval;
        const filter = opts?.gc_filter ?? ((_key, _v, now, _exp) => isIntGt(_exp, 0) && _exp <= now);

        if (interval) {
            this.#gc = setInterval(() => {
                const now = Date.now();
                for (const [key, entry] of this.#store.entries()) {
                    if (filter(key, entry.value, now, entry.expires !== undefined ? entry.expires : null)) this.#store.delete(key);
                }
            }, interval);
        }
    }

    async get (key: string): Promise<T|null> {
        if (!isNeString(key)) throw new Error('TriFrostMemoryStore@get: Invalid key');

        const val = this.#store.get(key);
        if (!val) return null;

        if (isIntGt(val.expires, 0) && Date.now() > val.expires) {
            this.#store.delete(key);
            return null;
        }

        return val.value as T;
    }

    async set (
        key: string,
        value: T,
        opts?: {ttl?: number}
    ): Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostMemoryStore@set: Invalid key');
        if (!isObject(value) && !Array.isArray(value)) throw new Error('TriFrostMemoryStore@set: Invalid value');

        const expires = isIntGt(opts?.ttl, 0)
            ? Date.now() + (opts.ttl * 1000)
            : undefined;
        this.#store.set(key, {value, expires});
    }

    async delete (key: string): Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostMemoryStore@delete: Invalid key');
        this.#store.delete(key);
    }

    async stop () {
        if (!this.#gc) return;
        clearInterval(this.#gc);
        this.#gc = null;
    }

}
