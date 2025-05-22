export type TriFrostStoreValue = Record<string, unknown>|unknown[];

export interface TriFrostStore <T extends TriFrostStoreValue = TriFrostStoreValue> {
    get (key:string):Promise<T|null>;

    set (key:string, value:T, opts?:{ttl?:number}):Promise<void>;

    del(val:string|{prefix:string}):Promise<void>;

    stop ():Promise<void>;
}
