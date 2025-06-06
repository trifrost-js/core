/* eslint-disable @typescript-eslint/no-empty-object-type */

import {isFn} from '@valkyriestudios/utils/function';
import {isNeString, isString} from '@valkyriestudios/utils/string';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../types/constants';
import {type TriFrostContext} from '../../types/context';
import {Sym_TriFrostMiddlewareAuth} from './types';

/* Specific symbol attached to auth mware to identify them by */
export const Sym_TriFrostMiddlewareBasicAuth = Symbol('TriFrost.Middleware.BasicAuth');

export type BasicAuthResult = {user:string};

export type BasicAuthOptions <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = BasicAuthResult
> = {
    /**
     * Realm label to respond with when not authenticated
     */
    realm?: string;
    /**
     * Validation function.
     * @note Return true if valid or false if false
     * @note You can also return an object if valid, this will then be set on the state as $auth
     */
    validate: (ctx:TriFrostContext<Env, State>, val: {user: string; pass: string}) => Promise<Patch|boolean>|Patch|boolean;
};

/**
 * HTTP Basic Authentication middleware.
 * 
 * This middleware extracts the `Authorization` header using the Basic scheme,
 * decodes the base64-encoded username and password, and calls the provided
 * validate() function. If valid, the `$auth` state is set on the context.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#basic_authentication_scheme
 *
 * @example
 * .use(BasicAuth({
 *   validate: (ctx, {user, pass}) => user === 'admin' && pass === ctx.env.ADMIN_SECRET
 * }))
 */
export function BasicAuth <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = BasicAuthResult
> (opts:BasicAuthOptions<Env, State, Patch>) {
    if (!isFn(opts?.validate)) throw new Error('TriFrostMiddleware@BasicAuth: A validate function must be provided');
    const realm = isNeString(opts.realm) ? opts.realm : 'Restricted Area';
    const NOT_AUTH = 'Basic realm="' + realm + '"';

    const mware = async function TriFrostBasicAuth (
        ctx:TriFrostContext<Env, State>
    ):Promise<void|TriFrostContext<Env, State & {$auth:Patch}>> {
        const authHeader = ctx.headers.authorization;
        if (!isString(authHeader) || !authHeader.startsWith('Basic ')) {
            ctx.setHeader('WWW-Authenticate', NOT_AUTH);
            return ctx.status(401);
        }

        let decoded = '';
        try {
            decoded = atob(authHeader.slice(6).trim());
        } catch {
            /* Nothing to do here */
        }
        const idx = decoded.indexOf(':');
        if (idx === -1) {
            ctx.setHeader('WWW-Authenticate', NOT_AUTH);
            return ctx.status(401);
        }

        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);

        const result = await opts.validate(ctx, {user, pass});
        if (!result) {
            ctx.setHeader('WWW-Authenticate', NOT_AUTH);
            return ctx.status(401);
        }

        const authenticated = result === true ? {user} : result;
        return ctx.setState({$auth: authenticated} as {$auth:Patch});
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostBasicAuth');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'HTTP Basic Authentication middleware');
    Reflect.set(mware, Sym_TriFrostMiddlewareAuth, true);
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareBasicAuth);

    return mware;
}
