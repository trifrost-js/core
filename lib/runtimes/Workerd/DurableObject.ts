/// <reference types="@cloudflare/workers-types" />

import {split} from '@valkyriestudios/utils/array';

/* We bucket ttl per 10 seconds */
const BUCKET_INTERVAL = 10_000;

/* Computes the ttl bucket for a specific timestamp */
const bucketFor = (ts: number): number => Math.floor(ts / BUCKET_INTERVAL) * BUCKET_INTERVAL;

/**
 * TriFrostDurableObject — backs modules like RateLimit and Cache via bucketed TTL expiry
 */
export class TriFrostDurableObject {

    #state: DurableObjectState;

    constructor (state: DurableObjectState) {
        this.#state = state;
    }

	/**
	 * Alarm — deletes expired keys from current and past buckets
	 */
    async alarm (): Promise<void> {
        const now = Date.now();
        const storage = this.#state.storage;
        const allBuckets = await storage.list({prefix: 'ttl:bucket:'});

        let nextAlarm = Number.POSITIVE_INFINITY;
        const keysToDelete: string[] = [];
        const bucketsToDelete: string[] = [];

        for (const [bucketKey, keys] of allBuckets.entries()) {
            const ts = parseInt(bucketKey.slice('ttl:bucket:'.length), 10);
            if (Number.isNaN(ts)) continue;

            if (ts <= now) {
                bucketsToDelete.push(bucketKey);
                if (Array.isArray(keys)) {
                    for (const k of keys as string[]) keysToDelete.push(k);
                }
            } else if (ts < nextAlarm) {
                nextAlarm = ts;
            }
        }

        for (const batch of split(keysToDelete, 128)) {
            await storage.delete(batch);
        }

        for (const batch of split(bucketsToDelete, 128)) {
            await storage.delete(batch);
        }

        if (nextAlarm < Number.POSITIVE_INFINITY) {
            await storage.setAlarm(nextAlarm);
        }
    }

	/**
	 * Fetch — routes by /trifrost-{namespace}?key={key}
	 */
    async fetch (request: Request): Promise<Response> {
        const url = new URL(request.url);

        /* Ensure key exists */
        const key = url.searchParams.get('key');
        if (!key) return new Response('Missing key', {status: 400});

        /* Get namespace */
        const match = url.pathname.match(/^\/trifrost-([a-z0-9_-]+)$/i);
        if (!match || match.length < 1) return new Response('Not Found', {status: 404});

        const namespace = match[1];
        if (typeof namespace !== 'string') return new Response('Invalid namespace', {status: 400});

        /* Namespace key */
        const N_KEY = `${namespace}:${key}`;

        switch (request.method) {
            case 'GET': {
                const val = await this.#state.storage.get(N_KEY);
                return new Response(JSON.stringify(val ?? null), {
                    status: 200,
                    headers: {'Content-Type': 'application/json'},
                });
            }
            case 'PUT': {
                try {
                    const {v, ttl} = await request.json() as {v: unknown; ttl: number};

                    await this.#state.storage.put(N_KEY, v);

                    const now = Date.now();
                    const expires = now + (ttl * 1000);
                    const bucket = bucketFor(expires);
                    const bucketKey = `ttl:bucket:${bucket}`;

                    const list = await this.#state.storage.get<string[]>(bucketKey) || [];
                    list.push(N_KEY);

                    await Promise.all([
                        this.#state.storage.put(bucketKey, [...new Set(list)]),
                        this.#state.storage.setAlarm(bucket),
                    ]);

                    return new Response('OK', {status: 200});
                } catch {
                    return new Response('Invalid body', {status: 400});
                }
            }
            case 'DELETE': {
                await this.#state.storage.delete(N_KEY);
                return new Response(null, {status: 204});
            }
            default:
                return new Response('Not Found', {status: 404});
        }
    }

}
