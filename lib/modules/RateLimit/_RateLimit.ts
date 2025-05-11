/* eslint-disable @typescript-eslint/no-empty-object-type */

import {isIntGt} from '@valkyriestudios/utils/number';
import {isFn} from '@valkyriestudios/utils/function';
import {isNeString, isString} from '@valkyriestudios/utils/string';
import {Lazy, type LazyInitFn} from '../../utils/Lazy';
import {type TriFrostContext} from '../../types/context';
import {type TriFrostStore} from '../_storage';
import {type TriFrostMiddleware} from '../../types/routing';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../types/constants';
import {
    type TriFrostRateLimitObject,
    type TriFrostRateLimitStrategizedStore,
} from './strategies/_Strategy';
import {Sliding} from './strategies/Sliding';
import {Fixed} from './strategies/Fixed';

/**
 * RateLimit strategies
 */

export type TriFrostRateLimitStrategy = 'fixed' | 'sliding';

/**
 * Key Generators
 */
export type TriFrostRateLimitKeyGeneratorVal = 'ip' | 'ip_name' | 'ip_method' | 'ip_name_method';

/**
 * RateLimitKeyGenerator is a function which generates the key for usage in rate limitting
 */
export type TriFrostRateLimitKeyGeneratorFn = (ctx:TriFrostContext) => string;

/**
 * Combined val and FN
 */
export type TriFrostRateLimitKeyGenerator = TriFrostRateLimitKeyGeneratorVal | TriFrostRateLimitKeyGeneratorFn;

/**
 * RateLimitLimitFunction is a function which returns the limit to use in rate limitting
 */
export type TriFrostRateLimitLimitFunction <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {}
> = (ctx:TriFrostContext<Env, State>) => number;

/**
 * RateLimitExceededFunction is a function which is used to customize the handling of exceeded behavior
 */
export type TriFrostRateLimitExceededFunction = (ctx:TriFrostContext) => void|Promise<void>;

/**
 * Prebuilt Key Gen Registry
 */
export const RateLimitKeyGeneratorRegistry:Record<TriFrostRateLimitKeyGeneratorVal, TriFrostRateLimitKeyGeneratorFn> = {
    ip              : ctx => ctx.ip || 'unknown',
    ip_name         : ctx => (ctx.ip || 'unknown') + ':' + ctx.name,
    ip_method       : ctx => (ctx.ip || 'unknown') + ':' + ctx.method,
    ip_name_method  : ctx => (ctx.ip || 'unknown') + ':' + ctx.name + ':' + ctx.method,
};

/**
 * TriFrost RateLimit Options
 */
export type TriFrostRateLimitOptions <Env extends Record<string, any> = {}> = {
    strategy? : TriFrostRateLimitStrategy;
    store     : LazyInitFn<TriFrostStore, Env>;
    window?   : number;
    keygen?   : TriFrostRateLimitKeyGenerator | TriFrostRateLimitKeyGeneratorFn;
    exceeded? : TriFrostRateLimitExceededFunction;
    headers?  : boolean;
};

export class TriFrostRateLimit <Env extends Record<string, any> = Record<string, any>> {

    #keygen:TriFrostRateLimitKeyGeneratorFn;

    #exceeded:TriFrostRateLimitExceededFunction;

    #store:Lazy<TriFrostRateLimitStrategizedStore, Env>;

    #headers:boolean;

    #strategy:TriFrostRateLimitStrategy;

    #window:number;

    constructor (options:TriFrostRateLimitOptions<Env>) {
        /* Define keygen or fallback to ip_name_method */
        this.#keygen = (isFn(options?.keygen)
            ? options.keygen
            : isString(options?.keygen)
                ? RateLimitKeyGeneratorRegistry[options.keygen]
                : RateLimitKeyGeneratorRegistry.ip_name_method) as TriFrostRateLimitKeyGeneratorFn;

        /* Define exceeded behavior */
        this.#exceeded = isFn(options?.exceeded)
            ? options.exceeded
            : (ctx:TriFrostContext) => ctx.status(429);

        /* Whether or not rate limit headers should be set (Defaults to true) */
        this.#headers = options?.headers !== false;

        /* Set strategy */
        this.#strategy = options?.strategy === 'sliding' ? 'sliding' : 'fixed';

        /* Set window */
        this.#window = isIntGt(options?.window, 0) ? options?.window : 60;

        /* Create lazy store */
        this.#store = new Lazy<TriFrostRateLimitStrategizedStore, Env>((opts:{env:Env}) => {
            switch (this.#strategy) {
                case 'sliding':
                    return new Sliding(this.#window, options.store(opts) as unknown as TriFrostStore<number[]>);
                default:
                    return new Fixed(this.#window, options.store(opts) as unknown as TriFrostStore<TriFrostRateLimitObject>);
            }
        });
    }

    protected get resolvedStore (): TriFrostRateLimitStrategizedStore|null {
        return this.#store?.resolved;
    }

    /**
     * The configured strategy type (default=fixed)
     */
    get strategy () {
        return this.#strategy;
    }

    /**
     * The configured window (default=60) in seconds
     */
    get window () {
        return this.#window;
    }

    /**
     * Creates a reusable "rate limit" middleware with a given limit.
     *
     * @param {number|TriFrostRateLimitLimitFunction} limit - The limit to use, either a number or a rate limit function
     */
    limit <
        E extends Env = Env,
        S extends Record<string, unknown> = {},
    > (limit:number|TriFrostRateLimitLimitFunction<E, S>):TriFrostMiddleware<E, S> {
        const limit_fn = (isFn(limit) ? limit : () => limit) as TriFrostRateLimitLimitFunction<E, S>;

        const mware = async function TriFrostRateLimitedMiddleware (
            this: TriFrostRateLimit<E>, ctx: TriFrostContext<E, S>
        ): Promise<void|TriFrostContext<E, S>> {
            if (ctx.kind !== 'std') return;

            /* Get limit for context */
            const n_limit = limit_fn(ctx);
            if (!isIntGt(n_limit, 0)) return ctx.status(500);

            /* Resolve our store */
            const store = this.#store.resolve(ctx);

            /* Consume */
            const key = this.#keygen(ctx);
            const usage = await store.consume(isNeString(key) ? key : 'unknown', n_limit);
            if (usage.amt > n_limit) {
                if (this.#headers) {
                    ctx.setHeaders({
                        'Retry-After': usage.reset - Math.floor(Date.now()/1000),
                        'X-RateLimit-Limit': n_limit,
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': usage.reset,
                    });
                } else {
                    ctx.setHeader('Retry-After', usage.reset - Math.floor(Date.now()/1000));
                }
                return this.#exceeded(ctx);
            }

            if (this.#headers) {
                ctx.setHeaders({
                    'X-RateLimit-Limit': n_limit,
                    'X-RateLimit-Remaining': n_limit - usage.amt,
                    'X-RateLimit-Reset': usage.reset,
                });
            }
        };

        const bound = mware.bind(this as TriFrostRateLimit<E>);

        /* Add symbols for introspection/use further down the line */
        Reflect.set(bound, Sym_TriFrostName, 'TriFrostRateLimit');
        Reflect.set(bound, Sym_TriFrostType, 'middleware');
        Reflect.set(bound, Sym_TriFrostDescription, 'Middleware for rate limitting contexts passing through it');

        return bound as TriFrostMiddleware<E, S>;
    }

    /**
     * This function is meant specifically to call a 'stop' function on implementing stores.
     */
    async stop () {
        if (!this.#store.resolved) return;
        await this.#store.resolved.stop();
    }

}
