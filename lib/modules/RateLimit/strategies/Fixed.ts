import {type Store} from '../../../storage/_Storage';
import {type TriFrostRateLimitObject, type TriFrostRateLimitStrategizedStore} from './_Strategy';

export class Fixed implements TriFrostRateLimitStrategizedStore {
    #window: number;

    #store: Store<TriFrostRateLimitObject>;

    constructor(window: number = 60, store: Store<TriFrostRateLimitObject>) {
        this.#window = window;
        this.#store = store;
    }

    protected get store(): Store | null {
        return this.#store;
    }

    async consume(key: string, limit: number): Promise<TriFrostRateLimitObject> {
        const now = Math.floor(Date.now() / 1000);
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

        /* Avoid writes if we've already exceeded the limit */
        if (amt <= limit) {
            const ttl = reset - now;
            await this.#store.set(key, {amt, reset}, {ttl: Math.max(ttl, 1)});
        }

        return {amt, reset};
    }

    async stop() {
        await this.#store.stop();
    }
}
