/* eslint-disable @typescript-eslint/no-empty-object-type */

import {type TriFrostCacheControlOptions} from '../middleware/CacheControl';
import {type TriFrostCache} from '../modules/Cache';
import {
    type Cookies,
    type TriFrostCookieOptions,
} from '../modules/Cookies';
import {
    type TriFrostLogger,
} from '../modules/Logger';
import {type TriFrostRouteMatch} from './routing';
import {
    type TriFrostBodyParserOptions,
    type ParsedBody,
} from '../utils/BodyParser/types';
import {
    type HttpRedirectStatusCode,
    type HttpStatusCode,
    type MimeType,
    type HttpMethod,
} from './constants';
import {type createCss, type createScript} from '../modules';

export type TriFrostContextKind = 'std' | 'notfound' | 'error' | 'options' | 'health';

export type TriFrostContextIdOptions = {
    /**
     * Headers to look through to use for incoming request IDs.
     * @note default is ['x-request-id', 'cf-ray']
     * @note this is used for distributed tracing
     * @note this is a priority array
     */
    inbound: string[];
    /**
     * Outbound header to use when running calls through ctx.fetch.
     * @note default is 'x-request-id'
     */
    outbound: string|null;
    /**
     * Validation function, by default this verifies a uuid format
     */
    validate: (val:string) => boolean;
};

export type TriFrostContextConfig <Env extends Record<string, any> = Record<string, any>> = Readonly<{
    cookies: Partial<TriFrostCookieOptions>;
    cache: TriFrostCache<Env>;
    host: string|null;
    port?: number;
    timeout: number|null;
    env: Env;
    requestId: TriFrostContextIdOptions|null;
    trustProxy?: boolean;
    /* Client-side modules */
    css?: ReturnType<typeof createCss>;
    script?: ReturnType<typeof createScript>['script'];
}>;

export type TriFrostContextFileOptions = {
    cacheControl?: TriFrostCacheControlOptions;
    /**
     * Whether to force browser download behavior.
     * Set to true to instruct consumer system to download rather than display the file.
     * Set to a string to define the name the file will be downloaded as.
     * Default = false
     */
    download?: boolean|string;
};

export type TriFrostContextRenderOptions = {
    css?:ReturnType<typeof createCss>;
    script?:ReturnType<typeof createScript>['script'];
};

export type TriFrostContextResponseOptions = {
    status?: HttpStatusCode;
    cacheControl?: TriFrostCacheControlOptions;
};

export type TriFrostContextRedirectOptions = {
    status?: HttpRedirectStatusCode;
    /**
     * Whether or not to keep the query string (defaults to true), example:
     * redirect(ctx, '/one') -> '/two?hello=three' -> '/one?hello=three'
     * redirect(ctx, '/one', {keep_query: true}) -> '/two?hello=three' -> '/one?hello=three'
     * redirect(ctx, '/one', {keep_query: false}) -> '/two?hello=three' -> '/one'
     */
    keep_query?: boolean;
};

export type TriFrostContext<
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {}
> = {
    get env             ():Readonly<Env>;
    get method          ():HttpMethod;
    get path            ():string;
    get name            ():string;
    get nonce           ():string;
    get kind            ():TriFrostContextKind;
    get host            ():string|null;
    get ip              ():string|null;
    get requestId       ():string;
    get query           ():Readonly<URLSearchParams>;
    get body            ():Readonly<ParsedBody>;
    get isInitialized   ():boolean;
    get isDone          ():boolean;
    get isAborted       ():boolean;
    get isLocked        ():boolean;
    get headers         ():Readonly<Record<string, string>>;
    get logger          ():TriFrostLogger;
    get cookies         ():Cookies;
    get cache           ():TriFrostCache;
    get state           ():Readonly<State>;
    get statusCode      ():HttpStatusCode;
    get timeout         ():number|null;
    get afterHooks      ():(() => Promise<void>)[];

    setState: <Patch extends Record<string, unknown>>(patch: Patch) => TriFrostContext<Env, State & Patch>;
    delState: <K extends keyof State>(keys: K[]) => TriFrostContext<Env, Omit<State, K>>;

    setHeader: (key:string, value:string|number) => void;
    setHeaders: (obj: Record<string, string|number>) => void;
    delHeader: (key:string) => void;

    setType: (val:MimeType) => void;
    setStatus: (status:HttpStatusCode) => void;
    setBody: (value:string|null) => void;

    setTimeout: (val:number|null) => void;
    clearTimeout: () => void;

    init: (match:TriFrostRouteMatch<Env>, handler?:(config:TriFrostBodyParserOptions|null)=>Promise<ParsedBody|null>) => Promise<void>;
    abort: (status?:HttpStatusCode) => void;
    fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
    status: (status:HttpStatusCode) => void;
    end: () => void|Response;
    addAfter: (fn: () => Promise<void>) => void;
    runAfter: () => void;

    json: (body?:Record<string, unknown>|unknown[], opts?:TriFrostContextResponseOptions) => void;
    html: (body?:string|JSX.Element, opts?:TriFrostContextResponseOptions) => void;
    text: (body:string, opts?:TriFrostContextResponseOptions) => void;
    redirect: (to:string, opts?:TriFrostContextRedirectOptions) => void;
    file: (path:string|{stream:unknown;size?:number|null;name:string}, opts?:TriFrostContextFileOptions) => Promise<void>;
};
