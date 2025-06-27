export class MockDurableObjectStorage {
    store = new Map<string, unknown>();
    alarms: number[] = [];

    async put(key: string, val: unknown) {
        this.store.set(key, val);
    }

    async get<T>(key: string): Promise<T | undefined> {
        return this.store.get(key) as T | undefined;
    }

    async delete(keys: string[] | string) {
        if (Array.isArray(keys)) {
            for (const k of keys) this.store.delete(k);
        } else {
            this.store.delete(keys);
        }
    }

    async list({prefix = ''} = {}): Promise<Map<string, unknown>> {
        const filtered = new Map<string, unknown>();
        for (const [k, v] of this.store.entries()) {
            if (k.startsWith(prefix)) filtered.set(k, v);
        }
        return filtered;
    }

    async setAlarm(ts: number) {
        this.alarms.push(ts);
    }
}
