import {isFn} from '@valkyriestudios/utils/function';
import {type TriFrostCFKVNamespace} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {KVStore} from '../_storage/KV';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from './_RateLimit';

export class KVRateLimit <Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg: Omit<TriFrostRateLimitOptions<Env>, 'store'> & {
        store: LazyInitFn<TriFrostCFKVNamespace, Env>
    }) {
        if (!isFn(cfg?.store)) throw new Error('KVRateLimit: Expected a store initializer');
        super({...cfg, store: ({env}) => new KVStore(cfg.store({env}))});
    }

}