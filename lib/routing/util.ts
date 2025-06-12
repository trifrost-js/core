/* eslint-disable @typescript-eslint/no-empty-object-type */

import {isIntGt} from '@valkyriestudios/utils/number';
import {type TriFrostRateLimitLimitFunction} from '../modules/RateLimit';
import {
    TriFrostGrouperConfig,
    TriFrostGrouperHandler,
    TriFrostMiddleware,
    type TriFrostHandlerConfig,
    type TriFrostRouteHandler,
} from '../types/routing';


/**
 * Validates whether or not a provided value is a valid handler or handler config
 * @param {TriFrostRouteHandler} val - Value to check
 */
export function isValidHandler <
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {}
> (val:TriFrostRouteHandler<Env, State>):boolean {
    if (typeof val === 'function') return true;
    if (typeof (val as TriFrostHandlerConfig<Env, State>)?.fn !== 'function') return false;
    if (
        'timeout' in (val as TriFrostHandlerConfig<Env, State>) &&
        !isIntGt((val as TriFrostHandlerConfig<Env, State>).timeout, 0) &&
        (val as TriFrostHandlerConfig<Env, State>).timeout !== null
    ) return false;
    return true;
}

/**
 * Validates whether or not a provided value is a valid grouper or grouper config
 * @param {TriFrostRouteHandler} val - Value to check
 */
export function isValidGrouper <
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {}
> (val:TriFrostGrouperHandler<Env, State>):boolean {
    if (typeof val === 'function') return true;
    if (typeof (val as TriFrostGrouperConfig<Env, State>)?.fn !== 'function') return false;
    if (
        'timeout' in (val as TriFrostGrouperConfig<Env, State>) &&
        !isIntGt((val as TriFrostGrouperConfig<Env, State>).timeout, 0) &&
        (val as TriFrostGrouperConfig<Env, State>).timeout !== null
    ) return false;
    return true;
}

/**
 * Validates whether or not a provided value is a valid handler or handler config
 * @param {TriFrostRouteHandler} val - Value to check
 */
export function isValidMiddleware <
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {}
> (val:TriFrostMiddleware<Env, State>):boolean {
    return typeof val === 'function';
}

/**
 * Validates whether or not a provided value is a valid handler or handler config
 * @param {number|TriFrostRateLimitLimitFunction} val - Value to check
 */
export function isValidLimit <
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {}
> (val:number|TriFrostRateLimitLimitFunction<Env, State>):boolean {
    return isIntGt(val, 0) || typeof val === 'function';
}
