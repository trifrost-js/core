import {isArray} from '@valkyriestudios/utils/array';
import {isObject} from '@valkyriestudios/utils/object';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';
import type {TriFrostContext} from '../types/context';
import type {TriFrostStoreAdapter, TriFrostStoreValue} from './types';

export class Store<T extends TriFrostStoreValue = TriFrostStoreValue> {

    protected name: string;

    protected adapter:TriFrostStoreAdapter<T>;

    readonly #ctx?:TriFrostContext|null = null;
  
    constructor (name:string, adapter:TriFrostStoreAdapter<T>, ctx?:TriFrostContext) {
        this.name = name;
        this.adapter = adapter;
        if (ctx) this.#ctx = ctx;
    }

    async get (key: string): Promise<T|null> {
        if (!isNeString(key)) throw new Error(this.name + '@get: Invalid key');

        try {
            const val = await this.adapter.get(key);
            return isObject(val) || isArray(val) ? val as T : null;
        } catch (err) {
            this.#ctx?.logger?.error?.(err, {key});
            return null;
        }
    }

    async set (key:string, value:T, opts?:{ttl?:number}): Promise<void> {
        if (!isNeString(key)) throw new Error(this.name + '@set: Invalid key');
        if (!isObject(value) && !isArray(value)) throw new Error(this.name + '@set: Invalid value');

        const TTL = isIntGt(opts?.ttl, 0) ? opts.ttl : 60;

        try {
            await this.adapter.set(key, value, TTL);
        } catch (err) {
            this.#ctx?.logger?.error?.(err, {key, value, opts});
        }
    }

    async del (val:string|{prefix:string}):Promise<void> {
        if (isNeString(val)) {
            try {
                await this.adapter.del(val);
            } catch (err) {
                this.#ctx?.logger?.error?.(err, {val});
            }
        } else if (isNeString(val?.prefix)) {
            try {
                await this.adapter.delPrefixed(val.prefix);
            } catch (err) {
                this.#ctx?.logger?.error?.(err, {val});
            }
        } else {
            throw new Error(this.name + '@del: Invalid deletion value');
        }
    }

    async stop ():Promise<void> {
        try {
            await this.adapter.stop();
        } catch (err) {
            this.#ctx?.logger?.error?.(err);
        }
    }

    spawn (ctx:TriFrostContext):Store<T> {
        return new Store<T>(this.name, this.adapter, ctx);
    }

}
