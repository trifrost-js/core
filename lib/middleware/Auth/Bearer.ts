/* eslint-disable @typescript-eslint/no-empty-object-type */
import {
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../types/constants';
import {type TriFrostContext} from '../../types/context';
import {Sym_TriFrostMiddlewareAuth} from './types';

/* Specific symbol attached to auth mware to identify them by */
export const Sym_TriFrostMiddlewareBearerAuth = Symbol('TriFrost.Middleware.BearerAuth');

export type BearerAuthResult = {token:string};

export type BearerAuthOptions <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = BearerAuthResult
> = {
    /**
     * Validation function.
     * @note Return true if valid or false if false
     * @note You can also return an object if valid, this will then be set on the state as $auth
     */
    validate: (ctx:TriFrostContext<Env, State>, token: string) => Promise<Patch|boolean>|Patch|boolean;
};

/**
 * HTTP Bearer Token Authentication middleware.
 *
 * This middleware extracts the `Authorization` header using the Bearer scheme,
 * retrieves the token, and calls the provided validate() function. If valid,
 * the `$auth` state is set on the context.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#bearer_authentication
 *
 * @example
 * .use(BearerAuth({
 *   validate: (ctx, token) => token === ctx.env.API_TOKEN
 * }))
 */
export function BearerAuth <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = BearerAuthResult
> (opts:BearerAuthOptions<Env, State, Patch>) {
    if (typeof opts?.validate !== 'function') throw new Error('TriFrostMiddleware@BearerAuth: A validate function must be provided');

    const mware = async function TriFrostBearerAuth (
        ctx:TriFrostContext<Env, State>
    ):Promise<void|TriFrostContext<Env, State & {$auth:Patch}>> {
        const raw = ctx.headers.authorization;
        if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) return ctx.status(401);

        const token = raw.slice(7).trim();
        const result = await opts.validate(ctx, token);
        if (!result) return ctx.status(401);

        const authenticated = result === true ? {token} : result;
        return ctx.setState({$auth: authenticated} as {$auth:Patch});
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostBearerAuth');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'HTTP Bearer Token Authentication middleware');
    Reflect.set(mware, Sym_TriFrostMiddlewareAuth, true);
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareBearerAuth);

    return mware;
}
