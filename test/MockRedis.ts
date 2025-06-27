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

    async scan(cursor: string, ...args: unknown[]): Promise<[string, string[]]> {
        this.calls.push(['scan', [cursor, ...args]]);

        let match = '*';
        let count = 10;

        for (let i = 0; i < args.length; i += 2) {
            const key = args[i];
            const val = args[i + 1];
            if (key === 'MATCH' && typeof val === 'string') match = val;
            if (key === 'COUNT') count = Number(val);
        }

        const rgx = new RegExp('^' + match.replace(/\*/g, '.*') + '$');
        const keys: string[] = [];
        for (const k of this.map.keys()) {
            if (rgx.test(k)) keys.push(k);
        }

        const start = parseInt(cursor, 10) || 0;
        const next = start + count;

        const nextCursor = next >= keys.length ? '0' : String(next);
        return [nextCursor, keys.slice(start, next)];
    }

    async del(...keys: string[]): Promise<void> {
        this.calls.push(['del', keys]);
        for (let i = 0; i < keys.length; i++) this.map.delete(keys[i]);
    }

    get isEmpty() {
        return this.calls.length === 0;
    }

    reset() {
        this.calls = [];
        this.map = new Map();
    }

    debug() {
        return Object.fromEntries(this.map.entries());
    }
}

export {MockRedis};
