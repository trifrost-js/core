import {join} from '@valkyriestudios/utils/array';
import {isNeObject} from '@valkyriestudios/utils/object';
import {isIntGt} from '@valkyriestudios/utils/number';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../types/constants';
import {type TriFrostContext} from '../types/context';

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

const CacheControlSet:Set<CacheControlValue> = new Set([...Object.values(CacheControlValues)]);

export type TriFrostCacheControlOptions = {
    /**
     * Specific predefine CacheControl symbol (eg: 'no-cache', 'no-store', ...), defaults to null
     */
    type?: CacheControlValue | null;
    /**
     * Amount of time in seconds the response can be cached for, defaults to null
     *
     * eg: 86400 = 1 day
     */
    maxage?: number | null;
}

/**
 * Parse Cache Header options into a Cache-Control value
 *
 * @param {TriFrostCacheControlOptions} opts - Cache Header Options
 */
function parse (opts:TriFrostCacheControlOptions):string|null {
    if (!isNeObject(opts)) return null;

    const type    = CacheControlSet.has(opts.type!) ? opts.type : null;
    const maxage  = isIntGt(opts.maxage, 0) ? 'max-age=' + opts.maxage : null;
    if (type === null && maxage === null) return null;

    return join([type, maxage], {delim: ', '});
}

/**
 * Utility function which applies cache headers such as Cache-Control to a provided context
 *
 * @param {TriFrostContext} ctx - Context the headers are to be applied to
 * @param {TriFrostCacheControlOptions} opts - Cache Header Options
 */
export function ParseAndApplyCacheControl (ctx:TriFrostContext, opts:TriFrostCacheControlOptions) {
    const val = parse(opts);
    if (val) ctx.setHeader('Cache-Control', val);
}

/**
 * Middleware function which adds cache headers such as Cache-Control to any context passing through it
 *
 * @param {TriFrostCacheControlOptions} opts - Cache Header Options
 */
export function CacheControl (opts:TriFrostCacheControlOptions = {}) {
    const val = parse(opts);

    /* Add symbols for introspection/use further down the line */
    const mware = function TriFrostCacheControlMiddleware <T extends TriFrostContext> (ctx:T):void {
        if (val) ctx.setHeader('Cache-Control', val);
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostCacheControl');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'Middleware adding Cache-Control headers to contexts passing through it');

    return mware;
}
