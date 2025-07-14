import {split} from '@valkyriestudios/utils/array';
import {TriFrostCache} from '../modules/Cache/_Cache';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from '../modules/RateLimit/_RateLimit';
import {type TriFrostCFKVNamespace} from '../types/providers';
import {type TriFrostStoreAdapter, type TriFrostStoreValue} from './types';
import {Store} from './_Storage';

/**
 * MARK: Adapter
 */

export class KVStoreAdapter<T extends TriFrostStoreValue = TriFrostStoreValue> implements TriFrostStoreAdapter<T> {
    #kv: TriFrostCFKVNamespace;

    constructor(kv: TriFrostCFKVNamespace) {
        this.#kv = kv;
    }

    async get(key: string): Promise<T | null> {
        return this.#kv.get<T>(key, 'json');
    }

    async set(key: string, value: T, ttl: number) {
        await this.#kv.put(key, JSON.stringify(value), {expirationTtl: ttl});
    }

    async del(key: string) {
        await this.#kv.delete(key);
    }

    async delPrefixed(prefix: string): Promise<void> {
        let cursor: string | undefined;
        const acc: Set<string> = new Set();
        do {
            const list = await this.#kv.list({prefix, cursor});
            cursor = list.cursor || undefined;
            for (let i = 0; i < list.keys.length; i++) {
                acc.add(list.keys[i].name);
            }
        } while (cursor);
        if (!acc.size) return;

        for (const batch of split([...acc], 10)) {
            const proms = [];
            /* Sadly KV namespace currently does not support direct bulk deletion */
            for (let i = 0; i < batch.length; i++) proms.push(this.#kv.delete(batch[i]));
            await Promise.all(proms);
        }
    }

    async stop() {
        /* Nothing to do here */
    }
}

/**
 * MARK: Store
 */

export class KVStore<T extends TriFrostStoreValue = TriFrostStoreValue> extends Store<T> {
    constructor(kv: TriFrostCFKVNamespace) {
        super('KVStore', new KVStoreAdapter<T>(kv));
    }
}

/**
 * MARK: Cache
 */

export class KVCache<Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {
    constructor(cfg: {store: TriFrostCFKVNamespace}) {
        if (!cfg?.store) throw new Error('KVCache: Expected a store initializer');
        super({
            store: new Store('KVCache', new KVStoreAdapter(cfg.store)),
        });
    }
}

/**
 * MARK: RateLimit
 */

export class KVRateLimit<Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {
    constructor(cfg: Omit<TriFrostRateLimitOptions<Env>, 'store'> & {store: TriFrostCFKVNamespace}) {
        if (!cfg?.store) throw new Error('KVRateLimit: Expected a store initializer');
        super({
            ...cfg,
            store: new Store('KVRateLimit', new KVStoreAdapter(cfg.store)),
        });
    }
}
