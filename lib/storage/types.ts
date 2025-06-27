export type TriFrostStoreValue = Record<string, unknown> | unknown[];

export interface TriFrostStoreAdapter<T extends TriFrostStoreValue = TriFrostStoreValue> {
    get(key: string): Promise<T | null>;

    set(key: string, value: T, ttl: number): Promise<void>;

    del(val: string): Promise<void>;

    delPrefixed(prefix: string): Promise<void>;

    stop(): Promise<void>;
}
