import {type TriFrostCFKVNamespace} from '../lib/types/providers';

class MockKV implements TriFrostCFKVNamespace {
    map: Map<string, [string, unknown]> = new Map();
    calls: [string, unknown][] = [];

    async get <T = unknown>(key: string, type: 'json' | 'text' | 'arrayBuffer' | 'stream' = 'json'): Promise<T | null> {
        this.calls.push(['get', [key, type]]);
        const raw = this.map.get(key);
        if (!raw) return null;

        if (type === 'json') {
            try {
                return JSON.parse(raw[0]) as T;
            } catch {
                return null;
            }
        }

        if (type === 'text') {
            return raw[0] as T;
        }

        return raw as unknown as T;
    }

    async put(key: string, value: string | ReadableStream | ArrayBuffer, options?: { expiration?: number; expirationTtl?: number }): Promise<void> {
        this.calls.push(['put', [key, value, options]]);
        if (typeof value !== 'string') throw new Error('MockKV only supports string values for now');
        this.map.set(key, [value, options]);
    }

    async delete(key: string): Promise<void> {
        this.calls.push(['delete', [key]]);
        this.map.delete(key);
    }

    get isEmpty () {
        return this.calls.length === 0;
    }

    reset () {
        this.calls = [];
        this.map = new Map();
    }

    debug() {
        return Object.fromEntries(this.map.entries());
    }
}

export {MockKV};
