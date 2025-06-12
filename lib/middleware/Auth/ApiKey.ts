/* eslint-disable @typescript-eslint/no-empty-object-type */
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

export type ApiKeyAuthResult = {apiKey:string; apiClient:string|null};

export type ApiKeyAuthOptions <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = ApiKeyAuthResult
> = {
    /**
     * Where to extract the API key from
     */
    apiKey: {header?:string; query?:string};
    /**
     * Where to extract the API client/app ID from
     */
    apiClient?: {header?:string; query?:string};
    /**
     * Validation function.
     * @note Return true if valid or false if false
     * @note You can also return an object if valid, this will then be set on the state as $auth
     */
    validate: (ctx:TriFrostContext<Env, State>, val: ApiKeyAuthResult) => Promise<Patch|boolean>|Patch|boolean;
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
 *   apiKey: {header: 'x-api-key'},
 *   apiClient: {header: 'x-api-id'},
 *   validate: (ctx, key) => key === ctx.env.MY_API_KEY
 * }))
 */
export function ApiKeyAuth <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = ApiKeyAuthResult
> (opts:ApiKeyAuthOptions<Env, State, Patch>) {
    if (typeof opts?.validate !== 'function') throw new Error('TriFrostMiddleware@ApiKeyAuth: A validate function must be provided');

    if (!isNeString(opts.apiKey?.header) && !isNeString(opts.apiKey?.query)) {
        throw new Error('TriFrostMiddleware@ApiKeyAuth: You must configure apiKey header or query');
    }

    /* Determine key behavior */
    const apiKeyHeader:string|null = isNeString(opts.apiKey?.header) ? opts.apiKey.header : null;
    const apiKeyQuery:string|null = isNeString(opts.apiKey?.query) ? opts.apiKey.query : null;

    /* Determine client behavior */
    const apiClientHeader:string|null = isNeString(opts.apiClient?.header) ? opts.apiClient.header : null;
    const apiClientQuery:string|null = isNeString(opts.apiClient?.query) ? opts.apiClient.query : null;
    const apiClientEnabled = apiClientHeader || apiClientQuery;

    const mware = async function TriFrostApiKeyAuth (
        ctx:TriFrostContext<Env, State>
    ):Promise<void|TriFrostContext<Env, State & {$auth:Patch}>> {
        /* Api Client */
        let apiClient:string|null = null;
        if (apiClientEnabled) {
            if (apiClientHeader) apiClient = ctx.headers[apiClientHeader];
            if (!apiClient && apiClientQuery) apiClient = ctx.query.get(apiClientQuery);
            if (typeof apiClient !== 'string' || !apiClient.length) return ctx.status(401);
        }

        /* Get value from header, falling back to query */
        let apiKey:string|null = null;
        if (apiKeyHeader) apiKey = ctx.headers[apiKeyHeader];
        if (!apiKey && apiKeyQuery) apiKey = ctx.query.get(apiKeyQuery);
        if (typeof apiKey !== 'string' || !apiKey.length) return ctx.status(401);

        /* Validate, if not valid return 401 */
        const result = await opts.validate(ctx, {apiKey, apiClient});
        if (!result) return ctx.status(401);

        const authenticated = result === true ? {apiKey, apiClient} : result;
        return ctx.setState({$auth: authenticated} as {$auth:Patch});
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostApiKeyAuth');
    Reflect.set(mware, Sym_TriFrostType, 'middleware');
    Reflect.set(mware, Sym_TriFrostDescription, 'API Key Authentication middleware');
    Reflect.set(mware, Sym_TriFrostMiddlewareAuth, true);
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareApiKeyAuth);

    return mware;
}
