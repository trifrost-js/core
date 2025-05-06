import {type TriFrostRedis} from '../lib/types/providers';

class MockRedis implements TriFrostRedis {

    map: Map<string, [string, unknown]> = new Map();
    calls: [string, unknown][] = [];

    async get(key: string): Promise<string | null> {
        this.calls.push(['get', [key]]);
        const val = this.map.get(key);
        return val ? val[0] : null;
    }

    async set(key: string, value: string, ..._args: unknown[]): Promise<void> {
        this.calls.push(['set', [key, value, _args]]);
        this.map.set(key, [value, _args]);
    }

    async del(key: string): Promise<void> {
        this.calls.push(['del', [key]]);
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

export {MockRedis};
