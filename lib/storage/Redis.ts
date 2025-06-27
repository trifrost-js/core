import {split} from '@valkyriestudios/utils/array';
import {TriFrostCache} from '../modules/Cache/_Cache';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from '../modules/RateLimit/_RateLimit';
import {type TriFrostRedis} from '../types/providers';
import {type LazyInitFn} from '../utils/Lazy';
import {type TriFrostStoreAdapter, type TriFrostStoreValue} from './types';
import {Store} from './_Storage';

/**
 * MARK: Adapter
 */

export class RedisStoreAdapter<T extends TriFrostStoreValue = TriFrostStoreValue> implements TriFrostStoreAdapter<T> {
    #redis: TriFrostRedis;

    constructor(redis: TriFrostRedis) {
        this.#redis = redis;
    }

    async get(key: string): Promise<T | null> {
        const val = await this.#redis.get(key);
        if (!val) return null;
        return JSON.parse(val) as T;
    }

    async set(key: string, value: T, ttl: number) {
        await this.#redis.set(key, JSON.stringify(value), 'EX', ttl);
    }

    async del(key: string) {
        await this.#redis.del(key);
    }

    async delPrefixed(prefix: string): Promise<void> {
        let cursor = '0';
        const acc: Set<string> = new Set();
        do {
            const [next, keys] = await this.#redis.scan(cursor, 'MATCH', prefix + '*', 'COUNT', 250);
            cursor = next;
            for (let i = 0; i < keys.length; i++) acc.add(keys[i]);
        } while (cursor && cursor !== '0');
        if (!acc.size) return;

        for (const batch of split([...acc], 100)) {
            await this.#redis.del(...batch);
        }
    }

    async stop() {
        /* Nothing to do here */
    }
}

/**
 * MARK: Store
 */

export class RedisStore<T extends TriFrostStoreValue = TriFrostStoreValue> extends Store<T> {
    constructor(redis: TriFrostRedis) {
        super('RedisStore', new RedisStoreAdapter<T>(redis));
    }
}

/**
 * MARK: Cache
 */

export class RedisCache<Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {
    constructor(cfg: {store: LazyInitFn<TriFrostRedis, Env>}) {
        if (typeof cfg?.store !== 'function') throw new Error('RedisCache: Expected a store initializer');
        super({
            store: ({env}) => new Store('RedisCache', new RedisStoreAdapter(cfg.store({env}))),
        });
    }
}

/**
 * MARK: RateLimit
 */

export class RedisRateLimit<Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {
    constructor(
        cfg: Omit<TriFrostRateLimitOptions<Env>, 'store'> & {
            store: LazyInitFn<TriFrostRedis, Env>;
        },
    ) {
        if (typeof cfg?.store !== 'function') throw new Error('RedisRateLimit: Expected a store initializer');
        super({
            ...cfg,
            store: ({env}) => new Store('RedisRateLimit', new RedisStoreAdapter(cfg.store({env}))),
        });
    }
}
