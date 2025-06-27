import {type Store} from '../../../storage/_Storage';
import {type TriFrostRateLimitObject, type TriFrostRateLimitStrategizedStore} from './_Strategy';

export class Sliding implements TriFrostRateLimitStrategizedStore {
    #window: number;

    #store: Store<number[]>;

    constructor(window: number = 60, store: Store<number[]>) {
        this.#window = window;
        this.#store = store;
    }

    protected get store(): Store | null {
        return this.#store;
    }

    async consume(key: string, limit: number): Promise<TriFrostRateLimitObject> {
        const now = Math.floor(Date.now() / 1000);
        const timestamps = (await this.#store.get(key)) || [];

        /* Prune ONLY the first entry if it's outside the window */
        if (timestamps.length && timestamps[0] < now - this.#window) timestamps.shift();

        /* Push the current timestamp */
        timestamps.push(now);

        /* Compute the reset time */
        const reset = timestamps[0] + this.#window;

        /* Avoid writes if we've already exceeded the limit */
        if (timestamps.length <= limit) {
            const ttl = reset - now;
            await this.#store.set(key, timestamps, {ttl: Math.max(ttl, 1)});
        }

        return {amt: timestamps.length, reset};
    }

    async stop() {
        await this.#store.stop();
    }
}
