import {isIntGt} from '@valkyriestudios/utils/number';
import {type LazyInitFn} from '../../utils/Lazy';
import {MemoryStore} from '../_storage/Memory';
import {TriFrostCache} from './_Cache';

export class MemoryCache <Env extends Record<string, any> = Record<string, any>> extends TriFrostCache<Env> {

    constructor (cfg?: {
        gc_interval?:number;
        max_items?:number;
    }) {
        super({
            store: (() => new MemoryStore({
                gc_interval: isIntGt(cfg?.gc_interval, 0) ? cfg?.gc_interval : 60_000,
                max_items: isIntGt(cfg?.max_items, 0) ? cfg.max_items : 1_000,
            })) as LazyInitFn<MemoryStore, Env>,
        });
    }

}
