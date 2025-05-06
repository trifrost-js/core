import {type TriFrostCFKVNamespace} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {KVStore} from '../_stores/KV';
import {
    TriFrostRateLimit,
    type TriFrostRateLimitStrategy,
    type TriFrostRateLimitKeyGenerator,
    type TriFrostRateLimitExceededFunction,
} from './_RateLimit';

export class KVRateLimit <Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg: {
        window?: number;
        strategy?: TriFrostRateLimitStrategy;
        keygen?: TriFrostRateLimitKeyGenerator;
        headers?: boolean;
        exceeded?: TriFrostRateLimitExceededFunction;
        store: LazyInitFn<TriFrostCFKVNamespace, Env>;
    }) {
        super({
            window: cfg.window ?? 60_000,
            strategy: cfg.strategy ?? 'fixed',
            keygen: cfg.keygen,
            headers: cfg.headers,
            exceeded: cfg.exceeded,
            store: ({env}) => new KVStore(cfg.store({env})),
        });
    }

}
