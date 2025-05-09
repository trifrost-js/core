import {
    Lazy,
    type LazyInitFn,
} from '../../utils/Lazy';
import {
    type TriFrostStore,
    type TriFrostStoreValue,
} from '../_storage/types';

export class TriFrostCache <Env extends Record<string, any> = Record<string, any>> {

    #store: Lazy<TriFrostStore, Env>;

    constructor (cfg:{
        store: LazyInitFn<TriFrostStore, Env>
    }) {
        this.#store = new Lazy(cfg.store);
    }

    init (env:Env) {
        if (this.#store.resolved) return;
        this.#store.resolve({env});
    }

    async get<TVal extends TriFrostStoreValue = Record<string, unknown>> (
        key: string
    ): Promise<TVal | null> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@get: Cache needs to be initialized first');
        return this.#store.resolved.get(key) as unknown as TVal | null;
    }

    async set<TVal extends TriFrostStoreValue = Record<string, unknown>> (
        key: string,
        value: TVal,
        opts?: {ttl?: number}
    ): Promise<void> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@set: Cache needs to be initialized first');
        await this.#store.resolved.set(key, value as Record<string, unknown>, opts);
    }

    async delete (key: string): Promise<void> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@delete: Cache needs to be initialized first');
        await this.#store.resolved.delete(key);
    }

    /**
     * Wraps a get + set combined as a utility method.
     */
    async wrap <TVal extends TriFrostStoreValue = Record<string, unknown>> (
        key:string,
        compute: () => Promise<TVal>,
        opts?: {ttl?: number}
    ):Promise<TVal> {
        if (!this.#store.resolved) throw new Error('TriFrostCache@wrap: Cache needs to be initialized first');

        /* Check if it exists in cache */
        const existing = await this.get<TVal>(key);
        if (existing !== null) return existing;

        /* If not exists, compute the value and set */
        const value = await compute();
        if (value) await this.set(key, value, opts);

        return value;
    }

    stop () {
        if (
            'stop' in this.#store &&
            typeof this.#store.stop === 'function'
        ) this.#store.stop();
    }

}
