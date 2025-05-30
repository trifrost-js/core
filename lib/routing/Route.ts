/* eslint-disable @typescript-eslint/no-empty-object-type */

import {
    type TriFrostMiddleware,
    type TriFrostRouteHandler,
} from '../types/routing';
import {HttpMethods, type HttpMethod} from '../types/constants';
import {
    type TriFrostRateLimit,
    type TriFrostRateLimitLimitFunction,
} from '../modules/RateLimit/_RateLimit';
import {
    isValidHandler,
    isValidLimit,
    isValidMiddleware,
} from './util';

export class Route <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
> {

    /* Array of middleware for this route */
    #middleware: TriFrostMiddleware<Env, State>[] = [];

    /* Route Methods */
    #routes:Record<HttpMethod, {
        handler: TriFrostRouteHandler<Env, State>,
        middleware: TriFrostMiddleware<Env, State>[],
    }> = Object.create(null);

    /* Configured Rate limit instance from the app */
    #rateLimit:TriFrostRateLimit<Env>|null = null;

    constructor (options:{rateLimit?:TriFrostRateLimit<Env>|null;}) {
        if (options.rateLimit) this.#rateLimit = options.rateLimit;
    }

    /**
     * Returns the built routes
     */
    get stack () {
        const acc:{
            middleware:TriFrostMiddleware<Env, State>[];
            handler:TriFrostRouteHandler<Env, State>;
            methods: HttpMethod[];
        }[] = [];
        for (const method in this.#routes) {
            const el = this.#routes[method as HttpMethod];
            acc.push({methods: [method as HttpMethod], handler: el.handler, middleware: el.middleware});
        }
        return acc;
    }

    /**
     * Attach middleware to this route
     */
    use <Patch extends Record<string, unknown> = {}> (
        val:TriFrostMiddleware<Env, State, Patch>
    ):Route<Env, State & Patch> {
        if (!isValidMiddleware<Env, State>(val)) throw new Error('TriFrostRoute@use: Handler is expected');
        this.#middleware.push(val);
        return this as Route<Env, State & Patch>;
    }

    /**
     * Attach a limit middleware to this route
     */
    limit (
        limit: number | TriFrostRateLimitLimitFunction<Env, State>
    ):Route<Env, State> {
        if (!this.#rateLimit) throw new Error('TriFrostRoute@limit: RateLimit is not configured on App');
        if (!isValidLimit<Env, State>(limit)) throw new Error('TriFrostRoute@limit: Invalid limit');

        this.use(this.#rateLimit.limit<Env, State>(limit));
        return this;
    }

    /**
     * Configure a HTTP Get route
     */
    get (handler: TriFrostRouteHandler<Env, State>) {
        if (!isValidHandler<Env, State>(handler)) throw new Error('TriFrostRoute@get: Invalid handler');
        this.#routes[HttpMethods.GET] = {handler, middleware: [...this.#middleware]};
        this.#routes[HttpMethods.HEAD] = {handler, middleware: [...this.#middleware]};
        return this;
    }

    /**
     * Configure a HTTP Post route
     */
    post (handler: TriFrostRouteHandler<Env, State>) {
        if (!isValidHandler<Env, State>(handler)) throw new Error('TriFrostRoute@post: Invalid handler');
        this.#routes[HttpMethods.POST] = {handler, middleware: [...this.#middleware]};
        return this;
    }

    /**
     * Configure a HTTP Put route
     */
    put (handler: TriFrostRouteHandler<Env, State>) {
        if (!isValidHandler<Env, State>(handler)) throw new Error('TriFrostRoute@put: Invalid handler');
        this.#routes[HttpMethods.PUT] = {handler, middleware: [...this.#middleware]};
        return this;
    }

    /**
     * Configure a HTTP Patch route
     */
    patch (handler: TriFrostRouteHandler<Env, State>) {
        if (!isValidHandler<Env, State>(handler)) throw new Error('TriFrostRoute@patch: Invalid handler');
        this.#routes[HttpMethods.PATCH] = {handler, middleware: [...this.#middleware]};
        return this;
    }

    /**
     * Configure a HTTP Delete route
     */
    del (handler: TriFrostRouteHandler<Env, State>) {
        if (!isValidHandler<Env, State>(handler)) throw new Error('TriFrostRoute@del: Invalid handler');
        this.#routes[HttpMethods.DELETE] = {handler, middleware: [...this.#middleware]};
        return this;
    }

}
