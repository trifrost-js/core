import {isIntGt} from '@valkyriestudios/utils/number';
import {Lazy} from '../../utils/Lazy';
import {type TriFrostContext} from '../../types/context';
import {type Store} from '../../storage/_Storage';
import {type TriFrostMiddleware} from '../../types/routing';
import {Sym_TriFrostDescription, Sym_TriFrostFingerPrint, Sym_TriFrostName} from '../../types/constants';
import {type TriFrostRateLimitObject, type TriFrostRateLimitStrategizedStore} from './strategies/_Strategy';
import {Sliding} from './strategies/Sliding';
import {Fixed} from './strategies/Fixed';

/* Specific symbol attached to limit mware to identify them by */
export const Sym_TriFrostMiddlewareRateLimit = Symbol('TriFrost.Middleware.RateLimit');

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
export type TriFrostRateLimitKeyGeneratorFn = (ctx: TriFrostContext) => string;

/**
 * Combined val and FN
 */
export type TriFrostRateLimitKeyGenerator = TriFrostRateLimitKeyGeneratorVal | TriFrostRateLimitKeyGeneratorFn;

/**
 * RateLimitLimitFunction is a function which returns the limit to use in rate limitting
 */
export type TriFrostRateLimitLimitFunction<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}> = (
    ctx: TriFrostContext<Env, State>,
) => number;

/**
 * RateLimitExceededFunction is a function which is used to customize the handling of exceeded behavior
 */
export type TriFrostRateLimitExceededFunction = (ctx: TriFrostContext) => void | Promise<void>;

/**
 * Prebuilt Key Gen Registry
 */
export const RateLimitKeyGeneratorRegistry: Record<TriFrostRateLimitKeyGeneratorVal, TriFrostRateLimitKeyGeneratorFn> = {
    ip: ctx => ctx.ip || 'unknown',
    ip_name: ctx => (ctx.ip || 'unknown') + ':' + ctx.name,
    ip_method: ctx => (ctx.ip || 'unknown') + ':' + ctx.method,
    ip_name_method: ctx => (ctx.ip || 'unknown') + ':' + ctx.name + ':' + ctx.method,
};

/**
 * TriFrost RateLimit Options
 */
export type TriFrostRateLimitOptions = {
    strategy?: TriFrostRateLimitStrategy;
    store: Store;
    window?: number;
    keygen?: TriFrostRateLimitKeyGenerator | TriFrostRateLimitKeyGeneratorFn;
    exceeded?: TriFrostRateLimitExceededFunction;
    headers?: boolean;
};

export class TriFrostRateLimit {
    #keygen: TriFrostRateLimitKeyGeneratorFn;

    #exceeded: TriFrostRateLimitExceededFunction;

    #store: TriFrostRateLimitStrategizedStore;

    #headers: boolean;

    #strategy: TriFrostRateLimitStrategy;

    #window: number;

    constructor(opts: TriFrostRateLimitOptions) {
        if (typeof opts?.store?.get !== 'function' || typeof opts?.store?.set !== 'function')
            throw new Error('TriFrostRateLimit: Expected a store initializer');

        /* Define keygen or fallback to ip_name_method */
        this.#keygen = (
            typeof opts?.keygen === 'function'
                ? opts.keygen
                : typeof opts?.keygen === 'string'
                    ? RateLimitKeyGeneratorRegistry[opts.keygen] // eslint-disable-line prettier/prettier
                    : RateLimitKeyGeneratorRegistry.ip_name_method // eslint-disable-line prettier/prettier
        ) as TriFrostRateLimitKeyGeneratorFn; // eslint-disable-line prettier/prettier

        /* Define exceeded behavior */
        this.#exceeded = typeof opts?.exceeded === 'function' ? opts.exceeded : (ctx: TriFrostContext) => ctx.status(429);

        /* Whether or not rate limit headers should be set (Defaults to true) */
        this.#headers = opts?.headers !== false;

        /* Set strategy */
        this.#strategy = opts?.strategy === 'sliding' ? 'sliding' : 'fixed';

        /* Set window */
        this.#window = isIntGt(opts?.window, 0) ? opts?.window : 60;

        /* Create lazy store */
        switch (this.#strategy) {
            case 'sliding':
                this.#store = new Sliding(this.#window, opts.store as Store<number[]>);
                break;
            default:
                this.#store = new Fixed(this.#window, opts.store as Store<TriFrostRateLimitObject>);
                break;
        }
    }

    /**
     * Configured keygen handler
     */
    get keygen() {
        return this.#keygen;
    }

    /**
     * Configured exceeded behavior
     */
    get exceeded() {
        return this.#exceeded;
    }

    /**
     * Configured store
     */
    get store() {
        return this.#store;
    }

    /**
     * Configured headers (default=true)
     */
    get headers() {
        return this.#headers;
    }

    /**
     * The configured strategy type (default=fixed)
     */
    get strategy() {
        return this.#strategy;
    }

    /**
     * The configured window (default=60) in seconds
     */
    get window() {
        return this.#window;
    }

    /**
     * This function is meant specifically to call a 'stop' function on implementing stores.
     */
    async stop() {
        await this.#store.stop();
    }
}

/**
 * Creates a reusable "rate limit" middleware with a given limit.
 *
 * @param {Lazy<TriFrostRateLimit>} rateLimiter - Lazy rate limit instance resolver
 * @param {number|TriFrostRateLimitLimitFunction} limit - The limit to use, either a number or a rate limit function
 */
export function limitMiddleware<Env extends Record<string, any> = Record<string, any>, State extends Record<string, unknown> = {}>(
    limiter: Lazy<TriFrostRateLimit, Env>,
    limit: number | TriFrostRateLimitLimitFunction<Env, State>,
): TriFrostMiddleware<Env, State> {
    const limit_fn = (typeof limit === 'function' ? limit : () => limit) as TriFrostRateLimitLimitFunction<Env, State>;

    const mware = async function TriFrostRateLimitedMiddleware(
        ctx: TriFrostContext<Env, State>,
    ): Promise<void | TriFrostContext<Env, State>> {
        if (ctx.kind !== 'std') return;

        const instance = limiter.resolve(ctx);

        /* Get limit for context */
        const n_limit = limit_fn(ctx);
        if (!isIntGt(n_limit, 0)) return ctx.status(500);

        /* Consume */
        const key = instance.keygen(ctx);
        const usage = await instance.store.consume(typeof key === 'string' && key.length ? key : 'unknown', n_limit);
        if (usage.amt > n_limit) {
            if (instance.headers) {
                ctx.setHeaders({
                    'retry-after': usage.reset - Math.floor(Date.now() / 1000),
                    'x-ratelimit-limit': n_limit,
                    'x-ratelimit-remaining': '0',
                    'x-ratelimit-reset': usage.reset,
                });
            } else {
                ctx.setHeader('retry-after', usage.reset - Math.floor(Date.now() / 1000));
            }
            return instance.exceeded(ctx);
        }

        if (instance.headers) {
            ctx.setHeaders({
                'x-ratelimit-limit': n_limit,
                'x-ratelimit-remaining': n_limit - usage.amt,
                'x-ratelimit-reset': usage.reset,
            });
        }
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostRateLimit');
    Reflect.set(mware, Sym_TriFrostDescription, 'Middleware for rate limitting contexts passing through it');
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareRateLimit);

    return mware as TriFrostMiddleware<Env, State>;
}
