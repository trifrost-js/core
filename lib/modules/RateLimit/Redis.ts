import {isFn} from '@valkyriestudios/utils/function';
import {type TriFrostRedis} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {RedisStore} from '../_storage/Redis';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from './_RateLimit';

export class RedisRateLimit <Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg: Omit<TriFrostRateLimitOptions<Env>, 'store'> & {
        store: LazyInitFn<TriFrostRedis, Env>
    }) {
        if (!isFn(cfg?.store)) throw new Error('RedisRateLimit: Expected a store initializer');
        super({...cfg, store: ({env}) => new RedisStore(cfg.store({env}))});
    }

}