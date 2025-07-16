/**
 * MARK: CloudFlare
 */

export interface TriFrostCFKVNamespace {
    get(key: string): Promise<string | null>;
    get(key: string, type: 'text'): Promise<string | null>;
    get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: string, type: 'stream'): Promise<ReadableStream | null>;

    list(options?: {
        prefix?: string;
        limit?: number;
        cursor?: string;
    }): Promise<{keys: {name: string}[]; list_complete: boolean; cursor?: string}>;

    put(key: string, value: string | ReadableStream | ArrayBuffer, options?: KVNamespacePutOptions): Promise<void>;

    delete(key: string): Promise<void>;
}

export interface TriFrostCFFetcher {
    fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
}

export interface TriFrostCFDurableObjectId {}

export interface TriFrostCFDurableObjectStub {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface TriFrostCFDurableObjectNamespace {
    get(id: TriFrostCFDurableObjectId): TriFrostCFDurableObjectStub;
    idFromName(name: string): TriFrostCFDurableObjectId;
}

/**
 * MARK: Redis
 */

export interface TriFrostRedis {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ...args: any[]) => Promise<void | unknown>;
    del: (...keys: string[]) => Promise<void | unknown>;
    scan: (cursor: string, ...args: any[]) => Promise<[string, string[]]>;
}
