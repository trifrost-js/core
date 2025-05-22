import {isNeArray} from '@valkyriestudios/utils/array';
import {isFn} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {isNeString} from '@valkyriestudios/utils/string';
import {type TriFrostCache, type CacheOptions, type TriFrostCacheValue} from './_Cache';
import {type TriFrostContext} from '../../types/context';

type CacheKeyFn <T> = (ctx:T) => string;

export const Sym_TriFrostCached = Symbol('trifrost.cache.cached');
export const Sym_TriFrostSkipCache = Symbol('trifrost.cache.skip');

export function cache <This, Args extends any[], Ret> (
    key:string|CacheKeyFn<Args[0]>,
    opts?:CacheOptions
) {
    return function (
        method:(this:This, ...args:Args) => Promise<Ret>
    ):typeof method {
        /* Prevent re-decoration */
        if (Reflect.get(method, Sym_TriFrostCached)) return method;

        const wrapped = async function (this:This, ...args:Args):Promise<Ret> {
            const ctx:TriFrostContext|undefined = isNeArray(args) ? args[0] : undefined;

            /* Get trifrost cache either from passed ctx, this.cache or this.ctx.cache */
            const trifrost_cache:TriFrostCache|undefined = ctx?.cache ?? (this as any)?.cache ?? (this as any)?.ctx?.cache;

            /* No viable cache found */
            if (
                !isFn(trifrost_cache?.get) ||
                !isFn(trifrost_cache?.set)
            ) return method.call(this, ...args);

            /* Determine cache key */
            const ckey = isFn(key)
                ? (key as CacheKeyFn<unknown>)(ctx!)
                : isNeString(key)
				    ? key
				    : null;
            if (!ckey) return method.call(this, ...args);

            /* Retrieve from cache, if exists -> return */
            const cached = await trifrost_cache.get(ckey);
            if (cached !== null && cached !== undefined) return cached as Ret;

            /* Run method */
            const result = await method.call(this, ...args);
            if (
                isObject(result) &&
                Reflect.get(result, Sym_TriFrostSkipCache)
            ) return (result as unknown as {value: Ret}).value;

            /* Cache */
            await trifrost_cache.set(ckey, result as TriFrostCacheValue, opts);
            return result;
        };

        /* Set to prevent re-decoration */
        Reflect.set(wrapped, Sym_TriFrostCached, true);

        return wrapped;
    };
}

/**
 * Marks a value as "do not cache", will still return the value directly from the method.
 */
export function cacheSkip <T> (value:T):T {
    const v = {value};
    Reflect.set(v, Sym_TriFrostSkipCache, true);
    return v as T;
}

/**
 * Returns whether or not a value is a cache skip value
 */
export function cacheSkipped <T> (v:unknown):v is {value:T} {
    return isObject(v) && Reflect.get(v, Sym_TriFrostSkipCache) === true;
}

export function cacheFn<T extends (...args: any[]) => any> (
    key:string|CacheKeyFn<Parameters<T>[0]>,
    opts?:CacheOptions
):(fn:T) => T {
    return function (fn:T):T {
        /* Prevent re-decoration */
        if (Reflect.get(fn, Sym_TriFrostCached)) return fn;

        const wrapped = async function (this:any, ...args:Parameters<T>):Promise<ReturnType<T>> {
            const ctx:TriFrostContext|undefined = isNeArray(args) ? args[0] : undefined;

            const trifrost_cache = ctx?.cache ?? this?.cache ?? this?.ctx?.cache;

            /* No viable cache found */
            if (
                !isFn(trifrost_cache?.get) ||
                !isFn(trifrost_cache?.set)
            ) return fn.apply(this, args);

            /* Determine cache key */
            const ckey = isFn(key)
                ? key(ctx!)
                : isNeString(key)
                    ? key
                    : null;
            if (!ckey) return fn.apply(this, args);

            /* Retrieve from cache, if exists -> return */
            const cached = await trifrost_cache.get(ckey);
            if (cached !== null && cached !== undefined) return cached;

            /* Run method */
            const result = await fn.apply(this, args);
            if (cacheSkipped<ReturnType<T>>(result)) return result.value;

            /* Cache */
            await trifrost_cache.set(ckey, result, opts);
            return result;
        };

        /* Set to prevent re-decoration */
        Reflect.set(wrapped, Sym_TriFrostCached, true);

        return wrapped as T;
    };
}
