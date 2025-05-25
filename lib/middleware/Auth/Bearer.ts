/* eslint-disable @typescript-eslint/no-empty-object-type */
import {isFn} from '@valkyriestudios/utils/function';
import {isString} from '@valkyriestudios/utils/string';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../types/constants';
import {type TriFrostContext} from '../../types/context';

export type BearerAuthResult = {token:string};

export type BearerAuthOptions <T extends Record<string, unknown> = BearerAuthResult> = {
    /**
     * Validation function.
     * @note Return true if valid or false if false
     * @note You can also return an object if valid, this will then be set on the state as $auth
     */
    validate: (ctx:TriFrostContext, token: string) => Promise<T|boolean>|T|boolean;
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
    T extends Record<string, unknown> = BearerAuthResult
> (opts:BearerAuthOptions<T>) {
    if (!isFn(opts?.validate)) throw new Error('TriFrostMiddleware@BearerAuth: A validate function must be provided');

    const mware = async function TriFrostBearerAuth <
        Env extends Record<string, unknown> = {},
        State extends Record<string, unknown> = {}
    > (ctx:TriFrostContext<Env, State>):Promise<void|TriFrostContext<Env, State & {$auth:T}>> {
        const raw = ctx.headers.authorization;
        if (!isString(raw) || !raw.startsWith('Bearer ')) return ctx.status(401);

        const token = raw.slice(7).trim();
        const result = await opts.validate(ctx, token);
        if (!result) return ctx.status(401);

        const authenticated = result === true ? {token} : result;
        return ctx.setState({$auth: authenticated} as {$auth:T});
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostBearerAuth');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'HTTP Bearer Token Authentication middleware');

    return mware;
}
