import {isIntGt} from '@valkyriestudios/utils/number';
import {isNeObject} from '@valkyriestudios/utils/object';
import {limitMiddleware, type TriFrostRateLimit, type TriFrostRateLimitLimitFunction} from '../modules/RateLimit/_RateLimit';
import {
    type TriFrostRoute,
    type TriFrostRouter,
    type TriFrostRouterOptions,
    type TriFrostMiddleware,
    type TriFrostGrouperHandler,
    type TriFrostGrouperConfig,
    type TriFrostHandler,
    type TriFrostHandlerConfig,
    type PathParam,
    type TriFrostRouteHandler,
    type TriFrostRouteBuilderHandler,
} from '../types/routing';
import {type HttpMethod, HttpMethods, Sym_TriFrostName} from '../types/constants';
import {Route} from './Route';
import {RouteTree} from './Tree';
import {isValidBodyParser, isValidGrouper, isValidHandler, isValidLimit, isValidMiddleware, normalizeMiddleware} from './util';
import {type TriFrostBodyParserOptions} from '../utils/BodyParser/types';
import {Lazy} from '../utils/Lazy';

const RGX_SLASH = /\/{2,}/g;

class Router<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}> implements TriFrostRouter<Env, State> {
    /* Base path for this router */
    #path: string;

    /* Configured Rate limit instance from the app */
    #rateLimit: Lazy<TriFrostRateLimit<Env>, Env> | null = null;

    /* Configured Body Parser options */
    #bodyParser: TriFrostBodyParserOptions | null = null;

    /* Timeout effective for this router and subrouters/routes */
    #timeout: number | null = null;

    /* Middleware */
    #middleware: TriFrostMiddleware<Env, State>[];

    /* Tree passed by parent */
    protected tree: RouteTree<Env>;

    constructor(options: TriFrostRouterOptions<Env, State>) {
        /* Check path */
        if (typeof options?.path !== 'string') throw new Error('TriFrostRouter@ctor: Path is invalid');

        /* Check timeout */
        if (options.timeout !== null && !isIntGt(options.timeout, 0)) throw new Error('TriFrostRouter@ctor: Timeout is invalid');

        /* Check rate limit instance */
        if (options.rateLimit !== null && !(options.rateLimit instanceof Lazy))
            throw new Error('TriFrostRouter@ctor: RateLimit is invalid');

        /* Check rate limit instance */
        if (!isValidBodyParser(options.bodyParser)) throw new Error('TriFrostRouter@ctor: BodyParser is invalid');

        /* Check tree */
        if (!(options.tree instanceof RouteTree)) throw new Error('TriFrostRouter@ctor: Tree is invalid');

        /* Check middleware */
        if (!Array.isArray(options.middleware)) throw new Error('TriFrostRouter@ctor: Middleware is invalid');

        /* Configure path */
        this.#path = options.path;

        /* Configure timeout */
        this.#timeout = options.timeout;

        /* Configure RateLimit instance */
        this.#rateLimit = options.rateLimit || null;

        /* Configure body parser */
        this.#bodyParser = options.bodyParser;

        /* Configure tree */
        this.tree = options.tree;

        /* Configure Middleware */
        this.#middleware = [...options.middleware];
    }

    /**
     * MARK: Getters
     */

    /**
     * Get the base path of this router
     */
    get path() {
        return this.#path;
    }

    /**
     * Returns the configured timeout
     */
    get timeout() {
        return this.#timeout;
    }

    /**
     * MARK: Methods
     */

    /**
     * Add a router or middleware to the router
     */
    use<Patch extends Record<string, unknown> = {}>(val: TriFrostMiddleware<Env, State, Patch>): TriFrostRouter<Env, State & Patch> {
        if (!isValidMiddleware<Env, State>(val)) throw new Error('TriFrostRouter@use: Handler is expected');

        const fn = val as TriFrostMiddleware<Env, State>;

        /* Get name */
        let name = Reflect.get(fn, Sym_TriFrostName) ?? fn.name;
        name = typeof name === 'string' && name.length ? name : 'anonymous';

        /* Add symbols for introspection/use further down the line */
        Reflect.set(fn, Sym_TriFrostName, name);

        this.#middleware.push(fn as TriFrostMiddleware<Env, State>);

        return this as TriFrostRouter<Env, State & Patch>;
    }

