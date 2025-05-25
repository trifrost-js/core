/* eslint-disable complexity, @typescript-eslint/no-empty-object-type */

import {isBoolean} from '@valkyriestudios/utils/boolean';
import {memoize} from '@valkyriestudios/utils/caching';
import {isIntBetween} from '@valkyriestudios/utils/number';
import {isObject} from '@valkyriestudios/utils/object';
import {isNeString} from '@valkyriestudios/utils/string';
import {type TriFrostCache} from './modules/Cache';
import {type TriFrostCookieOptions} from './modules/Cookies';
import {
    type TriFrostRateLimit,
    type TriFrostRateLimitLimitFunction,
} from './modules/RateLimit/_RateLimit';
import {
    TriFrostRootLogger,
    type TriFrostLoggerExporter,
} from './modules/Logger';
import {Sym_TriFrostSpan} from './modules/Logger/util';
import {Router} from './Router';
import {getRuntime} from './runtimes/Runtime';
import {
    type TriFrostRuntime,
    type TriFrostRuntimeOnIncoming,
} from './runtimes/types';
import {MemoryCache} from './storage/Memory';
import {
    type TriFrostRouter,
    type TriFrostMiddleware,
    type TriFrostGrouperHandler,
    type TriFrostHandler,
    type TriFrostRoute,
    type TriFrostRouteHandler,
    type PathParam,
    type TriFrostRouteBuilderHandler,
} from './types/routing';
import {
    type TriFrostContext,
    type TriFrostContextIdOptions,
} from './types/context';
import {
    type HttpMethod,
    HttpMethods,
    Sym_TriFrostName,
    Sym_TriFrostMeta,
    Sym_TriFrostDescription,
    Sym_TriFrostMethod,
    Sym_TriFrostType,
    Sym_TriFrostPath,
    Sym_TriFrostParams,
    Sym_TriFrostLoggerMeta,
} from './types/constants';
import {type LazyInitFn} from './utils/Lazy';

const RGX_WILDCARD  = /\*/g;
const RGX_PARAM     = /:[^/]+/g;
const RGX_SLASH     = /\/{2,}/g;
const RGX_RID       = /^[a-z0-9-]{8,100}$/i;

type AppOptions <Env extends Record<string, any>> = {
    /**
     * Name of the application
     * @note This gets included in trace information under service.name
     */
    name?:string;
    /**
     * Version of the application
     * @note This gets included in trace information under service.version
     */
    version?:string;
    /**
     * Meta of the application
     * @note This gets included in trace information
     */
    meta?:Record<string, unknown>|null;
    cookies?:{
        /**
         * Global cookie defaults
         * (defaults to {
         *  path: '/',
         *  secure: true,
         *  httpOnly: true,
         *  sameSite: 'Strict',
         *  domain: (configured app host IF set)
         * })
         */
        config: Partial<TriFrostCookieOptions>;
    };
    /**
     * Rate Limiter instance
     */
    rateLimit?:TriFrostRateLimit<Env>;
    /**
     * Cache instance
     */
    cache?:TriFrostCache<Env>;
    /**
     * Tracing Setup
     */
    tracing?: {
        /**
         * Logger to use
         * @note If none are provided we internally fallback to a Logger with runtime-default exporter
         */
        exporters?: LazyInitFn<TriFrostLoggerExporter[], Env>;
        /**
         * Request ID options for use in traces/log and distributed tracing
         */
        requestId?: TriFrostContextIdOptions;
    };
    /**
     * Whether or not debug is enabled
     */
    debug?:boolean;
    /**
     * Global environment for the app
     */
    env?:Partial<Env>;
    /**
     * Host the application is running on, this is used inside of for example redirects.
     * @note If not provided we will fall back to determining host off of request headers
     */
    host?:string;
    /**
     * Custom Runtime
     * @note If not provided we will automatically determine the environment
     */
    runtime?:TriFrostRuntime;
    /**
     * Maximum timeout in milliseconds globally
     * @note defaults to 30 000
     */
    timeout?:number|null;
    /**
     * Whether or not to trust proxy, eg: can we trust x-forwarded-for headers.
     * @note Different runtimes have different defaults.
     */
    trustProxy?:boolean;
}

