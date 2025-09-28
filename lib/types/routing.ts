/* eslint-disable @typescript-eslint/no-unused-vars */

import {type TriFrostRateLimitLimitFunction, type TriFrostRateLimit} from '../modules/RateLimit/_RateLimit';
import {type Route} from '../routing/Route';
import {type RouteTree} from '../routing/Tree';
import {type TriFrostBodyParserOptions} from '../utils/BodyParser/types';
import {type Lazy} from '../utils/Lazy';
import {type HttpMethod, Sym_TriFrostDescription, Sym_TriFrostName} from './constants';
import {type TriFrostContext, type TriFrostContextKind} from './context';
import {type Promisify} from './generic';
import {type TFInput, type TFValidator, type ExtractInput} from './validation';

export type TriFrostType = 'handler' | 'middleware';

/**
 * Extracts route parameters from a string path.
 *
 * Example:
 * - PathParam<"/users/:id"> results in { id: string }
 * - PathParam<"/posts/:postId/comments/:commentId"> results in { postId: string, commentId: string }
 * - PathParam<"/static/path"> results in Record<string, string>
 */
export type PathParam<Path extends string> = string extends Path
    ? {}
    : Path extends `${infer _Start}:${infer Param}/${infer Rest}`
      ? {[K in Param | keyof PathParam<`/${Rest}`>]: string}
      : Path extends `${infer _Start}:${infer Param}`
        ? {[K in Param]: string}
        : Path extends `${infer _Prefix}/*`
          ? {'*': string}
          : {};

/** Middleware type */
export type TriFrostMiddleware<
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = {},
> = ((ctx: TriFrostContext<Env, State>) => Promisify<void | TriFrostContext<Env, State & Patch>>) & {
    [Sym_TriFrostDescription]?: string;
    [Sym_TriFrostName]?: string;
};

/** Handler type — ALWAYS parameterized by input shape */
export type TriFrostHandler<
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {},
    TInput extends TFInput = TFInput,
> = (ctx: TriFrostContext<Env, State, TInput>) => Promisify<void>;

/** Handler config (optional validator) */
export type TriFrostHandlerConfig<
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    TV extends TFValidator<any, Env, State> = TFValidator<any, Env, State>,
> = {
    fn: TriFrostHandler<Env, State, ExtractInput<TV>>;
    input?: TV | null;
    name?: string;
    description?: string;
    timeout?: number | null;
    kind?: TriFrostContextKind;
    meta?: Record<string, unknown>;
    middleware?: TriFrostMiddleware<Env, State>[];
    bodyParser?: TriFrostBodyParserOptions | null;
};

/** A route handler can be a bare handler or a config object */
export type TriFrostRouteHandler<
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {},
    TV extends TFValidator<any, Env, State> = TFValidator<any, Env, State>,
> = TriFrostHandler<Env, State, ExtractInput<TV>> | TriFrostHandlerConfig<Env, State, TV>;

/** Internal route representation (after registration) */
export type TriFrostRoute<
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    TInput extends TFInput = TFInput,
> = {
    path: string;
    middleware: {
        name: string;
        description: string | null;
        fingerprint: any;
        handler: TriFrostMiddleware<Env, State>;
    }[];
    fn: TriFrostHandler<Env, State, TInput>;
    input: TFValidator<TInput, Env, State> | null;
    timeout: number | null;
    kind: TriFrostContextKind;
    method: HttpMethod;
    bodyParser: TriFrostBodyParserOptions | null;
    name: string;
    description: string | null;
    meta: Record<string, unknown> | null;
};

/** Groupers (subrouter handlers) */
export type TriFrostGrouper<Env extends Record<string, any>, State extends Record<string, unknown> = {}> = (
    router: TriFrostRouter<Env, State>,
) => Promisify<void | TriFrostRouter<Env, State>>;

export type TriFrostGrouperConfig<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}> = Pick<
    TriFrostRouterOptions<Env, State>,
    'timeout'
