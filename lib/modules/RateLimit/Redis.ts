import {type TriFrostRedis} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {RedisStore} from '../_storage/Redis';
import {
    TriFrostRateLimit,
    type TriFrostRateLimitStrategy,
    type TriFrostRateLimitKeyGenerator,
    type TriFrostRateLimitExceededFunction,
} from './_RateLimit';

export class RedisRateLimit <Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg: {
		window?: number;
		strategy?: TriFrostRateLimitStrategy;
		keygen?: TriFrostRateLimitKeyGenerator;
		headers?: boolean;
		exceeded?: TriFrostRateLimitExceededFunction;
		store: LazyInitFn<TriFrostRedis, Env>;
	}) {
        super({
            window: cfg.window ?? 60_000,
            strategy: cfg.strategy ?? 'fixed',
            keygen: cfg.keygen,
            headers: cfg.headers,
            exceeded: cfg.exceeded,
            store: ({env}) => new RedisStore(cfg.store({env})),
        });
    }

}
