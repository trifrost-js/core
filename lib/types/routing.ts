/* eslint-disable no-use-before-define,@typescript-eslint/no-empty-object-type,@typescript-eslint/no-unused-vars */

import {
    type TriFrostRateLimitLimitFunction,
    type TriFrostRateLimit,
} from '../modules/RateLimit/_RateLimit';
import {type Route} from '../Route';
import {
    type HttpMethod,
    Sym_TriFrostDescription,
    Sym_TriFrostLoggerMeta,
    Sym_TriFrostMeta,
    Sym_TriFrostMethod,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from './constants';
import {
    type TriFrostContext,
    type TriFrostContextKind,
} from './context';

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
            : {};

export type TriFrostMiddleware <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
    Patch extends Record<string, unknown> = {}
> = ((ctx: TriFrostContext<Env, State>) => void|TriFrostContext<Env, State & Patch>|Promise<void|TriFrostContext<Env, State & Patch>>) & {
    [Sym_TriFrostType]?: TriFrostType;
    [Sym_TriFrostDescription]?: string;
    [Sym_TriFrostName]?: string;
};

export type TriFrostHandler<
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {},
> = (ctx: TriFrostContext<Env, State>) => void | Promise<void>;

export type TriFrostHandlerConfig<
  Env extends Record<string, any> = {},
  State extends Record<string, unknown> = {}
> = {
  fn: TriFrostHandler<Env, State>;
  name?: string;
  description?: string;
  timeout?: number|null;
  kind?: TriFrostContextKind;
  meta?: Record<string, unknown>;
  middleware?: TriFrostMiddleware<Env, State>[];
};

export type TriFrostRouteHandler<
  Env extends Record<string, any>,
  State extends Record<string, unknown> = {},
> =
  | TriFrostHandler<Env, State>
  | TriFrostHandlerConfig<Env, State>;

export type TriFrostRoute <
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {}
> = {
    path                    : string;
    middleware              : TriFrostMiddleware<Env, State>[];
    limit                   : TriFrostMiddleware<Env, State>|null;
    fn                      : TriFrostHandler<Env, State>;
    timeout?                : number | null;
    kind                    : TriFrostContextKind;
    [Sym_TriFrostMethod]      : HttpMethod;
    [Sym_TriFrostType]        : TriFrostType;
    [Sym_TriFrostName]        : string;
    [Sym_TriFrostDescription] : string | null;
    [Sym_TriFrostMeta]        : Record<string, unknown>;
    [Sym_TriFrostLoggerMeta]  : Record<string, unknown>;
};

export type TriFrostGrouper<
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {},
> = (router: TriFrostRouter<Env, State>) => void|Promise<void>|TriFrostRouter<Env,State>|Promise<TriFrostRouter<Env,State>>;

export type TriFrostGrouperConfig<
  Env extends Record<string, any> = {},
  State extends Record<string, unknown> = {}
> = TriFrostRouterOptions<Env> & {fn: TriFrostGrouper<Env, State>;};

export type TriFrostGrouperHandler<
  Env extends Record<string, any>,
  State extends Record<string, unknown> = {},
> =
  | TriFrostGrouper<Env, State>
  | TriFrostGrouperConfig<Env, State>;

export type TriFrostRouteBuilderHandler <
  Env extends Record<string, any>,
  State extends Record<string, unknown> = {},
> = (route: Route<Env, State>) => void;

export type TriFrostRouterOptions <Env extends Record<string, any>> = {
    /**
     * Maximum timeout in milliseconds for this router and sub routers
     * (defaults to 30 000)
     */
    timeout?: number|null;
    /**
     * Global Rate Limit instance or null
     */
    rateLimit: TriFrostRateLimit<Env>|null;
};

export type TriFrostRouter <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
> = {
    get path ():string;
    get middleware ():Readonly<TriFrostMiddleware<Env, State>[]>;
    get limitware (): Readonly<TriFrostMiddleware<Env, State>|null>;
    get $notfound ():TriFrostHandler<Env, State>|null;
    get routers ():Readonly<TriFrostRouter<Env, State>[]>;
    get routes ():Readonly<TriFrostRoute<Env, State>[]>;
    get timeout ():number|null|undefined;

    use: <Patch extends Record<string, unknown> = {}> (
        val: TriFrostRouter<Env, State> | TriFrostMiddleware<Env, State, Patch>
    ) => TriFrostRouter<Env, State & Patch>;

    /**
     * Attach a rate limit to this router
     */
    limit: (limit: number|TriFrostRateLimitLimitFunction<Env, State>) => TriFrostRouter<Env, State>;

    group: <Path extends string = string> (
        path: Path,
        handler: TriFrostGrouperHandler<Env, State & PathParam<Path>>
    ) => TriFrostRouter<Env, State>;

    route: <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>
    ) => TriFrostRouter<Env, State>;

    notfound: (fn:TriFrostHandler<Env, State>) => TriFrostRouter<Env, State>;

    get: <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) => TriFrostRouter<Env, State>;

    post: <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) => TriFrostRouter<Env, State>;

    put: <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) => TriFrostRouter<Env, State>;

    patch: <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) => TriFrostRouter<Env, State>;

    del: <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) => TriFrostRouter<Env, State>;
};
