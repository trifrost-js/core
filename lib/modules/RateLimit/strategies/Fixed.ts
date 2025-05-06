import {type TriFrostStore} from '../../_stores';
import {
    type TriFrostRateLimitObject,
    type TriFrostRateLimitStrategizedStore,
} from './_Strategy';

export class Fixed implements TriFrostRateLimitStrategizedStore {

    #window: number;

    #store:TriFrostStore<TriFrostRateLimitObject>;

    constructor (window: number = 60_000, store:TriFrostStore<TriFrostRateLimitObject>) {
        if (!Number.isInteger(window) || window <= 0) {
            throw new Error('TriFrostRateLimit: Store requires an integer window above 0');
        }

        this.#window = window;
        this.#store = store;
    }

    get window () {
        return this.#window;
    }

    async consume (key: string, limit:number): Promise<TriFrostRateLimitObject> {
        if (typeof key !== 'string' || !key.length) {
            throw new Error('TriFrostRateLimit: Store@consume requires a key string');
        }

        if (!Number.isInteger(limit) || limit <= 0) {
            throw new Error('TriFrostRateLimit: Store@consume requires a limit integer');
        }

        const now = Date.now();
        const record = await this.#store.get(key);

        let amt: number;
        let reset: number;
        if (!record || record.reset <= now) {
            amt = 1;
            reset = now + this.#window;
        } else {
            amt = record.amt + 1;
            reset = record.reset;
        }

        if (amt <= limit) {
            const ttl = Math.ceil((reset - now) / 1000);
            await this.#store.set(key, {amt, reset}, {ttl: ttl >= 1 ? ttl : 1});
        }

        return {amt, reset};
    }

}
