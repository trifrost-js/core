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
        if (!isObject(value) && !Array.isArray(value)) throw new Error('TriFrostRedisStore@set: Invalid value');

        const TTL = isIntGt(opts?.ttl, 0) ? opts.ttl : 60;
        await this.#redis.set(key, JSON.stringify(value), 'EX', TTL);
    }

    async delete (key:string):Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostRedisStore@delete: Invalid key');
        await this.#redis.del(key);
    }

    async stop () {
        /* Nothing to do here */
    }

}
