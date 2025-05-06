import {isIntegerAbove} from '@valkyriestudios/utils/number/isIntegerAbove';
import {type LazyInitFn} from '../../utils/Lazy';
import {MemoryStore} from '../_stores/Memory';
import {TriFrostCache} from './_Cache';

export class MemoryCache <Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {

    constructor (cfg: {
        gc_interval?:number;
    } = {gc_interval: 60_000}) {
        super({
            store: (() => new MemoryStore({
                gc_interval: isIntegerAbove(cfg.gc_interval, 0) ? cfg.gc_interval : 60_000,
            })) as LazyInitFn<MemoryStore, Env>,
        });
    }

}
