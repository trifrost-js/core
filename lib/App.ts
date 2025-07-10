import {isIntGt} from '@valkyriestudios/utils/number';
import {isObject} from '@valkyriestudios/utils/object';
import {type TriFrostCache} from './modules/Cache';
import {type TriFrostCookieOptions} from './modules/Cookies';
import {type TriFrostRateLimit, type TriFrostRateLimitLimitFunction} from './modules/RateLimit/_RateLimit';
import {TriFrostRootLogger, type TriFrostLoggerExporter} from './modules/Logger';
import {Sym_TriFrostSpan} from './modules/Logger/util';
import {Router} from './routing/Router';
import {getRuntime} from './runtimes/Runtime';
import {type TriFrostRuntime, type TriFrostRuntimeOnIncoming} from './runtimes/types';
import {MemoryCache} from './storage/Memory';
import {
    type TriFrostMiddleware,
    type TriFrostGrouperHandler,
    type TriFrostHandler,
    type TriFrostRouteHandler,
    type PathParam,
    type TriFrostRouteBuilderHandler,
} from './types/routing';
import {type TriFrostContext, type TriFrostContextIdOptions} from './types/context';
import {type TriFrostBodyParserOptions} from './utils/BodyParser/types';
import {type LazyInitFn} from './utils/Lazy';
import {RouteTree} from './routing/Tree';
import {type createScript} from './modules';
import {mount as mountCss} from './modules/JSX/style/mount';
import {mount as mountScript} from './modules/JSX/script/mount';
import {type CssGeneric, type CssInstance} from './modules/JSX/style/use';

const RGX_RID = /^[a-z0-9-]{8,100}$/i;

type AppOptions<Env extends Record<string, any>> = {
    cookies?: {
        /**
         * Global cookie defaults
         * (defaults to {
         *  path: '/',
         *  secure: true,
         *  httpOnly: true,
         *  sameSite: 'Strict',
         * })
         */
        config: Partial<TriFrostCookieOptions>;
    };
    /**
     * Rate Limiter instance
     */
    rateLimit?: TriFrostRateLimit<Env>;
    /**
     * Cache instance
     */
    cache?: TriFrostCache<Env>;
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
     * Global environment for the app
     */
    env?: Partial<Env>;
    /**
     * Custom Runtime
     * @note If not provided we will automatically determine the environment
     */
    runtime?: TriFrostRuntime;
    /**
     * Maximum timeout in milliseconds globally
     * @note defaults to 30 000
     */
    timeout?: number | null;
    /**
     * Whether or not to trust proxy, eg: can we trust x-forwarded-for headers.
     * @note Different runtimes have different defaults.
     */
    trustProxy?: boolean;
    client?: {
        script?: ReturnType<typeof createScript>['script'];
        css?: CssGeneric<any>;
    };
};

class App<Env extends Record<string, any>, State extends Record<string, unknown> = {}> extends Router<Env, State> {
    /**
     * MARK: Private Vars
     */

    /* Runtime instance */
    #runtime: TriFrostRuntime | null = null;

    /* Logger instance */
    #logger: TriFrostRootLogger<Env> | null = null;

    /* Logger options */
    #exporters: LazyInitFn<TriFrostLoggerExporter[], Env> | null = null;

