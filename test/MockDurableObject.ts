import {type TriFrostCFDurableObjectNamespace, type TriFrostCFDurableObjectId} from '../lib/types/providers';

class MockDurableObjectId implements TriFrostCFDurableObjectId {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    toString() {
        return `mock-id:${this.name}`;
    }
}

class MockDurableObjectStub {
    calls: [string, RequestInit | undefined][] = [];

    map = new Map<string, unknown>();

    async fetch(url: string, init?: RequestInit): Promise<Response> {
        const u = new URL(url);
        const key = u.searchParams.get('key')!;
        const method = init?.method ?? 'GET';
        this.calls.push([url, init]);

        switch (method) {
            case 'GET': {
                const val = this.map.get(key);
                if (!val) return new Response(null, {status: 404});
                return new Response(JSON.stringify(val), {status: 200});
            }

            case 'PUT': {
                const parsed = JSON.parse(init?.body as string);
                this.map.set(key, parsed.v);
                return new Response(null, {status: 204});
            }

            case 'DELETE': {
                const existed = this.map.delete(key);
                return new Response(null, {status: existed ? 204 : 404});
            }
            default:
                return new Response(null, {status: 405});
        }
    }

    reset() {
        this.calls = [];
        this.map.clear();
    }

    get isEmpty() {
        return this.calls.length === 0;
    }

    debug() {
        return Object.fromEntries(this.map.entries());
    }
}

class MockDurableObjectNamespace implements TriFrostCFDurableObjectNamespace {
    instances = new Map<string, MockDurableObjectStub>();

    idFromName(name: string): TriFrostCFDurableObjectId {
        return new MockDurableObjectId(name);
    }

    get(id: TriFrostCFDurableObjectId): MockDurableObjectStub {
        const name = id.toString();
        if (!this.instances.has(name)) this.instances.set(name, new MockDurableObjectStub());
        return this.instances.get(name)!;
    }

    reset() {
        this.instances.clear();
    }
}

export {MockDurableObjectNamespace, MockDurableObjectStub};