type AppRouteTableEntry <
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {},
> = Omit<TriFrostRoute<Env, State>, 'fn' | 'middleware' | 'limit'> & {
    chain: (TriFrostMiddleware<Env, State>|TriFrostHandler<Env, State>)[];
    regex: RegExp;
    timeout: number | null;
    weight: number;
    [Sym_TriFrostPath]: string;
    [Sym_TriFrostParams]: string[];
};

type AppRouteTable<
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {},
> = Record<HttpMethod, {
        static: Map<string, AppRouteTableEntry<Env, State>>;
        dynamic: (AppRouteTableEntry<Env, State>)[];
    }>
    & {NOT_FOUND: (Omit<AppRouteTableEntry<Env, State>, typeof Sym_TriFrostMethod>)[];};

class App <
    Env extends Record<string, any>,
    State extends Record<string, unknown> = {},
> extends Router<Env, State> {

/**
 * MARK: Private Vars
 */

    /* Runtime instance */
    #runtime:TriFrostRuntime|null = null;

    /* App Name */
    #name:string = 'TriFrost';

    /* App Version */
    #version:string = '1.0.0';

    /* App Meta (for use in tracing) */
    #meta:Record<string, unknown> = {};

    /* Logger instance */
    #logger:TriFrostRootLogger<Env>|null = null;

    /* Logger options */
    #exporters:LazyInitFn<TriFrostLoggerExporter[], Env>|null = null;

    /* Request ID config */
    #requestId:TriFrostContextIdOptions|null = {
        inbound: ['x-request-id', 'cf-ray'],
        outbound: 'x-request-id',
        validate: val => RGX_RID.test(val),
    };

    /* Computed Route Table */
    #route_table:AppRouteTable<Env, State>|null = null;

    /* Whether or not the runtime has been started or not */
    #running:boolean = false;

    /* Global cookie defaults */
    #cookies:{config: Partial<TriFrostCookieOptions>};

    /* Global cache */
    #cache:TriFrostCache<Env>;

    /* Whether or not we should debug */
    #debug:boolean = false;

    /* Provided host */
    #host:string|null = null;

    /* Trust Proxy */
    #trustProxy:boolean|null = null;

    /* Environment */
    #env:Env;

/**
 * MARK: Constructor
 */

    constructor (options:AppOptions<Env> = {}) {
        /* Verify that the options passed are in the form of an object */
        if (!isObject(options)) throw new Error('TriFrost@ctor: options should be an object');

        super('', {
            timeout: 'timeout' in options ? options.timeout : 30_000,
            rateLimit: 'rateLimit' in options && options.rateLimit ? options.rateLimit : null,
        });

        /* Set runtime if provided */
        if (options.runtime) this.#runtime = options.runtime;

        /* Configure debug */
        if ('debug' in options) {
            if (!isBoolean(options.debug)) throw new Error('TriFrost@ctor: Debug not a boolean');
            this.#debug = options.debug;
        }

        /* Configure host */
        if ('host' in options) {
            if (!isNeString(options.host)) throw new Error('TriFrost@ctor: Host not a string with content');
            this.#host = options.host;
        }

        /* Configure trust proxy */
        if ('trustProxy' in options) {
            if (!isBoolean(options.trustProxy)) throw new Error('TriFrost@ctor: Trust Proxy not a boolean');
            this.#trustProxy = options.trustProxy;
        }

        /* Configure app name */
        if (isNeString(options.name)) this.#name = options.name.trim();

        /* Configure app version */
        if (isNeString(options.version)) this.#version = options.version.trim();

        /* Configure app meta */
        if (isObject(options.meta)) this.#meta = options.meta;

        /* Configure env */
        const globalEnv = (typeof (globalThis as any).env === 'object' ? (globalThis as any).env : {}) as Env;
        this.#env = {
            ...globalEnv,
            ...options.env || {},
        } as Env;

        /* Extract domain and configure cookie options */
        const domain:string|null = this.#extractDomainFromHost(this.#host);
        this.#cookies = {
            config: {
                ...domain !== null && {domain},
                ...isObject(options.cookies) ? options.cookies : {
                    path: '/',
                    secure: true,
                    httpOnly: true,
                    sameSite: 'Strict',
                },
            },
        };

        /* Cache */
        this.#cache = options.cache || new MemoryCache();

        /* Request ID */
        if (options.tracing) {
            if ('requestId' in options.tracing) this.#requestId = options.tracing.requestId || null;

            /* Logger options */
            this.#exporters = options.tracing.exporters || null;
        }
    }

