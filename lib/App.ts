/* eslint-disable complexity, @typescript-eslint/no-empty-object-type */

import {isBoolean} from '@valkyriestudios/utils/boolean';
import {isIntBetween, isIntGt} from '@valkyriestudios/utils/number';
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
import {Router} from './routing/Router';
import {getRuntime} from './runtimes/Runtime';
import {
    type TriFrostRuntime,
    type TriFrostRuntimeOnIncoming,
} from './runtimes/types';
import {MemoryCache} from './storage/Memory';
import {
    type TriFrostMiddleware,
    type TriFrostGrouperHandler,
    type TriFrostHandler,
    type TriFrostRouteHandler,
    type PathParam,
    type TriFrostRouteBuilderHandler,
} from './types/routing';
import {
    type TriFrostContext,
    type TriFrostContextIdOptions,
} from './types/context';
import {
    Sym_TriFrostName,
    Sym_TriFrostMeta,
} from './types/constants';
import {type LazyInitFn} from './utils/Lazy';
import {RouteTree} from './routing/Tree';

const RGX_RID = /^[a-z0-9-]{8,100}$/i;

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

    /* Routing tree */
    #tree:RouteTree<Env>;

/**
 * MARK: Constructor
 */

    constructor (options:AppOptions<Env> = {}) {
        /* Verify that the options passed are in the form of an object */
        if (!isObject(options)) throw new Error('TriFrost@ctor: options should be an object');

        const tree = new RouteTree<Env>();

        super({
            path: '',
            timeout: options.timeout === null || isIntGt(options.timeout, 0) ? options.timeout : 30_000,
            rateLimit: 'rateLimit' in options && options.rateLimit ? options.rateLimit : null,
            tree: tree,
            middleware: [],
        });

        /* Set tree */
        this.#tree = tree;

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

            /* Triage handler */
            const onTriage = async (path:string, ctx:TriFrostContext<Env>) => {
                /* We're good, context is locked */
                if (ctx.isLocked) return;

                /* User might have forgotten to end ... */
                if (ctx.statusCode >= 200 && ctx.statusCode < 400) {
                    return ctx.end();
                } else if (ctx.statusCode === 404) {
                    /* Maybe end-user has a specific notfound handler for this */
                    const notfound = this.#tree.matchNotFound(path);
                    if (notfound) {
                        if (Reflect.get(notfound.route.fn, Sym_TriFrostSpan)) {
                            await notfound.route.fn(ctx);
                        } else {
                            await ctx.logger.span(
                                Reflect.get(notfound.route, Sym_TriFrostName) ?? 'anonymous_notfound_handler',
                                async () => notfound.route.fn(ctx)
                            );
                        }
                    }
                    
                    /* Let's just end it if still not locked */
                    if (!ctx.isLocked) return ctx.end();
                } else if (ctx.statusCode >= 400) {
                    /* Ok something's off ... let's see if we have a triage registered */
                    const error = this.#tree.matchError(path);
                    if (!error) return;
                    
                    if (Reflect.get(error.route.fn, Sym_TriFrostSpan)) {
                        await error.route.fn(ctx);
                    } else {
                        await ctx.logger.span(
                            Reflect.get(error.route, Sym_TriFrostName) ?? 'anonymous_error_handler',
                            async () => error.route.fn(ctx)
                        );
                    }
                }
            };

            /* Start the runtime */
            await this.#runtime!.boot({
                logger: this.#logger as TriFrostRootLogger,
                cfg: {
                    cookies: this.#cookies.config,
                    cache: this.#cache as TriFrostCache,
                    host: this.#host,
                    port: isIntBetween(options?.port, 1, 65535) ? options?.port : 3000,
                    requestId: this.#requestId,
                    env: this.#env as unknown as Env,
                    timeout: this.timeout,
                    ...this.#trustProxy !== null && {trustProxy: this.#trustProxy},
                },
                onIncoming: (async (ctx:TriFrostContext<Env, State>) => {
                    const {path, method} = ctx;
                    this.#logger!.debug('onIncoming', {method, path});

                    /* Get matching route */
                    let match = this.#tree.match(method, path);
                    try {
                        /* If we have no match check the notfound handlers */
                        if (!match) match = this.#tree.matchNotFound(path);

                        /* Generic 404 response if we still dont have anything */
                        if (!match) return ctx.status(404);

                        const name = Reflect.get(match.route, Sym_TriFrostName);

                        /* Add attributes to tracer */
                        ctx.logger.setAttributes({
                            ...Reflect.get(match.route, Sym_TriFrostMeta) || {},
                            'http.method': method,
                            'http.target': path,
                            'http.route': match.route.path,
                            'http.status_code': 200,
                            'otel.status_code': 'OK',
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
                        for (let i = 0; i < match.route.middleware.length; i++) {
                            const fn = match.route.middleware[i];
                            if (Reflect.get(fn, Sym_TriFrostSpan)) {
                                await fn(ctx);
                            } else {
                                await ctx.logger.span(
                                    Reflect.get(fn, Sym_TriFrostName) ?? `anonymous_${i}`,
                                    async () => fn(ctx as TriFrostContext<Env, State>)
                                );
                            }

                            /* If context is locked at this point, return as the route has been handled */
                            if (ctx.isLocked) return;
                        }

                        /* Run handler */
                        if (Reflect.get(match.route.fn, Sym_TriFrostSpan)) {
                            await match.route.fn(ctx);
                        } else {
                            await ctx.logger.span(name, async () => match!.route.fn(ctx as TriFrostContext<Env, State>));
                        }

                        /* Let's run triage if context is not locked */
                        if (!ctx.isLocked) await onTriage(path, ctx);
                
                        /* After error handler, check if finalized */
                        if (!ctx.isLocked) throw new Error('Error handler did not respond');
                    } catch (err) {
                        ctx.logger.error(err);

                        await onTriage(path, ctx);
                        if (!ctx.isLocked) ctx.abort(500);
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
    use <Patch extends Record<string, unknown> = {}> (val:TriFrostMiddleware<Env, State, Patch>):App<Env, State & Patch> {
        super.use(val);
        return this as App<Env, State & Patch>;
    }

    /**
     * Attach a rate limit to the middleware chain
     */
    limit (limit:number|TriFrostRateLimitLimitFunction<Env, State>) {
        super.limit(limit);
        return this;
    }

    /**
     * Add a subrouter with dynamic path handling.
     */
    group <Path extends string = string> (path:Path, handler:TriFrostGrouperHandler<Env, State & PathParam<Path>>) {
        super.group(path, handler);
        return this;
    }

    /**
     * Add a subroute with a builder approach
     */
    route <Path extends string = string> (path:Path, handler:TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>) {
        super.route(path, handler);
        return this;
    }

    /**
     * Configure a catch-all not found handler for subroutes of this router
     *
     * @param {Handler} handler - Handler to run
     */
    onNotFound (handler:TriFrostHandler<Env, State>) {
        super.onNotFound(handler);
        return this;
    }

    /**
     * Configure a catch-all error handler for subroutes of this router
     *
     * @param {Handler} handler - Handler to run
     */
    onError (handler:TriFrostHandler<Env, State>) {
        super.onError(handler);
        return this;
    }

    /**
     * Configure a HTTP Get route
     */
    get <Path extends string = string> (path:Path, handler:TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.get(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Post route
     */
    post <Path extends string = string> (path:Path, handler:TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.post(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Patch route
     */
    patch <Path extends string = string> (path:Path, handler:TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.patch(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Put route
     */
    put <Path extends string = string> (path:Path, handler:TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.put(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Delete route
     */
    del <Path extends string = string> (path:Path, handler:TriFrostRouteHandler<Env, State & PathParam<Path>>) {
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

}

export {App, App as default};
