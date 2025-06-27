import {isObject} from '@valkyriestudios/utils/object';
import {isIntGt} from '@valkyriestudios/utils/number';
import {Sym_TriFrostDescription, Sym_TriFrostFingerPrint, Sym_TriFrostName} from '../types/constants';
import {type TriFrostContext} from '../types/context';

/* Specific symbol attached to cache control mware to identify them by */
export const Sym_TriFrostMiddlewareCacheControl = Symbol('TriFrost.Middleware.CacheControl');

enum CacheControlValues {
    /**
     * Instructs the browser that it must revalidate with the server every time before using a cached version of the URL
     */
    NoCache = 'no-cache',
    /**
     * Instructs the browser and other intermediate caches (like CDNs) to never store any version of the file
     */
    NoStore = 'no-store',
    /**
     * Browsers can cache the file but intermediate caches cannot
     */
    Private = 'private',
    /**
     * Response can be stored by any cache
     */
    Public = 'public',
}

type CacheControlValue = `${CacheControlValues}`;

const CacheControlSet: Set<CacheControlValue> = new Set([...Object.values(CacheControlValues)]);

export type TriFrostCacheControlOptions = {
    /**
     * Specific predefine CacheControl symbol (eg: 'no-cache', 'no-store', ...)
     */
    type?: CacheControlValue;
    /**
     * Amount of time in seconds the response can be cached for
     *
     * eg: 86400 = 1 day
     */
    maxage?: number;
    /**
     * Marks the response as immutable, signaling that it will never change.
     * Useful for long-lived static assets.
     */
    immutable?: boolean;
    /**
     * Indicates that once the response becomes stale, it must be revalidated with the origin server.
     */
    mustRevalidate?: boolean;
    /**
     * Maximum time in seconds that shared caches (like CDNs) can cache the response.
     * Overrides maxage for shared caches.
     */
    proxyMaxage?: number;
    /**
     * Signals that shared caches (proxies) must revalidate the response once stale.
     */
    proxyRevalidate?: boolean;
};

/**
 * Parse Cache Header options into a Cache-Control value
 *
 * @param {TriFrostCacheControlOptions} opts - Cache Header Options
 */
function parse(opts: TriFrostCacheControlOptions): string | null {
    const parts: string[] = [];

    if (isObject(opts)) {
        /* type: no-store, no-cache, public, private */
        if (CacheControlSet.has(opts.type!)) parts.push(opts.type!);

        /* max-age */
        if (isIntGt(opts.maxage, 0)) parts.push('max-age=' + opts.maxage);

        /* s-maxage */
        if (isIntGt(opts.proxyMaxage, 0)) parts.push('s-maxage=' + opts.proxyMaxage);

        /* immutable */
        if (opts.immutable === true) parts.push('immutable');

        /* must-revalidate */
        if (opts.mustRevalidate === true) parts.push('must-revalidate');

        /* proxy-revalidate */
        if (opts.proxyRevalidate === true) parts.push('proxy-revalidate');
    }

    return parts.length ? parts.join(', ') : null;
}

/**
 * Utility function which applies cache headers such as Cache-Control to a provided context
 *
 * @param {TriFrostContext} ctx - Context the headers are to be applied to
 * @param {TriFrostCacheControlOptions} opts - Cache Header Options
 */
export function ParseAndApplyCacheControl(ctx: TriFrostContext, opts: TriFrostCacheControlOptions) {
    const val = parse(opts);
    if (val) ctx.setHeader('Cache-Control', val);
}

/**
 * Middleware function which adds cache headers such as Cache-Control to any context passing through it
 *
 * @param {TriFrostCacheControlOptions} opts - Cache Header Options
 */
export function CacheControl<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}>(
    opts: TriFrostCacheControlOptions = {},
) {
    const val = parse(opts);

    const mware = function TriFrostCacheControlMiddleware(ctx: TriFrostContext<Env, State>): void {
        if (val) ctx.setHeader('Cache-Control', val);
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostCacheControl');
    Reflect.set(mware, Sym_TriFrostDescription, 'Middleware adding Cache-Control headers to contexts passing through it');
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareCacheControl);

    return mware;
}
