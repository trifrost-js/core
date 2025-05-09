import {type TriFrostCFDurableObjectNamespace} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {DurableObjectStore} from '../_storage/DurableObject';
import {TriFrostCache} from './_Cache';

export class DurableObjectCache<Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {

    constructor (cfg: {store: LazyInitFn<TriFrostCFDurableObjectNamespace, Env>}) {
        super({
            store: ({env}) => new DurableObjectStore(cfg.store({env}), 'cache'),
        });
    }

}