> & {fn: TriFrostGrouper<Env, State>};

export type TriFrostGrouperHandler<Env extends Record<string, any>, State extends Record<string, unknown> = {}> =
    | TriFrostGrouper<Env, State>
    | TriFrostGrouperConfig<Env, State>;

/** Route builder handler */
export type TriFrostRouteBuilderHandler<Env extends Record<string, any>, State extends Record<string, unknown> = {}> = (
    route: Route<Env, State>,
) => void;

/** Router options */
export type TriFrostRouterOptions<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}> = {
    /**
     * Tree passed by root router to register routes onto
     */
    tree: RouteTree<Env>;
    /**
     * Path for the router
     */
    path: string;
    /**
     * Maximum timeout in milliseconds for this router and sub routers
     * (defaults to 30 000)
     */
    timeout: number | null;
    /**
     * Middleware chain for this router and sub routers
     */
    middleware: TriFrostMiddleware<Env, State>[];
    /**
     * Global Rate Limit instance or null
     */
    rateLimit: Lazy<TriFrostRateLimit, Env> | null;
    /**
     * Body Parser Config
     */
    bodyParser: TriFrostBodyParserOptions | null;
};

/** Router interface */
export type TriFrostRouter<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}> = {
    get path(): string;
    get timeout(): number | null | undefined;

    use: <Patch extends Record<string, unknown> = {}>(val: TriFrostMiddleware<Env, State, Patch>) => TriFrostRouter<Env, State & Patch>;

    /**
     * Attach a rate limit to this router
     */
    limit: (limit: number | TriFrostRateLimitLimitFunction<Env, State>) => TriFrostRouter<Env, State>;

    group: <Path extends string = string>(
        path: Path,
        handler: TriFrostGrouperHandler<Env, State & PathParam<Path>>,
    ) => TriFrostRouter<Env, State>;

    route: <Path extends string = string>(
        path: Path,
        handler: TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>,
    ) => TriFrostRouter<Env, State>;

    onNotFound: (fn: TriFrostHandler<Env, State>) => TriFrostRouter<Env, State>;
    onError: (fn: TriFrostHandler<Env, State>) => TriFrostRouter<Env, State>;

    get<
        Path extends string = string,
        TV extends TFValidator<any, Env, State & PathParam<Path>> = TFValidator<any, Env, State & PathParam<Path>>,
    >(
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>, TV>,
    ): TriFrostRouter<Env, State>;

    post<
        Path extends string = string,
        TV extends TFValidator<any, Env, State & PathParam<Path>> = TFValidator<any, Env, State & PathParam<Path>>,
    >(
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>, TV>,
    ): TriFrostRouter<Env, State>;

    put<
        Path extends string = string,
        TV extends TFValidator<any, Env, State & PathParam<Path>> = TFValidator<any, Env, State & PathParam<Path>>,
    >(
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>, TV>,
    ): TriFrostRouter<Env, State>;

    patch<
        Path extends string = string,
        TV extends TFValidator<any, Env, State & PathParam<Path>> = TFValidator<any, Env, State & PathParam<Path>>,
    >(
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>, TV>,
    ): TriFrostRouter<Env, State>;

    del<
        Path extends string = string,
        TV extends TFValidator<any, Env, State & PathParam<Path>> = TFValidator<any, Env, State & PathParam<Path>>,
    >(
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>, TV>,
    ): TriFrostRouter<Env, State>;

    /** Health doesn’t take a validator */
    health<Path extends string = string>(path: Path, handler: TriFrostHandler<Env, State & PathParam<Path>>): TriFrostRouter<Env, State>;
};

/**
 * Represents a match result when a route is found
 */
export type TriFrostRouteMatch<Env extends Record<string, any> = {}> = {
    path: string;
    route: TriFrostRoute<Env>;
    params: Record<string, string>;
};
