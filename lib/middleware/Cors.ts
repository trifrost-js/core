/* eslint-disable max-statements,complexity */

import {isNeArray} from '@valkyriestudios/utils/array';
import {isIntGte} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';
import {
    HttpMethods,
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../types/constants';
import {type TriFrostContext} from '../types/context';

/* Specific symbol attached to cors mware to identify them by */
export const Sym_TriFrostMiddlewareCors = Symbol('TriFrost.Middleware.Cors');

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'CONNECT', 'TRACE'] as const;
const METHODSSet = new Set(METHODS);

type TriFrostCorsOriginFunction = (origin:string|null) => string|null;

export type TriFrostCorsOptions = {
    origin?: string|string[]|TriFrostCorsOriginFunction;
    methods?: ((typeof METHODS)[number])[] | '*';
    headers?: string[];
    expose?: string[];
    credentials?: boolean;
    maxage?: number;
};

/**
 * CORS - Cross Origin Resource Sharing
 * @see origin - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
 * @see methods - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods
 * @see headers - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Headers
 * @see expose - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers
 * @see credentials - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials
 * @see maxage - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age
 */
export function Cors (opts: TriFrostCorsOptions = {}) {
    const {
        origin = '*',
        methods = ['GET', 'HEAD', 'POST'],
        headers = [],
        expose = [],
        credentials = false,
        maxage,
    } = opts;

    let originWhiteList:Set<string>|null = null;
    let originFn:TriFrostCorsOriginFunction|null = null;

    const computed: Record<string, string> = {Vary: 'Origin'};

    /* Access-Control-Allow-Origin */
    if (isNeString(origin)) {
        computed['Access-Control-Allow-Origin'] = origin;
    } else if (isNeArray(origin)) {
        originWhiteList = new Set();
        for (let i = 0; i < origin.length; i++) {
            const val = origin[i];
            if (isNeString(val)) originWhiteList.add(val.trim());
        }
        if (!originWhiteList.size) throw new Error('TriFrostMiddleware@Cors: Invalid origin');
        originFn = reqOrigin => {
            if (typeof reqOrigin === 'string' && originWhiteList!.has(reqOrigin)) return reqOrigin;
            return null;
        };
    } else if (typeof origin === 'function') {
        originFn = origin;
    }

    /* Access-Control-Allow-Methods */
    if (isNeArray(methods)) {
        const normalized = new Set();
        for (let i = 0; i < methods.length; i++) {
            const method = methods[i];
            if (!METHODSSet.has(method)) throw new Error('TriFrostMiddleware@Cors: Invalid method "' + method + '"');
            normalized.add(method);
        }
        computed['Access-Control-Allow-Methods'] = [...normalized].join(', ');
    } else if (methods === '*') {
        computed['Access-Control-Allow-Methods'] = '*';
    }

    /* Access-Control-Allow-Headers */
    if (isNeArray(headers)) {
        const normalized = new Set();
        for (let i = 0; i < headers.length; i++) {
            const el = headers[i];
            if (!isNeString(el)) throw new Error('TriFrostMiddleware@Cors: Invalid header "' + el + '"');
            normalized.add(el.trim());
        }
        computed['Access-Control-Allow-Headers'] = [...normalized.values()].join(', ');
    }

    /* Access-Control-Expose-Headers */
    if (isNeArray(expose)) {
        const normalized = new Set();
        for (let i = 0; i < expose.length; i++) {
            const el = expose[i];
            if (!isNeString(el)) throw new Error('TriFrostMiddleware@Cors: Invalid expose "' + el + '"');
            normalized.add(el.trim());
        }
        computed['Access-Control-Expose-Headers'] = [...normalized.values()].join(', ');
    }

    /* Access-Control-Allow-Credentials */
    if (credentials === true) {
        computed['Access-Control-Allow-Credentials'] = 'true';
    }

    /* Access-Control-Max-Age */
    if (isIntGte(maxage, 0)) {
        computed['Access-Control-Max-Age'] = `${maxage}`;
    }

    /* Baseline Middleware function */
    const mware = function TriFrostCorsMiddleware <T extends TriFrostContext> (ctx:T):T|void {
        /* Add computed headers */
        ctx.setHeaders(computed);

        /* If origin is function we should check to see if we need to add it */
        if (originFn) {
            const value = originFn(ctx.headers.origin ?? ctx.headers.Origin ?? null);
            if (value !== null) ctx.setHeader('Access-Control-Allow-Origin', value);
        }

        /* If it's an options call simply return a 204 status */
        if (ctx.method === HttpMethods.OPTIONS) return ctx.status(204);
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostCors');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'Middleware for Cross Origin Resource Sharing');
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareCors);

    return mware;
}
