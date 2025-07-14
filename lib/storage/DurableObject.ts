import {TriFrostCache} from '../modules/Cache/_Cache';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from '../modules/RateLimit/_RateLimit';
import {type TriFrostCFDurableObjectId, type TriFrostCFDurableObjectNamespace} from '../types/providers';
import {type TriFrostStoreAdapter, type TriFrostStoreValue} from './types';
import {Store} from './_Storage';

/**
 * MARK: Adapter
 */

export class DurableObjectStoreAdapter<T extends TriFrostStoreValue = TriFrostStoreValue> implements TriFrostStoreAdapter<T> {
    #ns: TriFrostCFDurableObjectNamespace;

    #id: TriFrostCFDurableObjectId;

    #path: string;

    constructor(ns: TriFrostCFDurableObjectNamespace, path: string = 'generic') {
        this.#ns = ns;
        this.#path = path;
        this.#id = this.#ns.idFromName(`trifrost-${path}`);
    }

    async get(key: string): Promise<T | null> {
        const res = await this.#ns.get(this.#id).fetch(this.keyUrl(key), {method: 'GET'});
        if (!res.ok) return null;

        try {
            return await res.json();
        } catch {
            return null;
        }
    }

    async set(key: string, value: T, ttl: number) {
        await this.#ns.get(this.#id).fetch(this.keyUrl(key), {
            method: 'PUT',
            body: JSON.stringify({v: value, ttl}),
            headers: {'Content-Type': 'application/json'},
        });
    }

    async del(key: string) {
        const res = await this.#ns.get(this.#id).fetch(this.keyUrl(key), {method: 'DELETE'});
        if (!res?.ok && res?.status !== 404) throw new Error(`TriFrostDurableObjectStore@del: Failed with status ${res.status}`);
    }

    async delPrefixed(prefix: string): Promise<void> {
        const res = await this.#ns.get(this.#id).fetch(this.keyUrl(prefix + '*'), {method: 'DELETE'});
        if (!res?.ok && res?.status !== 404) throw new Error(`TriFrostDurableObjectStore@delPrefixed: Failed with status ${res.status}`);
    }

    async stop() {
        /* Nothing to do here */
    }

    private keyUrl(key: string) {
        return 'https://do/trifrost-' + this.#path + '?key=' + encodeURIComponent(key);
    }
}

/**
 * MARK: Store
 */

export class DurableObjectStore<T extends TriFrostStoreValue = TriFrostStoreValue> extends Store<T> {
    constructor(ns: TriFrostCFDurableObjectNamespace, path?: string) {
        super('DurableObjectStore', new DurableObjectStoreAdapter<T>(ns, path));
    }
}

/**
 * MARK: Cache
 */

export class DurableObjectCache<Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {
    constructor(cfg: {store: TriFrostCFDurableObjectNamespace}) {
        if (!cfg?.store) throw new Error('DurableObjectCache: Expected a store initializer');
        super({
            store: new Store('DurableObjectCache', new DurableObjectStoreAdapter(cfg.store, 'cache')),
        });
    }
}

/**
 * MARK: RateLimit
 */

export class DurableObjectRateLimit extends TriFrostRateLimit {
    constructor(cfg: Omit<TriFrostRateLimitOptions, 'store'> & {store: TriFrostCFDurableObjectNamespace}) {
        if (!cfg?.store) throw new Error('DurableObjectRateLimit: Expected a store initializer');
        super({
            ...cfg,
            store: new Store('DurableObjectRateLimit', new DurableObjectStoreAdapter(cfg.store, 'ratelimit')),
        });
    }
}
