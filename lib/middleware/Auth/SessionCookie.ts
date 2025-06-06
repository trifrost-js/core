/* eslint-disable @typescript-eslint/no-empty-object-type */
import {isFn} from '@valkyriestudios/utils/function';
import {isNeString} from '@valkyriestudios/utils/string';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../types/constants';
import {type TriFrostContext} from '../../types/context';
import {type SigningAlgorithm} from '../../modules/Cookies';
import {Sym_TriFrostMiddlewareAuth} from './types';

/* Specific symbol attached to auth mware to identify them by */
export const Sym_TriFrostMiddlewareSessionCookieAuth = Symbol('TriFrost.Middleware.SessionCookieAuth');

export type SessionCookieAuthResult = {cookie:string};

export type SessionCookieAuthSecret <Env extends Record<string, unknown> = {}> = {
    /**
     * Secret value, either directly or lazily resolved from env
     */
    val: string | ((opts:{env:Env}) => string);

    /**
     * Optional HMAC algorithm (defaults to SHA-256)
     */
    algorithm?: SigningAlgorithm;
};

export type SessionCookieAuthOptions <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = SessionCookieAuthResult,
> = {
    /**
     * Name of the cookie to get from
     */
    cookie: string;
    /**
     * Secret object containing the value and optional algorithm
     */
    secret: SessionCookieAuthSecret<Env>;
    /**
     * Optional additional validation after HMAC verify
     * @note Return true if valid or false if false
     * @note You can also return an object if valid, this will then be set on the state as $auth
     */
    validate?: (ctx:TriFrostContext<Env, State>, value: string) => Promise<Patch|boolean>|Patch|boolean;
};

/**
 * Session Cookie Authentication middleware.
 * 
 * This middleware retrieves a named cookie from the request, typically holding
 * a session identifier, and calls the provided validate() function. If valid,
 * the `$auth` state is set on the context.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
 *
 * @example
 * .use(SessionCookieAuth({
 *   cookie: 'session_id',
 *   validate: (ctx, value) => lookupSession(value)
 * }))
 */
export function SessionCookieAuth <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = SessionCookieAuthResult
> (opts:SessionCookieAuthOptions<Env, State, Patch>) {
    if (!isNeString(opts?.cookie)) throw new Error('TriFrostMiddleware@SessionCookieAuth: A cookie name must be provided');
    if (
        !isNeString(opts.secret?.val) &&
        !isFn(opts.secret?.val)
    ) throw new Error('TriFrostMiddleware@SessionCookieAuth: A secret must be provided');

    const secretFn = isFn(opts.secret.val) ? opts.secret.val : () => opts.secret.val;
    const algorithm = isNeString(opts.secret.algorithm) ? opts.secret.algorithm : 'SHA-256';
    const validateFn = isFn(opts.validate) ? opts.validate : null;

    const mware = async function TriFrostSessionCookieAuth (
        ctx:TriFrostContext<Env, State>
    ):Promise<void|TriFrostContext<Env, State & {$auth:Patch}>> {
        /* Get cookie, if cookie is not found return 401 */
        const cookie = ctx.cookies.get(opts.cookie);
        if (!isNeString(cookie)) return ctx.status(401);

        /* Get resolved secret */
        const secret = secretFn(ctx);
        if (!isNeString(secret)) return ctx.status(401);

        /* Verify HMAC signature */
        const verified = await ctx.cookies.verify(cookie, secret, {algorithm});
        if (!verified) return ctx.status(401);

        /* If no validation function, set state and continue */
        if (!validateFn) return ctx.setState({$auth: {cookie: verified}} as unknown as {$auth:Patch});
        

        /* Validate, if not valid return 401 */
        const result = await validateFn(ctx, verified);
        if (!result) return ctx.status(401);

        const authenticated = result === true ? {cookie: verified} : result;
        return ctx.setState({$auth: authenticated} as {$auth:Patch});
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostSessionCookieAuth');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'Session Cookie Authentication middleware');
    Reflect.set(mware, Sym_TriFrostMiddlewareAuth, true);
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareSessionCookieAuth);

    return mware;
}
