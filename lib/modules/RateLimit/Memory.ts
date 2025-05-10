import {isNeArray} from '@valkyriestudios/utils/array';
import {isIntGt} from '@valkyriestudios/utils/number';
import {type LazyInitFn} from '../../utils/Lazy';
import {MemoryStore} from '../_storage/Memory';
import {type TriFrostRateLimitObject} from './strategies/_Strategy';
import {TriFrostRateLimit, type TriFrostRateLimitOptions} from './_RateLimit';

export class MemoryRateLimit<Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg?: Omit<TriFrostRateLimitOptions<Env>, 'store'>) {
        const window = isIntGt(cfg?.window, 0) ? cfg.window : 60_000;

        const store = cfg?.strategy === 'sliding'
            ? new MemoryStore<number[]>({
                gc_interval: 60_000,
                gc_filter: (_, timestamps, now) => isNeArray(timestamps) && timestamps[timestamps.length - 1] < (now - window),
            })
            : new MemoryStore<TriFrostRateLimitObject>({
                gc_interval: 60_000,
                gc_filter: (_, value, now) => value.reset <= now,
            });

        super({
            ...cfg || {},
            store: (() => store) as LazyInitFn<MemoryStore, Env>,
        });
    }

}