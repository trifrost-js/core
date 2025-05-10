import {isIntGt} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';
import {type TriFrostStore} from '../../_storage';
import {
    type TriFrostRateLimitObject,
    type TriFrostRateLimitStrategizedStore,
} from './_Strategy';

export class Sliding implements TriFrostRateLimitStrategizedStore {

    #window:number;

    #store:TriFrostStore<number[]>;

    constructor (window: number = 60_000, store:TriFrostStore<number[]>) {
        if (!isIntGt(window, 0)) throw new Error('TriFrostRateLimit: Store requires an integer window above 0');

        this.#window = window;
        this.#store = store;
    }

    get window () {
        return this.#window;
    }

    async consume (key: string, limit: number): Promise<TriFrostRateLimitObject> {
        if (!isNeString(key)) throw new Error('TriFrostRateLimit: Store@consume requires a key string');
        if (!isIntGt(limit, 0)) throw new Error('TriFrostRateLimit: Store@consume requires a limit integer');

        const now = Date.now();
        const timestamps = await this.#store.get(key) || [];

        /* Prune ONLY the first entry if it's outside the window */
        if (timestamps.length && timestamps[0] < (now - this.#window)) timestamps.shift();

        /* Push the current timestamp */
        timestamps.push(now);

        /* Compute the reset time */
        const reset = timestamps[0] + this.#window;

        /* Avoid writes if we've already exceeded the limit */
        if (timestamps.length <= limit) {
            const ttl = Math.ceil((reset - now) / 1000);
            await this.#store.set(key, timestamps, {ttl: ttl >= 1 ? ttl : 1});
        }

        return {amt: timestamps.length, reset};
    }

    async stop () {
        await this.#store.stop();
    }

}