    /**
     * Attach a rate limit to the middleware chain for this router
     */
    limit(limit: number | TriFrostRateLimitLimitFunction<Env, State>) {
        if (!this.#rateLimit) throw new Error('TriFrostRouter@limit: RateLimit is not configured on App');
        if (!isValidLimit<Env, State>(limit)) throw new Error('TriFrostRouter@limit: Invalid limit');
        this.use(limitMiddleware<Env, State>(this.#rateLimit, limit));
        return this;
    }

    /**
     * Configure body parser options for this router
     */
    bodyParser(options: TriFrostBodyParserOptions | null) {
        if (!isValidBodyParser(options)) throw new Error('TriFrostRouter@bodyParser: Invalid bodyparser');
        this.#bodyParser = options;
        return this;
    }

    /**
     * Add a subrouter with dynamic path handling.
     */
    group<Path extends string = string>(path: Path, handler: TriFrostGrouperHandler<Env, State & PathParam<Path>>) {
        if (typeof path !== 'string') throw new Error('TriFrostRouter@group: Invalid path');
        if (!isValidGrouper<Env, State & PathParam<Path>>(handler)) throw new Error('TriFrostRouter@group: Invalid handler');

        /* Create config */
        const {fn, timeout = undefined} = (typeof handler === 'function' ? {fn: handler} : handler) as TriFrostGrouperConfig<
            Env,
            State & PathParam<Path>
        >;

        /* Run router */
        fn(
            new Router<Env, State & PathParam<Path>>({
                path: this.#path + path,
                tree: this.tree,
                rateLimit: this.#rateLimit,
                timeout: timeout !== undefined ? timeout : this.#timeout,
                middleware: this.#middleware as TriFrostMiddleware<Env, State & PathParam<Path>>[],
                bodyParser: this.#bodyParser,
            }),
        );

        return this;
    }

    /**
     * Add a subroute with a builder approach
     */
    route<Path extends string = string>(path: Path, handler: TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>) {
        if (typeof handler !== 'function') throw new Error('TriFrostRouter@route: No handler provided for "' + path + '"');

        /* Instantiate route builder */
        const route = new Route<Env, State & PathParam<Path>>({
            rateLimit: this.#rateLimit,
            bodyParser: this.#bodyParser,
        });

        /* Run route through handler */
        handler(route);

        /* Loop through resulting stack and register */
        for (let i = 0; i < route.stack.length; i++) {
            const el = route.stack[i];
            this.#register(path, [...el.middleware, el.handler], el.methods, el.bodyParser);
        }

        return this;
    }

    /**
     * Configure a catch-all not found handler for subroutes of this router
     *
     * @param {Handler} handler - Handler to run
     */
    onNotFound(handler: TriFrostHandler<Env, State>) {
        if (typeof handler !== 'function')
            throw new Error('TriFrostRoute@onNotFound: Invalid handler provided for router on "' + this.#path + '"');

        this.tree.addNotFound({
            path: this.#path + '/*',
            fn: handler as unknown as TriFrostHandler<Env, {}>,
            middleware: normalizeMiddleware<Env>(this.#middleware as TriFrostMiddleware<Env>[]),
            kind: 'notfound',
            timeout: this.#timeout,
            bodyParser: this.#bodyParser,
            name: 'notfound',
            description: '404 Not Found Handler',
            meta: null,
        });
        return this;
    }

    /**
     * Configure a catch-all error handler for subroutes of this router
     *
     * @param {Handler} handler - Handler to run
     */
    onError(handler: TriFrostHandler<Env, State>) {
        if (typeof handler !== 'function')
            throw new Error('TriFrostRoute@onError: Invalid handler provided for router on "' + this.#path + '"');

        this.tree.addError({
            path: this.#path + '/*',
            fn: handler as unknown as TriFrostHandler<Env, {}>,
            middleware: normalizeMiddleware<Env>(this.#middleware as TriFrostMiddleware<Env>[]),
            kind: 'error',
            timeout: this.#timeout,
            bodyParser: this.#bodyParser,
            name: 'error',
            description: 'Error Handler',
            meta: null,
        });
        return this;
    }

    /**
     * Configure a HTTP Get route
     */
    get<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        if (typeof path !== 'string') throw new Error('TriFrostRouter@get: Invalid path');
        if (!isValidHandler<Env, State & PathParam<Path>>(handler)) throw new Error('TriFrostRouter@get: Invalid handler');
        return this.#register(path, [handler], [HttpMethods.GET, HttpMethods.HEAD], this.#bodyParser);
    }

    /**
     * Configure a HTTP Post route
     */
    post<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        if (typeof path !== 'string') throw new Error('TriFrostRouter@post: Invalid path');
        if (!isValidHandler<Env, State & PathParam<Path>>(handler)) throw new Error('TriFrostRouter@post: Invalid handler');
        return this.#register(path, [handler], [HttpMethods.POST], this.#bodyParser);
    }

    /**
     * Configure a HTTP Put route
     */
    put<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        if (typeof path !== 'string') throw new Error('TriFrostRouter@put: Invalid path');
        if (!isValidHandler<Env, State & PathParam<Path>>(handler)) throw new Error('TriFrostRouter@put: Invalid handler');
        return this.#register(path, [handler], [HttpMethods.PUT], this.#bodyParser);
    }

    /**
     * Configure a HTTP Patch route
     */
    patch<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        if (typeof path !== 'string') throw new Error('TriFrostRouter@patch: Invalid path');
        if (!isValidHandler<Env, State & PathParam<Path>>(handler)) throw new Error('TriFrostRouter@patch: Invalid handler');
        return this.#register(path, [handler], [HttpMethods.PATCH], this.#bodyParser);
    }

    /**
     * Configure a HTTP Delete route
     */
    del<Path extends string = string>(path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        if (typeof path !== 'string') throw new Error('TriFrostRouter@del: Invalid path');
        if (!isValidHandler<Env, State & PathParam<Path>>(handler)) throw new Error('TriFrostRouter@del: Invalid handler');
        return this.#register(path, [handler], [HttpMethods.DELETE], this.#bodyParser);
    }

    /**
     * Configure a health route
     */
    health<Path extends string = string>(path: Path, handler: TriFrostHandler<Env, State & PathParam<Path>>) {
        return this.get(path, {
            kind: 'health',
            name: 'healthcheck',
            description: 'Healthcheck Route',
            fn: handler,
        });
    }

    /**
     * MARK: Private Fn
     */

    /**
     * Internal register route method
     */
    #register<Path extends string = string>(
        path: Path,
        handlers: unknown[],
        methods: HttpMethod[],
        bodyParser: TriFrostBodyParserOptions | null,
    ) {
        const fn = handlers[handlers.length - 1];
        const config = (Object.prototype.toString.call(fn) === '[object Object]' ? fn : {fn}) as TriFrostHandlerConfig<Env, State>;

        /* Path */
        const n_path = (this.#path + path.trim()).replace(RGX_SLASH, '/');

        /* Kind */
        const n_kind = typeof config.kind === 'string' && config.kind.length ? config.kind : 'std';

        /* Name */
        const n_name =
            typeof config.name === 'string' && config.name.length ? config.name : Reflect.get(config.fn, Sym_TriFrostName) || null;

        /* Description */
        const n_desc = typeof config.description === 'string' && config.description.length ? config.description : null;

        /* Timeout */
        const n_timeout = 'timeout' in config ? (config.timeout as number | null) : this.#timeout;

        /* Body Parser */
        const n_bodyparser = 'bodyParser' in config && isValidBodyParser(config.bodyParser!) ? config.bodyParser : bodyParser;

        /* Normalized middleware */
        const n_middleware = [
            /* Inherit router mware */
            ...normalizeMiddleware<Env, State>(this.#middleware),
            /* Route-specific mware */
            ...normalizeMiddleware<Env, State>(handlers.slice(0, -1) as TriFrostMiddleware<Env, State>[]),
            /* Potential config mware */
            ...normalizeMiddleware<Env, State>((config.middleware || []) as TriFrostMiddleware<Env, State>[]),
        ];

        for (let i = 0; i < methods.length; i++) {
            const method = methods[i];

            this.tree.add({
                name: n_name ? (method === 'HEAD' ? 'HEAD_' : '') + n_name : method + '_' + n_path,
                description: n_desc,
                meta: isNeObject(config.meta) ? config.meta : null,
                method,
                kind: n_kind,
                path: n_path,
                fn: config.fn as TriFrostHandler<Env>,
                middleware: n_middleware,
                timeout: n_timeout,
                bodyParser: n_bodyparser,
            } as unknown as TriFrostRoute<Env, State>);
        }

        return this;
    }
}

export {Router, Router as default};
