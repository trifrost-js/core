import {isNeArray} from '@valkyriestudios/utils/array';
import {type LazyInitFn} from '../../utils/Lazy';
import {MemoryStore} from '../_stores/Memory';
import {type TriFrostRateLimitObject} from './strategies/_Strategy';
import {
    TriFrostRateLimit,
    type TriFrostRateLimitStrategy,
    type TriFrostRateLimitKeyGenerator,
    type TriFrostRateLimitExceededFunction,
} from './_RateLimit';

export class MemoryRateLimit<Env extends Record<string, any> = Record<string, any>> extends TriFrostRateLimit<Env> {

    constructor (cfg: {
		window?: number;
		strategy?: TriFrostRateLimitStrategy;
		keygen?: TriFrostRateLimitKeyGenerator;
		headers?: boolean;
		exceeded?: TriFrostRateLimitExceededFunction;
	}) {
	    const window = cfg.window ?? 60_000;

        const store = cfg.strategy === 'sliding'
            ? new MemoryStore<number[]>({
                gc_interval: 60_000,
                gc_filter: (_, timestamps, now) => isNeArray(timestamps) && timestamps[timestamps.length - 1] < (now - window),
            })
            : new MemoryStore<TriFrostRateLimitObject>({
                gc_interval: 60_000,
                gc_filter: (_, value, now) => value.reset <= now,
            });

        super({
            window,
            strategy: cfg.strategy ?? 'fixed',
            keygen: cfg.keygen,
            headers: cfg.headers,
            exceeded: cfg.exceeded,
            store: (() => store) as LazyInitFn<MemoryStore, Env>,
        });
    }

}
