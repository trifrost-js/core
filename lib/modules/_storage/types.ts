export type TriFrostStoreValue = Record<string, unknown>|unknown[];

export interface TriFrostStore <T extends TriFrostStoreValue = TriFrostStoreValue> {
    get (key: string): Promise<T|null>;

    set (key: string, value: T, opts?: {ttl?: number}): Promise<void>;

    del(key: string):Promise<void>;

    stop ():Promise<void>;
}
