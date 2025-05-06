import {type TriFrostCFKVNamespace} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {KVStore} from '../_stores/KV';
import {TriFrostCache} from './_Cache';

export class KVCache<Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {

    constructor (cfg: {store: LazyInitFn<TriFrostCFKVNamespace, Env>}) {
        super({
            store: ({env}) => new KVStore(cfg.store({env})),
        });
    }

}
