/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-empty-object-type */

import {isNeArray} from '@valkyriestudios/utils/array';
import {isFn} from '@valkyriestudios/utils/function';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isObject, isNeObject} from '@valkyriestudios/utils/object';
import {isString, isNeString} from '@valkyriestudios/utils/string';
import {
    type TriFrostRateLimit,
    type TriFrostRateLimitLimitFunction,
} from '../modules/RateLimit/_RateLimit';
import {
    type TriFrostRouter,
    type TriFrostRouterOptions,
    type TriFrostMiddleware,
    type TriFrostGrouperHandler,
    type TriFrostGrouperConfig,
    type TriFrostHandler,
    type TriFrostHandlerConfig,
    type PathParam,
    type TriFrostRoute,
    type TriFrostRouteHandler,
    type TriFrostRouteBuilderHandler,
} from '../types/routing';
import {
    type HttpMethod,
    HttpMethods,
    HttpMethodsSet,
    Sym_TriFrostDescription,
    Sym_TriFrostLoggerMeta,
    Sym_TriFrostMeta,
    Sym_TriFrostMethod,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../types/constants';
import {Route} from './Route';

class Router <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
> implements TriFrostRouter<Env, State> {

/**
 * MARK: Private Vars
 */

    /* Base path for this router */
    #path:string;

    /* Array of middleware for this router */
    #middleware:TriFrostMiddleware<Env, State>[] = [];

    /* Limit middleware for this router */
    #limit:TriFrostMiddleware<Env, State>|null = null;

    /* Contains the notfound route */
    #notfound:TriFrostHandler<Env, State>|null = null;

    /* Array of possible sub routers on this router */
    #routers:TriFrostRouter<Env, State>[] = [];

    /* Array of routes for this router */
    #routes:TriFrostRoute<Env, State>[] = [];

    /* Configured Timeout for the router */
    #timeout:number|null|undefined = undefined;

    /* Configured Rate limit instance from the app */
    #rateLimit:TriFrostRateLimit<Env>|null = null;

/**
 * MARK: Constructor
 */

    constructor (path:string, options:TriFrostRouterOptions<Env>) {
        if (!isString(path)) throw new Error('TriFrostRouter@ctor: Path is required');

        /* Verify that the options passed are in the form of an object */
        if (!isObject(options)) throw new Error('TriFrostRouter@ctor: options should be an object');

        /* Configure timeout */
        if ('timeout' in options) {
            if (
                !isIntGt(options.timeout, 0) &&
                options.timeout !== null
            ) throw new Error('TriFrostRouter@ctor: Timeout should be null or an integer above 0');
            this.#timeout = options.timeout;
        }

        if (options.rateLimit) {
            this.#rateLimit = options.rateLimit;
        }

        this.#path = path;
    }

/**
 * MARK: Getters
 */

    /**
     * Internal notfound getter
     */
    get $notfound ():TriFrostHandler<Env, State>|null {
        return this.#notfound;
    }

    /**
     * Get the base path of this router
     */
    get path () {
        return this.#path;
    }

    /**
     * Get middleware defined for this router
     */
    get middleware (): Readonly<TriFrostMiddleware<Env, State>[]> {
        return [...this.#middleware];
    }

    /**
     * Get limit defined for this router
     */
    get limitware (): Readonly<TriFrostMiddleware<Env, State>|null> {
        return this.#limit;
    }

    /**
     * Get sub-routers attached to this router
     */
    get routers (): Readonly<TriFrostRouter<Env, State>[]> {
        return [...this.#routers];
    }

    /**
     * Get routes defined in this router
     */
    get routes (): Readonly<TriFrostRoute<Env, State>[]> {
        return [...this.#routes];
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
        val: TriFrostRouter<Env, State> | TriFrostMiddleware<Env, State, Patch>
    ):TriFrostRouter<Env, State & Patch> {
        if (val instanceof Router) {
            this.#routers.push(val as TriFrostRouter<Env, State>);
        } else if (isFn(val)) {
            const fn = val as TriFrostMiddleware<Env, State>;

            /* Get name */
            let fn_name = Reflect.get(fn, Sym_TriFrostName) ?? fn.name;
            fn_name = isNeString(fn_name) ? fn_name : 'anonymous';

            /* Add symbols for introspection/use further down the line */
            fn[Sym_TriFrostName] = fn_name;
            fn[Sym_TriFrostType] = fn[Sym_TriFrostType] ?? 'middleware';

            this.#middleware.push(fn as TriFrostMiddleware<Env, State>);
        } else {
            throw new Error('TriFrostRouter@use: Either router or handler is expected');
        }

        return this as TriFrostRouter<Env, State & Patch>;
    }

    /**
     * Attach a rate limit to the middleware chain for this router
     */
    limit (limit: number | TriFrostRateLimitLimitFunction<Env, State>) {
        if (!this.#rateLimit) throw new Error('TriFrostRoute@limit: RateLimit is not configured on App');

        this.#limit = this.#rateLimit.limit<Env, State>(limit);
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
        const config = (isFn(handler)
            ? {fn: handler}
            : handler
        ) as TriFrostGrouperConfig<Env, State & PathParam<Path>>;
        if (!isFn(config.fn)) throw new Error('TriFrostRoute@group: Last argument must be a function or config object');

        /* Add our rate limit to the config */
        config.rateLimit = config.rateLimit || this.#rateLimit;

        /* Instantiate router */
        const router = new Router<Env, State & PathParam<Path>>(path, config);

        config.fn(router);
        this.#routers.push(router as unknown as TriFrostRouter<Env, State>);

        return this;
    }

    /**
     * Add a subroute with a builder approach
     */
    route <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteBuilderHandler<Env, State & PathParam<Path>>
    ) {
        if (!handler) throw new Error(`TriFrostRoute@route: No handler provided for "${path}"`);

        /* Instantiate route builder */
        const route = new Route<Env, State & PathParam<Path>>({
            rateLimit: this.#rateLimit,
        });

        handler(route);

        if (!route.stack.length) throw new Error('TriFrostRoute@route: Builder did not return valid routes');

        for (let i = 0; i < route.stack.length; i++) {
            const el = route.stack[i];
            this.#register(path, [...el.middleware, el.handler], el.methods, el.limit as TriFrostMiddleware<Env, State>|null);
        }

        return this;
    }

    /**
     * configure a catch-all not found handler for subroutes of this router
     *
     * @param {Handler} handler - Configuration for the route
     */
    notfound (fn:TriFrostHandler<Env, State>) {
        if (isFn(fn)) this.#notfound = fn;
        return this;
    }

    /**
     * Configure a HTTP Get route
     */
    get <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        if (!this.#register(
            path,
            [handler],
            [HttpMethods.GET, HttpMethods.HEAD]
        )) throw new Error('TriFrostRoute@get: Invalid payload for "' + path + '"');
        return this;
    }

    /**
     * Configure a HTTP Post route
     */
    post <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        if (!this.#register(
            path,
            [handler],
            [HttpMethods.POST]
        )) throw new Error('TriFrostRoute@post: Invalid payload for "' + path + '"');
        return this;
    }

    /**
     * Configure a HTTP Put route
     */
    put <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        if (!this.#register(
            path,
            [handler],
            [HttpMethods.PUT]
        )) throw new Error('TriFrostRoute@put: Invalid payload for "' + path + '"');
        return this;
    }

    /**
     * Configure a HTTP Patch route
     */
    patch <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        if (!this.#register(
            path,
            [handler],
            [HttpMethods.PATCH]
        )) throw new Error('TriFrostRoute@patch: Invalid payload for "' + path + '"');
        return this;
    }

    /**
     * Configure a HTTP Delete route
     */
    del <Path extends string = string> (
        path: Path,
        handler: TriFrostRouteHandler<Env, State & PathParam<Path>>
    ) {
        if (!this.#register(
            path,
            [handler],
            [HttpMethods.DELETE]
        )) throw new Error('TriFrostRoute@del: Invalid payload for "' + path + '"');
        return this;
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
        methods:HttpMethod[],
        limit?: TriFrostMiddleware<Env, State>|null
    ):boolean {
        if (!handlers.length) return false;

        const fn = handlers[handlers.length - 1];
        const middleware = handlers.slice(0, -1);
        const config = (isObject(fn) ? fn : {fn}) as TriFrostHandlerConfig<Env, State> & {limit?: TriFrostMiddleware<Env, State>|null};
        config.middleware = [
            ...middleware,
            ...config.middleware || [],
        ] as TriFrostMiddleware<Env, State>[];

        /* Validate route */
        if (
            !isString(path) ||
            !isFn(config.fn) ||
            !isNeArray(methods) ||
            !methods.every(val => HttpMethodsSet.has(val)) ||
            ('timeout' in config && !isIntGt(config.timeout, 0) && config.timeout !== null)
        ) return false;

        const n_path = path.trim();
        const kind = isNeString(config.kind) ? config.kind : 'std';
        const name = isNeString(config.name) ? config.name : Reflect.get(config.fn, Sym_TriFrostName) || null;
        const desc = isNeString(config.description) ? config.description : null;

        /* Timeout */
        const timeout:undefined|number|null = 'timeout' in config
            ? config.timeout
            : this.timeout !== undefined
                ? this.timeout
                : undefined;

        for (let i = 0; i < methods.length; i++) {
            const routeName = name || `${methods[i]}_${this.path}${n_path}`;
            const routeMeta = isNeObject(config.meta) ? config.meta : {};
            const loggerMeta = {
                name: routeName,
                kind,
                ...routeMeta,
            };

            this.#routes.push({
                [Sym_TriFrostType]        : 'handler',
                [Sym_TriFrostName]        : routeName,
                [Sym_TriFrostDescription] : desc,
                [Sym_TriFrostMeta]        : routeMeta,
                [Sym_TriFrostLoggerMeta]  : loggerMeta,
                [Sym_TriFrostMethod]      : methods[i],
                ...timeout !== undefined && {timeout},
                kind,
                path: n_path,
                fn: config.fn,
                middleware: config.middleware,
                limit: limit || config.limit || this.#limit,
            });
        }

        return true;
    }

}

export {Router, Router as default};
