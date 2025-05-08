import {isObject} from '@valkyriestudios/utils/object';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';
import {
    type TriFrostCFDurableObjectId,
    type TriFrostCFDurableObjectNamespace,
} from '../../types/providers';
import {
    type TriFrostStore,
    type TriFrostStoreValue,
} from './types';

export class DurableObjectStore <T extends TriFrostStoreValue = Record<string, unknown>> implements TriFrostStore<T> {

    #ns: TriFrostCFDurableObjectNamespace;

    #id: TriFrostCFDurableObjectId;

    #path: string;

    constructor (ns:TriFrostCFDurableObjectNamespace, path:string = 'generic') {
        this.#ns = ns;
        this.#path = path;
        this.#id = this.#ns.idFromName(`trifrost-${path}`);
    }

    private keyUrl (key:string) {
        return `https://do/trifrost-${this.#path}?key=${encodeURIComponent(key)}`;
    }

    async get (key:string): Promise<T|null> {
        if (!isNeString(key)) throw new Error('TriFrostDurableObjectStore@get: Invalid key');

        const res = await this.#ns.get(this.#id).fetch(this.keyUrl(key), {method: 'GET'});
        if (!res.ok) return null;

        try {
            const data = await res.json();
            return isObject(data) || Array.isArray(data) ? data as T : null;
        } catch {
            return null;
        }
    }

    async set (key:string, value:T, opts?:{ttl?:number}):Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostDurableObjectStore@set: Invalid key');
        if (!isObject(value) && !Array.isArray(value)) throw new Error('TriFrostDurableObjectStore@set: Invalid value');

        await this.#ns.get(this.#id).fetch(this.keyUrl(key), {
            method: 'PUT',
            body: JSON.stringify({
                v: value,
                ttl: isIntGt(opts?.ttl, 0) ? opts.ttl : 60,
            }),
            headers: {'Content-Type': 'application/json'},
        });
    }

    async delete (key: string): Promise<void> {
        if (!isNeString(key)) throw new Error('TriFrostDurableObjectStore@delete: Invalid key');

        const res = await this.#ns.get(this.#id).fetch(this.keyUrl(key), {method: 'DELETE'});
        if (!res.ok && res.status !== 404) {
            throw new Error(`TriFrostDurableObjectStore@delete: Failed with status ${res.status}`);
        }
    }

}
