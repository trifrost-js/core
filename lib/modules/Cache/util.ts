import {isNeString} from '@valkyriestudios/utils/string';
import {type TriFrostCache, type CacheOptions, type TriFrostCacheValue} from './_Cache';
import {type TriFrostContext} from '../../types/context';
import {ctx as getCtx} from '../../utils/Als';

type CacheKeyFn<Args extends any[] = any[]> = (...args: Args) => string;

export const Sym_TriFrostCached = Symbol('trifrost.cache.cached');
export const Sym_TriFrostSkipCache = Symbol('trifrost.cache.skip');

function hasCache(val: any) {
    return val?.cache && typeof val.cache.get === 'function' && typeof val.cache.set === 'function';
}

/**
 * Resolve a TriFrostCache instance from any combination of:
 * - ALS-bound context (if available)
 * - First argument (if it's a TriFrostContext)
 * - `this.cache` or `this.ctx.cache` (for instance methods)
 */
function resolveCache(self: any, args: any[]) {
    // ALS-bound context
    const ctxAls: TriFrostContext | undefined = getCtx();
    if (hasCache(ctxAls)) return ctxAls?.cache as TriFrostCache;

    // First argument
    const ctxArg: TriFrostContext | undefined = Array.isArray(args) && args.length ? (args[0] as TriFrostContext) : undefined;
    if (hasCache(ctxArg)) return ctxArg?.cache as TriFrostCache;

    // Fallback to self.cache
    if (hasCache(self)) return self.cache as TriFrostCache;

    // Fallback to self.ctx.cache
    if (hasCache(self?.ctx)) return self.ctx.cache as TriFrostCache;

    return null;
}

export function cache<This, Args extends any[], Ret, ArgsSubset extends Partial<Args> = Args>(
    key: string | CacheKeyFn<ArgsSubset>,
    opts?: CacheOptions,
) {
    return function (method: (this: This, ...args: Args) => Promise<Ret>): typeof method {
        /* Prevent re-decoration */
        if (Reflect.get(method, Sym_TriFrostCached)) return method;

        const wrapped = async function (this: This, ...args: Args): Promise<Ret> {
            /* Get trifrost cache either from passed ctx, this.cache or this.ctx.cache */
            const trifrost_cache: TriFrostCache | null = resolveCache(this, args);

            /* No viable cache found */
            if (!trifrost_cache) return method.call(this, ...args);

            /* Determine cache key */
            const ckey = typeof key === 'function' ? key(...(args.slice(0, key.length) as ArgsSubset)) : isNeString(key) ? key : null;
            if (!ckey) return method.call(this, ...args);

            /* Retrieve from cache, if exists -> return */
            const cached = await trifrost_cache.get(ckey);
            if (cached !== null && cached !== undefined) return cached as Ret;

            /* Run method */
            const result = await method.call(this, ...args);
            if (
                Object.prototype.toString.call(result) === '[object Object]' &&
                Reflect.get(result as Record<string, unknown>, Sym_TriFrostSkipCache)
            )
                return (result as unknown as {value: Ret}).value;

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
export function cacheSkip<T>(value: T): T {
    const v = {value};
    Reflect.set(v, Sym_TriFrostSkipCache, true);
    return v as T;
}

/**
 * Returns whether or not a value is a cache skip value
 */
export function cacheSkipped<T>(v: unknown): v is {value: T} {
    return (
        Object.prototype.toString.call(v) === '[object Object]' && Reflect.get(v as Record<string, unknown>, Sym_TriFrostSkipCache) === true
    );
}

export function cacheFn<T extends (...args: any[]) => any, ArgsSubset extends Partial<Parameters<T>> = Parameters<T>>(
    key: string | CacheKeyFn<ArgsSubset>,
    opts?: CacheOptions,
): (fn: T) => T {
    return function (fn: T): T {
        /* Prevent re-decoration */
        if (Reflect.get(fn, Sym_TriFrostCached)) return fn;

        const wrapped = async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
            /* Get trifrost cache either from passed ctx, this.cache or this.ctx.cache */
            const trifrost_cache: TriFrostCache | null = resolveCache(this, args);

            /* No viable cache found */
            if (!trifrost_cache) return fn.apply(this, args);

            /* Determine cache key */
            const ckey = typeof key === 'function' ? key(...(args.slice(0, key.length) as ArgsSubset)) : isNeString(key) ? key : null;
            if (!ckey) return fn.apply(this, args);

            /* Retrieve from cache, if exists -> return */
            const cached = await trifrost_cache.get(ckey);
            if (cached !== null && cached !== undefined) return cached as ReturnType<T>;

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
