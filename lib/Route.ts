/* eslint-disable @typescript-eslint/no-empty-object-type */

import {
    type TriFrostMiddleware,
    type TriFrostRouteHandler,
} from './types/routing';
import {type HttpMethod} from './types/constants';
import {
    type TriFrostRateLimit,
    type TriFrostRateLimitLimitFunction,
} from './modules/RateLimit';

export class Route <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
> {

    /* Array of middleware for this route */
    #middleware: TriFrostMiddleware<Env, State>[] = [];

    /* Limit middleware for this route */
    #limit: TriFrostMiddleware<Env, State>|null = null;

    /* Route Methods */
    #routes:[HttpMethod[], TriFrostRouteHandler<Env, State>][] = [];

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
            limit:TriFrostMiddleware<Env, State>|null;
            handler:TriFrostRouteHandler<Env, State>;
            methods: HttpMethod[];
        }[] = [];
        for (let i = 0; i < this.#routes.length; i++) {
            const el = this.#routes[i];
            acc.push({
                methods: el[0],
                handler: el[1],
                limit: this.#limit,
                middleware: this.#middleware,
            });
        }
        return acc;
    }

    /**
     * Attach middleware to this route
     */
    use <Patch extends Record<string, unknown> = {}> (
        val:TriFrostMiddleware<Env, State, Patch>
    ):Route<Env, State & Patch> {
        this.#middleware.push(val);
        return this as Route<Env, State & Patch>;
    }

    /**
     * Attach a rate limit to this route
     */
    limit (
        limit: number | TriFrostRateLimitLimitFunction<Env, State>
    ):Route<Env, State> {
        if (!this.#rateLimit) throw new Error('TriFrostRoute: RateLimit is not configured on App');

        this.#limit = this.#rateLimit.limit<Env, State>(limit);
        return this;
    }

    /**
     * Finalize with a GET method
     */
    get (handler: TriFrostRouteHandler<Env, State>) {
        this.#routes.push([['get', 'head'], handler]);
    }

    /**
     * Finalize with a POST method
     */
    post (handler: TriFrostRouteHandler<Env, State>) {
        this.#routes.push([['post'], handler]);
    }

    /**
     * Finalize with a PUT method
     */
    put (handler: TriFrostRouteHandler<Env, State>) {
        this.#routes.push([['put'], handler]);
    }

    /**
     * Finalize with a PATCH method
     */
    patch (handler: TriFrostRouteHandler<Env, State>) {
        this.#routes.push([['patch'], handler]);
    }

    /**
     * Finalize with a DELETE method
     */
    del (handler: TriFrostRouteHandler<Env, State>) {
        this.#routes.push([['del'], handler]);
    }

}
