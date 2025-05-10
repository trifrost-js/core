import {isArray} from '@valkyriestudios/utils/array';
import {isObject} from '@valkyriestudios/utils/object';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';
import {type TriFrostCFKVNamespace} from '../../types/providers';
import {
    type TriFrostStore,
    type TriFrostStoreValue,
} from './types';

export class KVStore <T extends TriFrostStoreValue = TriFrostStoreValue> implements TriFrostStore<T> {

    #kv:TriFrostCFKVNamespace;

    constructor (kv:TriFrostCFKVNamespace) {
        this.#kv = kv;
    }

    async get (key:string): Promise<T|null> {
        if (!isNeString(key)) throw new Error('TriFrostKVStore@get: Invalid key');

        const val = await this.#kv.get<T>(key, 'json');
        return isObject(val) || isArray(val) ? val as T : null;
    }

    async set (key:string, value:T, opts?:{ttl?:number}): Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostKVStore@set: Invalid key');
        if (!isObject(value) && !isArray(value)) throw new Error('TriFrostKVStore@set: Invalid value');

        await this.#kv.put(key, JSON.stringify(value), {
            expirationTtl: isIntGt(opts?.ttl, 0) ? opts.ttl : 60,
        });
    }

    async delete (key:string):Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostKVStore@delete: Invalid key');
        await this.#kv.delete(key);
    }

    async stop () {
        /* Nothing to do here */
    }

}
