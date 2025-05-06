import {type TriFrostRedis} from '../../types/providers';
import {type LazyInitFn} from '../../utils/Lazy';
import {RedisStore} from '../_stores/Redis';
import {TriFrostCache} from './_Cache';

export class RedisCache<Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {

    constructor (cfg: {store: LazyInitFn<TriFrostRedis, Env>}) {
        super({
            store: ({env}) => new RedisStore(cfg.store({env})),
        });
    }

}
