import {isArray, split} from '@valkyriestudios/utils/array';
import {isObject} from '@valkyriestudios/utils/object';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';
import {type TriFrostRedis} from '../../types/providers';
import {
    type TriFrostStore,
    type TriFrostStoreValue,
} from './types';

export class RedisStore <T extends TriFrostStoreValue = TriFrostStoreValue> implements TriFrostStore<T> {

    #redis:TriFrostRedis;

    constructor (redis:TriFrostRedis) {
        this.#redis = redis;
    }

    async get (key: string): Promise<T|null> {
        if (!isNeString(key)) throw new Error('TriFrostRedisStore@get: Invalid key');

        const val = await this.#redis.get(key);
        if (!val) return null;
        try {
            return JSON.parse(val) as T;
        } catch {
            return null;
        }
    }

    async set (key:string, value:T, opts?:{ttl?:number}): Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostRedisStore@set: Invalid key');
        if (!isObject(value) && !isArray(value)) throw new Error('TriFrostRedisStore@set: Invalid value');

        const TTL = isIntGt(opts?.ttl, 0) ? opts.ttl : 60;
        await this.#redis.set(key, JSON.stringify(value), 'EX', TTL);
    }

    async del (val:string|{prefix:string}):Promise<void> {
        if (isNeString(val)) {
            await this.#redis.del(val);
        } else if (isNeString(val?.prefix)) {
            let cursor = '0';
            const acc:Set<string> = new Set();
            do {
                const [next, keys] = await this.#redis.scan(cursor, 'MATCH', val.prefix + '*', 'COUNT', 250);
                cursor = next;
                for (let i = 0; i < keys.length; i++) acc.add(keys[i]);
            } while (cursor && cursor !== '0');
            if (!acc.size) return;

            for (const batch of split([...acc], 100)) {
                await this.#redis.del(...batch);
            }
        } else {
            throw new Error('TriFrostRedisStore@del: Invalid deletion value');
        }
    }

    async stop () {
        /* Nothing to do here */
    }

}
