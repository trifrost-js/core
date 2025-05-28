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
import {Sym_TriFrostMiddlewareAuth} from './types';

/* Specific symbol attached to auth mware to identify them by */
export const Sym_TriFrostMiddlewareApiKeyAuth = Symbol('TriFrost.Middleware.ApiKeyAuth');

export type ApiKeyAuthResult = {key:string};

export type ApiKeyAuthOptions <T extends Record<string, unknown> = ApiKeyAuthResult> = {
    /**
     * Header to look for (eg: 'x-api-key')
     */
    header?: string;
    /**
     * Query variable to look for (eg: 'api_key')
     */
    query?: string;
    /**
     * Validation function.
     * @note Return true if valid or false if false
     * @note You can also return an object if valid, this will then be set on the state as $auth
     */
    validate: (ctx:TriFrostContext, key: string) => Promise<T|boolean>|T|boolean;
};

/**
 * API Key Authentication middleware.
 * 
 * This middleware checks for an API key either in the request headers or
 * query parameters, using configurable names. It then calls the provided
 * validate() function. If valid, the `$auth` state is set on the context.
 *
 * @see https://swagger.io/docs/specification/authentication/api-keys/
 *
 * @example
 * .use(ApiKeyAuth({
 *   header: 'x-api-key',
 *   query: 'api_key',
 *   validate: (ctx, key) => key === ctx.env.MY_API_KEY
 * }))
 */
export function ApiKeyAuth <
    T extends Record<string, unknown> = ApiKeyAuthResult
> (opts:ApiKeyAuthOptions<T>) {
    if (!isFn(opts?.validate)) throw new Error('TriFrostMiddleware@ApiKeyAuth: A validate function must be provided');
    const header = isNeString(opts.header) ? opts.header : 'x-api-key';
    const query = isNeString(opts.query) ? opts.query : 'api_key';

    const mware = async function TriFrostApiKeyAuth <
        Env extends Record<string, unknown> = {},
        State extends Record<string, unknown> = {}
    > (ctx:TriFrostContext<Env, State>):Promise<void|TriFrostContext<Env, State & {$auth:T}>> {
        /* Get value from header, falling back to query */
        const key = ctx.headers[header] || ctx.query.get(query) || null;
        if (!isNeString(key)) return ctx.status(401);

        /* Validate, if not valid return 401 */
        const result = await opts.validate(ctx, key);
        if (!result) return ctx.status(401);

        const authenticated = result === true ? {key} : result;
        return ctx.setState({$auth: authenticated} as {$auth:T});
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostApiKeyAuth');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'API Key Authentication middleware');
    Reflect.set(mware, Sym_TriFrostMiddlewareAuth, true);
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareApiKeyAuth);

    return mware;
}
