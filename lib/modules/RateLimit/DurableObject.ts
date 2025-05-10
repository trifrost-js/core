import {isFn} from '@valkyriestudios/utils/function';
import {type TriFrostCFDurableObjectNamespace} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {DurableObjectStore} from '../_storage/DurableObject';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from './_RateLimit';

export class DurableObjectRateLimit <Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg: Omit<TriFrostRateLimitOptions<Env>, 'store'> & {
        store: LazyInitFn<TriFrostCFDurableObjectNamespace, Env>
    }) {
        if (!isFn(cfg?.store)) throw new Error('DurableObjectRateLimit: Expected a store initializer');
        super({...cfg, store: ({env}) => new DurableObjectStore(cfg.store({env}), 'ratelimit')});
    }

}