    /* Request ID config */
    #requestId: TriFrostContextIdOptions | null = {
        inbound: ['x-request-id', 'cf-ray'],
        outbound: 'x-request-id',
        validate: val => RGX_RID.test(val),
    };

    /* Whether or not the runtime has been started or not */
    #running: boolean = false;

    /* Global cookie defaults */
    #cookies: {config: Partial<TriFrostCookieOptions>};

    /* Global cache */
    #cache: TriFrostCache<Env>;

    /* Client-css instance */
    #css: CssInstance<any, any, any, any> | null = null;

    /* Client-script instance */
    #script: ReturnType<typeof createScript>['script'] | null = null;

    /* Trust Proxy */
    #trustProxy: boolean | null = null;

    /* Environment */
    #env: Env;

    /* Routing tree */
    #tree: RouteTree<Env>;

    /**
     * MARK: Constructor
     */

    constructor(options: AppOptions<Env> = {}) {
        /* Verify that the options passed are in the form of an object */
        if (!isObject(options)) throw new Error('TriFrost@ctor: options should be an object');

        const tree = new RouteTree<Env>();

        super({
            path: '',
            timeout: options.timeout === null || isIntGt(options.timeout, 0) ? options.timeout : 30_000,
            rateLimit: 'rateLimit' in options && options.rateLimit ? options.rateLimit : null,
            tree: tree,
            middleware: [],
            bodyParser: null,
        });

        /* Set tree */
        this.#tree = tree;

        /* Set runtime if provided */
        if (options.runtime) this.#runtime = options.runtime;

        /* Configure trust proxy */
        if ('trustProxy' in options) this.#trustProxy = !!options.trustProxy;

        /* Configure provided env, take note runtime-specifics will be added by runtime */
        this.#env = (isObject(options.env) ? options.env : {}) as Env;

        /* Extract domain and configure cookie options */
        this.#cookies = {
            config: (isObject(options.cookies)
                ? {...options.cookies}
                : {path: '/', secure: true, httpOnly: true, sameSite: 'Strict'}) as Partial<TriFrostCookieOptions>,
        };

        /* Cache */
        this.#cache = options.cache || new MemoryCache();

        /* Request ID */
        if (options.tracing) {
            if ('requestId' in options.tracing) this.#requestId = options.tracing.requestId || null;

            /* Logger options */
            this.#exporters = options.tracing.exporters || null;
        }

        /* Add script route */
        if (options.client?.script) {
            mountScript(this as unknown as Router, '/__atomics__/client.js', options.client.script);
            this.#script = options.client?.script;
        }

        /* Add css route */
        if (options.client?.css) {
            mountCss(this as unknown as Router, '/__atomics__/client.css', options.client.css as CssInstance<any, any, any, any>);
            this.#css = options.client.css as CssInstance<any, any, any, any>;
        }
    }

    /**
     * MARK: Getters
     */

    /**
     * Whether or not the server is running (started) or not
     */
    get isRunning(): boolean {
        return this.#running;
    }

    /**
     * MARK: Methods
     */

    /**
     * Boot the app, configure the runtime and any runtime-specific bits
     * (such as listening for traffic, configuring workerd, etc)
     */
    async boot(options: {port?: number} = {}) {
        if (this.#running) return this;

        try {
            if (!this.#runtime) this.#runtime = await getRuntime();

            this.#logger = new TriFrostRootLogger<Env>({
                runtime: this.#runtime,
                exporters: (opts: {env: Env}) => [
                    ...(this.#exporters
                        ? this.#exporters(opts) /* Use provided exporters */
                        : [this.#runtime!.defaultExporter(opts.env)]) /* Fallback to default exporter if none provided */,
                ],
            });

            this.#running = true;

            /* Triage handler */
            const runTriage = async (path: string, ctx: TriFrostContext<Env>) => {
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
                            await ctx.logger.span(notfound.route.name, async () => notfound.route.fn(ctx));
                        }
                    }

                    /* End it if still not locked */
                    if (!ctx.isLocked) return ctx.end();
                } else if (ctx.statusCode >= 400) {
                    /* Ok something's off ... let's see if we have a triage registered */
                    const error = this.#tree.matchError(path);
                    if (error) {
                        if (Reflect.get(error.route.fn, Sym_TriFrostSpan)) {
                            await error.route.fn(ctx);
                        } else {
                            await ctx.logger.span(error.route.name, async () => error.route.fn(ctx));
                        }
                    }

                    /* End it if still not locked */
                    if (!ctx.isLocked) return ctx.end();
                }
            };

            /* Start the runtime */
            await this.#runtime!.boot({
                logger: this.#logger as TriFrostRootLogger,
                cfg: {
                    cookies: this.#cookies.config,
                    cache: this.#cache as TriFrostCache,
                    requestId: this.#requestId,
                    env: this.#env as unknown as Env,
                    timeout: this.timeout,
                    ...(options?.port && {port: options.port}),
                    ...(this.#trustProxy !== null && {trustProxy: this.#trustProxy}),
                    ...(this.#css !== null && {css: this.#css as any}),
                    ...(this.#script !== null && {script: this.#script}),
                },
                onIncoming: (async (ctx: TriFrostContext<Env, State>) => {
                    const {path, method} = ctx;
                    this.#logger!.debug('onIncoming', {method, path});

                    /* Get matching route */
                    let match = this.#tree.match(method, path);
                    try {
                        /* If we have no match check the notfound handlers */
                        if (!match) {
                            match = this.#tree.matchNotFound(path);
                            if (match) ctx.setStatus(404);
                        }

                        /* Generic 404 response if we still dont have anything */
                        if (!match) return ctx.status(404);

                        /* Add route meta */
                        if (match.route.meta) ctx.logger.setAttributes(match.route.meta);

                        /* Add attributes to tracer */
                        ctx.logger.setAttributes({
                            'http.host': ctx.host,
                            'http.method': method,
                            'http.target': path,
                            'http.route': match.route.path,
                            'http.status_code': 200,
                            'otel.status_code': 'OK',
                            'user_agent.original': ctx.headers['user-agent'] ?? '',
                        });

                        /* Initialize Timeout */
                        ctx.setTimeout(match.route.timeout);

                        /* Initialize context with matched route data, check if triage is necessary (eg payload too large) */
                        await ctx.init(match);
                        if (ctx.statusCode >= 400) return await runTriage(path, ctx);

                        /* Run chain */
                        for (let i = 0; i < match.route.middleware.length; i++) {
                            const el = match.route.middleware[i];
                            if (Reflect.get(el.handler, Sym_TriFrostSpan)) {
                                await el.handler(ctx);
                            } else {
                                await ctx.logger.span(el.name, async () => el.handler(ctx as TriFrostContext<Env, State>));
                            }

                            /* If context is locked at this point, return as the route has been handled */
                            if (ctx.isLocked) return;

                            /* Check if triage is necessary */
                            if (ctx.statusCode >= 400) return await runTriage(path, ctx);
                        }

                        /* Run handler */
                        if (Reflect.get(match.route.fn, Sym_TriFrostSpan)) {
                            await match.route.fn(ctx);
                        } else {
                            await ctx.logger.span(match.route.name, async () => match!.route.fn(ctx as TriFrostContext<Env, State>));
                        }

                        /* Let's run triage if context is not locked */
                        if (!ctx.isLocked) await runTriage(path, ctx);
                    } catch (err) {
                        ctx.logger.error(err);

                        /* Ensure status code is set as 500 if not >= 400, this ensures proper triaging */
                        if (!ctx.isAborted && ctx.statusCode < 400) ctx.setStatus(500);

                        if (!ctx.isLocked) await runTriage(path, ctx);
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
    shutdown() {
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
    use<Patch extends Record<string, unknown> = {}>(val: TriFrostMiddleware<Env, State, Patch>): App<Env, State & Patch> {
        super.use(val);
        return this as App<Env, State & Patch>;
    }

    /**
     * Attach a rate limit to the middleware chain
     */
    limit(limit: number | TriFrostRateLimitLimitFunction<Env, State>) {
        super.limit(limit);
        return this;
    }

    /**
     * Configure body parser options
     */
    bodyParser(options: TriFrostBodyParserOptions | null) {
        super.bodyParser(options);
        return this;
    }

    /**
     * Add a subrouter with dynamic path handling.
     */
    group<Path extends string = string>(path: Path, handler: TriFrostGrouperHandler<Env, State & PathParam<Path>>) {
        super.group(path, handler);
        return this;
    }

    /**
     * Add a subroute with a builder approach
     */
    route<Path extends string = string>(path: Path, handler: TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>) {
        super.route(path, handler);
        return this;
    }

    /**
     * Configure a catch-all not found handler for subroutes of this router
     *
     * @param {Handler} handler - Handler to run
     */
    onNotFound(handler: TriFrostHandler<Env, State>) {
        super.onNotFound(handler);
        return this;
    }

    /**
     * Configure a catch-all error handler for subroutes of this router
     *
     * @param {Handler} handler - Handler to run
     */
    onError(handler: TriFrostHandler<Env, State>) {
        super.onError(handler);
        return this;
    }

    /**
     * Configure a HTTP Get route
     */
    get<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.get(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Post route
     */
    post<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.post(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Patch route
     */
    patch<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.patch(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Put route
     */
    put<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.put(path, handler);
        return this;
    }

    /**
     * Configure a HTTP Delete route
     */
    del<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        super.del(path, handler);
        return this;
    }
}

export {App, App as default};
