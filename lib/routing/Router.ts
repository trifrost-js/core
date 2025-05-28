/* eslint-disable @typescript-eslint/no-empty-object-type */

import {isArray, isNeArray} from '@valkyriestudios/utils/array';
import {isFn} from '@valkyriestudios/utils/function';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isObject, isNeObject} from '@valkyriestudios/utils/object';
import {isString, isNeString} from '@valkyriestudios/utils/string';
import {
    type TriFrostRateLimit,
    type TriFrostRateLimitLimitFunction,
} from '../modules/RateLimit/_RateLimit';
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
import {
    type HttpMethod,
    HttpMethods,
    HttpMethodsSet,
    Sym_TriFrostDescription,
    Sym_TriFrostMeta,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../types/constants';
import {Route} from './Route';
import {RouteTree} from './Tree';

class Router <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
> implements TriFrostRouter<Env, State> {

/**
 * MARK: Private Vars
 */

    /* Base path for this router */
    #path:string;

    /* Configured Rate limit instance from the app */
    #rateLimit:TriFrostRateLimit<Env>|null = null;

    /* Tree passed by parent */
    #tree:RouteTree<Env>;

    /* Timeout effective for this router and subrouters/routes */
    #timeout:number|null = null;

    /* Middleware */
    #middleware:TriFrostMiddleware<Env, State>[];    

/**
 * MARK: Constructor
 */

    constructor (options:TriFrostRouterOptions<Env, State>) {
        /* Check path */
        if (!isString(options?.path)) throw new Error('TriFrostRouter@ctor: Path is invalid');

        /* Check timeout */
        if (
            options.timeout !== null &&
            !isIntGt(options.timeout, 0)
        ) throw new Error('TriFrostRouter@ctor: Timeout is invalid');

        /* Check rate limit instance */
        if (
            options.rateLimit !== null && 
            !isFn(options.rateLimit?.limit)
        ) throw new Error('TriFrostRouter@ctor: RateLimit is invalid');

        /* Check tree */
        if (
            !(options.tree instanceof RouteTree)
        ) throw new Error('TriFrostRouter@ctor: Tree is invalid');

        /* Check middleware */
        if (
            !isArray(options.middleware)
        ) throw new Error('TriFrostRouter@ctor: Middleware is invalid');

        /* Configure path */
        this.#path = options.path;

        /* Configure timeout */
        this.#timeout = options.timeout;

        /* Configure RateLimit instance */
        this.#rateLimit = options.rateLimit || null;

        /* Configure tree */
        this.#tree = options.tree;

        /* Configure Middleware */
        this.#middleware = [...options.middleware];
    }

/**
 * MARK: Getters
 */

    /**
     * Get the base path of this router
     */
    get path () {
        return this.#path;
    }

    /**
     * Returns the configured timeout
     */
    get timeout () {
        return this.#timeout;
    }

/**
 * MARK: Methods
 */

    /**
     * Add a router or middleware to the router
     */
    use <Patch extends Record<string, unknown> = {}> (
        val: TriFrostMiddleware<Env, State, Patch>
    ):TriFrostRouter<Env, State & Patch> {
        if (!isFn(val)) throw new Error('TriFrostRouter@use: Handler is expected');

        const fn = val as TriFrostMiddleware<Env, State>;

        /* Get name */
        let fn_name = Reflect.get(fn, Sym_TriFrostName) ?? fn.name;
        fn_name = isNeString(fn_name) ? fn_name : 'anonymous';

        /* Add symbols for introspection/use further down the line */
        Reflect.set(fn, Sym_TriFrostName, fn_name);
        Reflect.set(fn, Sym_TriFrostType, Reflect.get(fn, Sym_TriFrostType) ?? 'middleware');

        this.#middleware.push(fn as TriFrostMiddleware<Env, State>);

        return this as TriFrostRouter<Env, State & Patch>;
    }

    /**
     * Attach a rate limit to the middleware chain for this router
     */
    limit (limit: number | TriFrostRateLimitLimitFunction<Env, State>) {
        if (!this.#rateLimit) throw new Error('TriFrostRoute@limit: RateLimit is not configured on App');

        this.use(this.#rateLimit.limit<Env, State>(limit));
        return this;
    }

    /**
     * Add a subrouter with dynamic path handling.
     */
    group <Path extends string = string> (
        path: Path,
        handler: TriFrostGrouperHandler<Env, State & PathParam<Path>>
    ) {
        if (!handler) throw new Error('TriFrostRoute@group: No handler provided for "' + path + '"');

        /* Create config */
        const {fn, timeout = undefined} = (isFn(handler) ? {fn: handler} : handler) as TriFrostGrouperConfig<Env, State & PathParam<Path>>;
        if (!isFn(fn)) throw new Error('TriFrostRoute@group: Last argument must be a function or config object');
        
        /* Run router */
        fn(new Router<Env, State & PathParam<Path>>({
            path: this.#path + path,
            tree: this.#tree,
            rateLimit: this.#rateLimit,
            timeout: timeout !== undefined ? timeout : this.#timeout,
            middleware: this.#middleware as TriFrostMiddleware<Env, State & PathParam<Path>>[],
        }));

        return this;
    }

    /**
     * Add a subroute with a builder approach
     */
    route <Path extends string = string> (path: Path, handler: TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>) {
        if (!isFn(handler)) throw new Error('TriFrostRoute@route: No handler provided for "' + path + '"');

        /* Instantiate route builder */
        const route = new Route<Env, State & PathParam<Path>>({rateLimit: this.#rateLimit});

        /* Run route through handler */
        handler(route);

        /* Loop through resulting stack and register */
        for (let i = 0; i < route.stack.length; i++) {
            const el = route.stack[i];
            this.#register(path, [...el.middleware, el.handler], el.methods);
        }

        return this;
    }

    /**
     * configure a catch-all not found handler for subroutes of this router
     *
     * @param {Handler} handler - Configuration for the route
     */
    notfound (handler:TriFrostHandler<Env, State>) {
        if (!isFn(handler)) throw new Error('TriFrostRoute@notfound: Invalid handler provided for router on "' + this.#path + '"');

        this.#tree.addNotFound({
            path: this.#path + '/*',
            fn: handler as unknown as TriFrostHandler<Env, {}>,
            middleware: [...this.#middleware] as TriFrostMiddleware<Env>[],
            kind: 'notfound',
            timeout: this.#timeout,
            [Sym_TriFrostName]: '404notfound',
            [Sym_TriFrostDescription]: '404 Not Found Handler',
            [Sym_TriFrostType]: 'handler',
            [Sym_TriFrostMeta]: {},
        });
        return this;
    }

    /**
     * Configure a HTTP Get route
     */
    get <Path extends string = string> (path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        return this.#register(path, [handler], [HttpMethods.GET, HttpMethods.HEAD]);
    }

    /**
     * Configure a HTTP Post route
     */
    post <Path extends string = string> (path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        return this.#register(path, [handler], [HttpMethods.POST]);
    }

    /**
     * Configure a HTTP Put route
     */
    put <Path extends string = string> (path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        return this.#register(path, [handler], [HttpMethods.PUT]);
    }

    /**
     * Configure a HTTP Patch route
     */
    patch <Path extends string = string> (path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        return this.#register(path, [handler], [HttpMethods.PATCH]);
    }

    /**
     * Configure a HTTP Delete route
     */
    del <Path extends string = string> (path: Path, handler: TriFrostRouteHandler<Env, State & PathParam<Path>>) {
        return this.#register(path, [handler], [HttpMethods.DELETE]);
    }

/**
 * MARK: Private Fn
 */

    /**
     * Internal register route method
     */
    #register <Path extends string = string> (
        path:Path,
        handlers:unknown[],
        methods:HttpMethod[]
    ) {
        const fn = handlers[handlers.length - 1];
        const middleware = handlers.slice(0, -1) as TriFrostMiddleware<Env, State>[];
        const config = (isObject(fn) ? fn : {fn}) as TriFrostHandlerConfig<Env, State> & {limit?:TriFrostMiddleware<Env, State>|null};

        if (
            !isString(path) ||
            !isFn(config.fn) ||
            !isNeArray(methods) ||
            !methods.every(val => HttpMethodsSet.has(val)) ||
            ('timeout' in config && !isIntGt(config.timeout, 0) && config.timeout !== null)
        ) throw new Error('Router@register: Invalid route');

        const n_path = this.#path + path.trim();
        const n_kind = isNeString(config.kind) ? config.kind : 'std';
        const n_name = isNeString(config.name) ? config.name : Reflect.get(config.fn, Sym_TriFrostName) || null;
        const n_desc = isNeString(config.description) ? config.description : null;
        const n_timeout = 'timeout' in config ? (config.timeout as number|null) : this.#timeout;

        config.middleware = [
            /* Inherit router mware */
            ...this.#middleware,
            /* Route-specific mware */
            ...middleware,
            /* Potential config mware */
            ...config.middleware || [],
        ];

        for (const method of methods) {
            const n_route_name = n_name || (method + '_' + n_path);

            const routeObj:TriFrostRoute<Env> = {
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: n_route_name,
                [Sym_TriFrostDescription]: n_desc,
                [Sym_TriFrostMeta]: {name: n_route_name, kind: n_kind, ...isNeObject(config.meta) && config.meta},
                method,
                kind: n_kind,
                path: n_path,
                fn: config.fn as TriFrostHandler<Env>,
                middleware: config.middleware as TriFrostMiddleware<Env>[],
                timeout: n_timeout,
            };

            // Directly add the full route object to the tree
            this.#tree.add(routeObj);
        }

        return this;
    }

}

export {Router, Router as default};