/**
 * MARK: Getters
 */

    /**
     * Whether or not the server is running (started) or not
     */
    get isRunning ():boolean {
        return this.#running;
    }

    /**
     * Whether or not debug is enabled
     */
    get isDebugEnabled ():boolean {
        return this.#debug;
    }

    /**
     * Returns the configured host or null
     */
    get host ():string|null {
        return this.#host;
    }

/**
 * MARK: Methods
 */

    /**
     * Boot the app, configure the runtime and any runtime-specific bits
     * (such as listening for traffic, configuring workerd, etc)
     */
    async boot (options:{port?:number} = {}) {
        if (this.#running) return this;

        try {
            if (!this.#runtime) this.#runtime = await getRuntime();

            /* Instantiate default logger for runtime if none available yet */
            const exporter = this.#runtime.defaultExporter();

            this.#logger = new TriFrostRootLogger<Env>({
                name: this.#name,
                version: this.#version,
                debug: this.isDebugEnabled,
                rootExporter: exporter,
                exporters: (opts:{env:Env}) => [
                    ...this.#exporters ? this.#exporters(opts) : [exporter],
                ],
                trifrost: {
                    'runtime.name': this.#runtime.name,
                    ...this.#runtime.version !== null && {'runtime.version': this.#runtime.version},
                    ...this.#meta,
                },
            });

            this.#logger.debug('boot: Detected Runtime', {name: this.#runtime.name, version: this.#runtime.version});
            this.#running = true;

            const {
                routeMatcher,
                notfoundMatcher,
            } = this.#computeAndFinalizeRoutes();

            let resolved_env:Env|null = null;

            /* Start the runtime */
            await this.#runtime!.boot({
                logger: this.#logger as TriFrostRootLogger,
                cfg: Object.defineProperties({
                    cookies: this.#cookies.config,
                    cache: this.#cache as TriFrostCache,
                    host: this.#host,
                    port: isIntBetween(options?.port, 1, 65535) ? options?.port : 3000,
                    timeout: this.timeout ?? null,
                    requestId: this.#requestId,
                    env: null as unknown as Env,
                    ...this.#trustProxy !== null && {trustProxy: this.#trustProxy},
                }, {
                    env: {
                        get: () => {
                            if (resolved_env) return resolved_env;
                            resolved_env = Object.freeze({...this.#runtime!.env || {}, ...this.#env});
                            return resolved_env;
                        },
                        enumerable: true,
                    },
                }),
                onIncoming: (async (ctx:TriFrostContext<Env, State>) => {
                    const {path, method} = ctx;
                    this.#logger!.debug('onIncoming', {method, path});

                    /* Get matching route */
                    let match = routeMatcher(method, path);
                    try {
                        /* If we have no match check the notfound handlers */
                        if (!match) match = notfoundMatcher(path);

                        /* Generic 404 response if we still dont have anything */
                        if (!match) return ctx.status(404);

                        const name = Reflect.get(match.route, Sym_TriFrostName);

                        /* Add meta attributes to tracer */
                        ctx.logger.setAttributes(Reflect.get(match.route, Sym_TriFrostLoggerMeta));

                        /* Add matched http attributes to tracer */
                        ctx.logger.setAttributes({
                            'http.method': method,
                            'http.target': path,
                            'http.route': match.route[Sym_TriFrostPath],
                            'user_agent.original': ctx.headers['user-agent'] ?? '',
                        });

                        /* Initialize Timeout */
                        ctx.setTimeout(match.route.timeout);

                        /* Initialize context with matched route data */
                        await ctx.init({
                            name,
                            kind: match.route.kind,
                            params: match.params,
                        });

                        /* Run chain */
                        const last_idx = match.route.chain.length - 1;
                        for (let i = 0; i <= last_idx; i++) {
                            const fn = match.route.chain[i];
                            if (Reflect.get(fn, Sym_TriFrostSpan)) {
                                await fn(ctx);
                            } else {
                                await ctx.logger.span(
                                    last_idx === i ? name : Reflect.get(fn, Sym_TriFrostName) ?? `anonymous_${i}`,
                                    async () => fn(ctx as TriFrostContext<Env, State>)
                                );
                            }

                            /* If context is locked at this point, return as the route has been handled */
                            if (ctx.isLocked) return;
                        }

                        if (!ctx.isLocked) throw new Error('Handler did not respond');
                    } catch (err) {
                        ctx.logger.error(err);
                        ctx.abort(500);
                    } finally {
                        /* Flush logger last */
                        ctx.addAfter(() => ctx.logger.flush());

                        /* Run ctx cleanup */
                        ctx.runAfter();
                    }
                }) as TriFrostRuntimeOnIncoming,
            });

            /* Morph app class with runtime-specific exports, eg: workerd requires fetch globally defined */
            if (this.#runtime.exports) {
                Object.defineProperties(this, Object.getOwnPropertyDescriptors(this.#runtime.exports));
            }
        } catch (err) {
            if (this.#logger) this.#logger.error('boot: Runtime boot failed', {msg: (err as Error).message});
            this.#running = false;
        }

        return this;
    }

    /**
     * Stop the runtime and shutdown the app instance
     */
    shutdown () {
        if (!this.#running) {
            if (this.#logger) this.#logger.warn('Server is not running');
            return false;
        }

        try {
            this.#runtime!.shutdown();
            if (this.#logger) this.#logger.info('Server closed');
            this.#running = false;
            return true;
        } catch {
            if (this.#logger) this.#logger.info('Failed to close server');
            return false;
        }
    }

/**
 * MARK: Routing
 */

    /**
     * Add a router or middleware to the router
     */
    use <Patch extends Record<string, unknown> = {}> (
        val: TriFrostMiddleware<Env, State, Patch> | TriFrostRouter<Env, State>
    ): App<Env, State & Patch> {
        super.use(val);
        return this as App<Env, State & Patch>;
    }

    /**
     * Attach a rate limit to the middleware chain
     */
    limit (limit: number|TriFrostRateLimitLimitFunction<Env, State>) {
        super.limit(limit);
        return this;
    }

    /**
     * Add a subrouter with dynamic path handling.
     */
    group <Path extends string = string> (
        path: Path,
        handler: TriFrostGrouperHandler<Env, State & PathParam<Path>>
    ) {
        super.group(path, handler);
        return this;
    }

    /**
     * Add a subroute with a builder approach
     */
    route <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>
    ) {
        super.route(path, handler);
        return this;
    }

    /**
     * configure a catch-all not found handler for subroutes of this router
     *
     * @param {Handler} config - Configuration for the route
     */
    notfound (config:TriFrostHandler<Env, State>) {
        super.notfound(config);
        return this;
    }

    /**
     * Configure a HTTP Get route
     */
    get <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        super.get(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Post route
     */
    post <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        super.post(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Patch route
     */
    patch <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        super.patch(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Put route
     */
    put <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        super.put(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Delete route
     */
    del <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        super.del(path, handler);
        return this;
    }

/**
 * MARK: Private Fn
 */

    /**
     * Utility method to extract a domain from the host
     */
    #extractDomainFromHost (val:string|null) {
        if (typeof val !== 'string' || val === 'localhost' || /^[\d.]+$/.test(val)) return null;
        const match = val.match(/^(?:www\d?\.)?(?<domain>[\w-]+\.(?:[\w-]+\.\w+|\w+))$/i);
        if (isNeString(match?.groups?.domain)) return match.groups.domain;
        return null;
    }

    /**
     * Computes and finalizes the routes for matching, this includes:
     * 1. Computing the routes
     * 2. Sorting both the method routing table and the notfound handlers
     * 3. Creates and returns memoized route/notfound matchers
     */
    #computeAndFinalizeRoutes () {
        /* Compute routes */
        this.#route_table = this.#computeRoutes([this], this.path, [], 0);

        /* Sort dynamic routes by weight (higher first), we do this here to ensure we only sort them once */
        for (const method of Object.values(HttpMethods)) {
            if (!this.#route_table[method].dynamic.sort.length) continue;
            this.#route_table[method].dynamic.sort((a, b) => b.weight - a.weight);
        }

        /* Sort notfound routes by weight (higher first) */
        if (this.#route_table.NOT_FOUND.length) {
            this.#route_table.NOT_FOUND.sort((a, b) => b.weight - a.weight);
        }

        return {
            /* Memoized route matcher */
            routeMatcher: memoize(
                this.#matchRoute.bind(this),
                ((method:HttpMethod, path:string) => `${method}:${path}`) as (...args:unknown[]) => void,
                60000
            ),
            /* Memoized notfound matcher */
            notfoundMatcher: memoize(
                this.#matchNotfound.bind(this),
                undefined,
                60000
            ),
        };
    }

    /**
     * Recursively compute routes into routing table
     */
    #computeRoutes (
        routers: Readonly<TriFrostRouter<Env, State>[]>,
        parent_path: string,
        parent_middleware: Readonly<TriFrostMiddleware<Env, State>[]>,
        router_weight: number
    ): AppRouteTable<Env, State> {
        const route_table: AppRouteTable<Env, State> = {
            [HttpMethods.GET]: {static: new Map(), dynamic: []},
            [HttpMethods.POST]: {static: new Map(), dynamic: []},
            [HttpMethods.PUT]: {static: new Map(), dynamic: []},
            [HttpMethods.PATCH]: {static: new Map(), dynamic: []},
            [HttpMethods.HEAD]: {static: new Map(), dynamic: []},
            [HttpMethods.DELETE]: {static: new Map(), dynamic: []},
            [HttpMethods.OPTIONS]: {static: new Map(), dynamic: []},
            NOT_FOUND: [],
        };

        for (let z = 0; z < routers.length; z++) {
            const router = routers[z];
            const path = (parent_path + router.path).replace(RGX_SLASH, '/');

            /* Compute Middleware order */
            const middleware = [...parent_middleware] as TriFrostMiddleware<Env, State>[];
            for (let i = 0; i < router.middleware.length; i++) {
                middleware.push(router.middleware[i] as TriFrostMiddleware<Env, State>);
            }

            /* Process sub-routers */
            const sub_routers = router.routers;
            for (let i = 0; i < sub_routers.length; i++) {
                const sub_router = sub_routers[i];
                const sub_route_table = this.#computeRoutes([sub_router], path, middleware, router_weight + 1000);

                /* Merge static routes */
                for (const method of Object.values(HttpMethods)) {
                    /* Merge static routes */
                    sub_route_table[method].static.forEach((entry, route_path) => {
                        if (route_table[method].static.has(route_path)) {
                            if (this.#logger) this.#logger.warn('Route conflict: static route already exists - ignoring', {
                                parent_path,
                                route_path,
                                method,
                            });
                        } else {
                            route_table[method].static.set(route_path, entry);
                        }
                    });

                    /* Merge dynamic routes */
                    route_table[method].dynamic.push(...sub_route_table[method].dynamic);
                }

                /* Add subrouter's not found handler */
                if (sub_route_table.NOT_FOUND.length) route_table.NOT_FOUND.push(...sub_route_table.NOT_FOUND);
            }

            /* Process this router's routes */
            const routes = router.routes;
            const options:Map<string, {
                route: TriFrostRoute<Env, State>,
                dynamic:boolean;
                params: string[];
                regex:RegExp;
                methods:Set<HttpMethod>;
            }> = new Map();
            for (let i = 0; i < routes.length; i++) {
                const route         = routes[i];
                const method        = route[Sym_TriFrostMethod];
                const route_path    = (path + route.path).replace(RGX_SLASH, '/');
                const computedRgx   = this.#computeRouteRegex(route_path);

                const route_mware = [...middleware] as TriFrostMiddleware<Env, State>[];
                for (let y = 0; y < route.middleware.length; y++) {
                    route_mware.push(route.middleware[y] as TriFrostMiddleware<Env, State>);
                }

                if (route.limit) {
                    route_mware.push(route.limit);
                } else if (this.limitware) {
                    route_mware.push(this.limitware as TriFrostMiddleware<Env, State>);
                }

                const entry: AppRouteTableEntry<Env, State> = {
                    ...route,
                    [Sym_TriFrostPath]: route_path,
                    [Sym_TriFrostParams]: computedRgx.params,
                    timeout: route.timeout !== undefined ? route.timeout : this.timeout ?? null,
                    weight: this.#computeRouteWeight(route_path),
                    chain: [
                        ...route_mware,
                        route.fn,
                    ] as TriFrostHandler<Env, State>[],
                    regex: new RegExp(`^${computedRgx.rgx}$`),
                };

                /* Add to options map */
                if (!options.has(route_path)) {
                    options.set(route_path, {
                        dynamic: computedRgx.has_wildcard || computedRgx.has_params,
                        params: computedRgx.params,
                        regex: new RegExp(`^${computedRgx.rgx}$`),
                        methods: new Set([method]),
                        route,
                    });
                } else {
                    options.get(route_path)!.methods.add(method);
                }

                /* Distinguish between static and dynamic */
                if (!computedRgx.has_wildcard && !computedRgx.has_params) {
                    /* Handle conflicts (e.g., throw error, log warning, or overwrite) */
                    if (route_table[method].static.has(route_path)) {
                        if (this.#logger) this.#logger.warn('Route conflict: static route already exists - ignoring', {
                            parent_path,
                            route_path,
                            method,
                        });
                    } else {
                        route_table[method].static.set(route_path, entry);
                    }
                } else {
                    route_table[method].dynamic.push(entry);
                }
            }

            /* Add router's not found handler */
            this.#computeRoutesAddNotFound(route_table, middleware, router, parent_path);

            /* Generate options routes */
            this.#computeRoutesAddOptions(route_table, middleware, router, options);
        }

        return route_table;
    }

    /**
     * Based on the provided router adds not found route to routing table
     */
    #computeRoutesAddNotFound (
        route_table:AppRouteTable<Env, State>,
        middleware:TriFrostMiddleware<Env, State>[],
        router:TriFrostRouter<Env, State>,
        parent_path: string
    ) {
        if (!router.$notfound) return;

        const route_path = (parent_path + router.path).replace(RGX_SLASH, '/');
        const computedRgx = this.#computeRouteRegex(route_path);

        route_table.NOT_FOUND.push({
            chain: [...middleware, router.$notfound],
            regex: new RegExp(`^${computedRgx.rgx}(.*)$`),
            path: route_path,
            timeout: router.timeout !== undefined ? router.timeout : this.timeout ?? null,
            weight: this.#computeRouteWeight(route_path),
            kind: 'notfound',
            [Sym_TriFrostName]: '404notfound',
            [Sym_TriFrostDescription]: '404 Not Found Handler',
            [Sym_TriFrostType]: 'handler',
            [Sym_TriFrostPath]: route_path,
            [Sym_TriFrostLoggerMeta]: {name: '404notfound'},
            [Sym_TriFrostMeta]: {},
            [Sym_TriFrostParams]: computedRgx.params,
        });
    }

    /**
     * Based on the provided router and seen map automatically adds options routes to routing table
     */
    #computeRoutesAddOptions (
        route_table:AppRouteTable<Env, State>,
        middleware:TriFrostMiddleware<Env, State>[],
        router:TriFrostRouter<Env, State>,
        seen:Map<string, {
            route: TriFrostRoute<Env, State>,
            dynamic:boolean;
            params: string[];
            regex:RegExp;
            methods:Set<HttpMethod>;
        }>
    ) {
        if (!seen.size) return;

        /* Generate options routes */
        for (const [route_path, route_val] of seen) {
            const fn = function (ctx:TriFrostContext) {
                /* eslint-disable-next-line */
                /* @ts-ignore */
                ctx.setHeaders({Allow: this.allowed, Vary: 'Origin'}); /* eslint-disable-line no-invalid-this */
                ctx.status(204);
            };

            fn.allowed = [...route_val.methods].join(', ');

            const entry: AppRouteTableEntry<Env, State> = {
                ...route_val.route,
                chain: [...middleware, fn.bind(fn) as TriFrostHandler<Env, State>],
                regex: route_val.regex,
                timeout: router.timeout !== undefined ? router.timeout : this.timeout ?? null,
                weight: this.#computeRouteWeight(route_path),
                kind: 'options',
                [Sym_TriFrostMethod]: HttpMethods.OPTIONS,
                [Sym_TriFrostPath]: route_path,
                [Sym_TriFrostParams]: route_val.params,
            };

            if (!route_val.dynamic) {
                route_table[HttpMethods.OPTIONS].static.set(route_path, entry);
            } else {
                route_table[HttpMethods.OPTIONS].dynamic.push(entry);
            }
        }
    }

    /**
     * Computes the weight of a dynamic route path, higher weights
     * priotize the route in matching.
     * We prioritize static > hybrid > param > wildcard
     *
     * @param {string} path - Route path to compute the weight for
     */
    #computeRouteWeight (path:string):number {
        let weight = 0;
        let nr_segments = 0;

        const segments = path.split('/');
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            /* Ensure segment has content */
            if (typeof segment !== 'string' || !segment.length) continue;

            /* Increment nr of valid segments */
            nr_segments += 1;

            /* Wildcard segments get a lower weight */
            if (segment === '*') weight -= 5;
            /* Hybrid Wildcard - Other segment get low-to-moderate weight */
            else if (segment.indexOf('*') >= 0) weight += 5;
            /* Parameter segments get a moderate weight */
            else if (segment[0] === ':') weight += 10;
            /* Hybrid Parameter - Other segment gets a moderate-to-high weight */
            else if (segment.indexOf(':') >= 0) weight += 15;
            /* Static segments get the highest weight */
            else weight += 20;
        }

        /* Add a depth bonus for longer paths. */
        return weight + (nr_segments * 5);
    }

    /**
     * Computes a route regex
     *
     * @param {string} path - Path to compute for
     */
    #computeRouteRegex (path:string):{rgx:string; params:string[]; has_params:boolean; has_wildcard:boolean} {
        let regex_raw = path;

        /* Replace '*' with regex wildcard */
        const has_wildcard = path.indexOf('*') >= 0;
        if (has_wildcard) regex_raw = regex_raw.replace(RGX_WILDCARD, '.*');

        /* Handle path parameters */
        const has_params = path.indexOf(':') >= 0;
        if (has_params) regex_raw = regex_raw.replace(RGX_PARAM, '([^/]+)');

        return {
            rgx: regex_raw,
            params: has_params ? (path.match(RGX_PARAM) || []).map(key => key.substring(1)) : [],
            has_wildcard,
            has_params,
        };
    }

    /**
     * Match a route from the precomputed routing object.
     *
     * @param {HttpMethod} method - HTTP Method
     * @param {string} path - Path to match the route for
     */
    #matchRoute (method: HttpMethod, path: string) {
        if (!this.#route_table) return null;

        const method_table = this.#route_table[method];

        /* 1. Static match */
        const static_route = method_table.static.get(path);
        if (static_route) return {route: static_route, params: {}};

        /* 2. Dynamic match */
        for (let i = 0; i < method_table.dynamic.length; i++) {
            const route = method_table.dynamic[i];
            const match = route.regex.exec(path);
            if (match) {
                const params: Record<string, string> = {};
                for (let y = 0; y < route[Sym_TriFrostParams].length; y++) {
                    params[route[Sym_TriFrostParams][y]] = match[y + 1];
                }

                return {route, params};
            }
        }

        return null;
    }

    /**
     * Match the closest not found handler for a path
     *
     * @param {string} path - Path a notfound should be matched for
     */
    #matchNotfound (path: string):{
        params:Record<string, string>;
        route: AppRouteTableEntry<Env, State>
    }|null {
        if (!this.#route_table || !this.#route_table.NOT_FOUND.length) return null;

        /* Find the most specific handler for the path */
        for (let i = 0; i < this.#route_table.NOT_FOUND.length; i++) {
            const route = this.#route_table.NOT_FOUND[i];
            const match = route.regex.exec(path);
            if (match) {
                const params: Record<string, string> = {};
                for (let y = 0; y < route[Sym_TriFrostParams].length; y++) {
                    params[route[Sym_TriFrostParams][y]] = match[y + 1];
                }

                return {route, params} as {params:Record<string, string>; route: AppRouteTableEntry<Env, State>};
            }
        }

        return null;
    }

}

export {App, App as default};
