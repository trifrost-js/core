import {type TriFrostStore} from '../../_storage';
import {
    type TriFrostRateLimitObject,
    type TriFrostRateLimitStrategizedStore,
} from './_Strategy';

export class Sliding implements TriFrostRateLimitStrategizedStore {

    #window:number;

    #store:TriFrostStore<number[]>;

    constructor (window: number = 60_000, store:TriFrostStore<number[]>) {
        if (!Number.isInteger(window) || window <= 0) {
            throw new Error('TriFrostRateLimit: Store requires an integer window above 0');
        }

        this.#window = window;

        this.#store = store;
    }

    get window () {
        return this.#window;
    }

    async consume (key: string, limit: number): Promise<TriFrostRateLimitObject> {
        if (typeof key !== 'string' || !key.length) {
            throw new Error('TriFrostRateLimit: Store@consume requires a key string');
        }

        if (!Number.isInteger(limit) || limit <= 0) {
            throw new Error('TriFrostRateLimit: Store@consume requires a limit integer');
        }

        const now = Date.now();
        const cutoff = now - this.#window;

        const timestamps = await this.#store.get(key) || [];

        /* Prune ONLY the first entry if it's outside the window */
        if (timestamps.length && timestamps[0] < cutoff) {
            timestamps.shift();
        }

        /* Push the current timestamp */
        timestamps.push(now);

        const reset = timestamps[0] + this.#window;

        /* Avoid writes if we've already exceeded the limit */
        if (timestamps.length <= limit) {
            const ttl = Math.ceil((reset - now) / 1000);
            await this.#store.set(key, timestamps, {ttl: ttl >= 1 ? ttl : 1});
        }

        return {amt: timestamps.length, reset};
    }

}
