import {isIntGt} from '@valkyriestudios/utils/number';
import {Lazy, type LazyInitFn} from '../../utils/Lazy';
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
export type TriFrostRateLimitOptions<Env extends Record<string, any> = {}> = {
    strategy?: TriFrostRateLimitStrategy;
    store: LazyInitFn<Store, Env>;
    window?: number;
    keygen?: TriFrostRateLimitKeyGenerator | TriFrostRateLimitKeyGeneratorFn;
    exceeded?: TriFrostRateLimitExceededFunction;
    headers?: boolean;
};

export class TriFrostRateLimit<Env extends Record<string, any> = Record<string, any>> {
    #keygen: TriFrostRateLimitKeyGeneratorFn;

    #exceeded: TriFrostRateLimitExceededFunction;

    #store: Lazy<TriFrostRateLimitStrategizedStore, Env>;

    #headers: boolean;

    #strategy: TriFrostRateLimitStrategy;

    #window: number;

    constructor(opts: TriFrostRateLimitOptions<Env>) {
        if (typeof opts?.store !== 'function') throw new Error('TriFrostRateLimit: Expected a store initializer');

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
        this.#store = new Lazy<TriFrostRateLimitStrategizedStore, Env>((initopts: {env: Env}) => {
            switch (this.#strategy) {
                case 'sliding':
                    return new Sliding(this.#window, opts.store(initopts) as unknown as Store<number[]>);
                default:
                    return new Fixed(this.#window, opts.store(initopts) as unknown as Store<TriFrostRateLimitObject>);
            }
        });
    }

    protected get resolvedStore(): TriFrostRateLimitStrategizedStore | null {
        return this.#store?.resolved;
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
     * Creates a reusable "rate limit" middleware with a given limit.
     *
     * @param {number|TriFrostRateLimitLimitFunction} limit - The limit to use, either a number or a rate limit function
     */
    limit<E extends Env = Env, S extends Record<string, unknown> = {}>(
        limit: number | TriFrostRateLimitLimitFunction<E, S>,
    ): TriFrostMiddleware<E, S> {
        const limit_fn = (typeof limit === 'function' ? limit : () => limit) as TriFrostRateLimitLimitFunction<E, S>;

        const mware = async function TriFrostRateLimitedMiddleware(
            this: TriFrostRateLimit<E>,
            ctx: TriFrostContext<E, S>,
        ): Promise<void | TriFrostContext<E, S>> {
            if (ctx.kind !== 'std') return;

            /* Get limit for context */
            const n_limit = limit_fn(ctx);
            if (!isIntGt(n_limit, 0)) return ctx.status(500);

            /* Resolve our store */
            const store = this.#store.resolve(ctx);

            /* Consume */
            const key = this.#keygen(ctx);
            const usage = await store.consume(typeof key === 'string' && key.length ? key : 'unknown', n_limit);
            if (usage.amt > n_limit) {
                if (this.#headers) {
                    ctx.setHeaders({
                        'Retry-After': usage.reset - Math.floor(Date.now() / 1000),
                        'X-RateLimit-Limit': n_limit,
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': usage.reset,
                    });
                } else {
                    ctx.setHeader('Retry-After', usage.reset - Math.floor(Date.now() / 1000));
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
        Reflect.set(bound, Sym_TriFrostDescription, 'Middleware for rate limitting contexts passing through it');
        Reflect.set(bound, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareRateLimit);

        return bound as TriFrostMiddleware<E, S>;
    }

    /**
     * This function is meant specifically to call a 'stop' function on implementing stores.
     */
    async stop() {
        if (!this.#store.resolved) return;
        await this.#store.resolved.stop();
    }
}
