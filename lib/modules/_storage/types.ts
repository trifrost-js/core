export type TriFrostStoreValue = Record<string, unknown>|unknown[];

export interface TriFrostStore <T extends TriFrostStoreValue = Record<string, unknown>> {
    get (key: string): Promise<T|null>;

    set (key: string, value: T, opts?: {ttl?: number}): Promise<void>;

    delete(key: string):Promise<void>;

    stop ():Promise<void>;
}
