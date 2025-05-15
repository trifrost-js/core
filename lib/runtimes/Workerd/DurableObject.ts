/// <reference types="@cloudflare/workers-types" />

import {split} from '@valkyriestudios/utils/array';
import {isIntGt, isNum, isNumGt, isNumGte} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';

/* We bucket ttl per 10 seconds */
const BUCKET_INTERVAL = 10_000;
const BUCKET_ALARM = 60_000;
const BUCKET_PREFIX = 'ttl:bucket:';

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
        const now       = Date.now();
        const buckets   = await this.#state.storage.list({prefix: BUCKET_PREFIX});

        /* The next alarm will be scheduled to our bucket alarm (default of 60 seconds) */
        let next_alarm = Date.now() + BUCKET_ALARM;

        const to_delete: string[] = [];

        for (const [bucket_key, keys] of buckets.entries()) {
            const ts = parseInt(bucket_key.slice(BUCKET_PREFIX.length), 10);
            /* If either the stored timestamp is below our current time OR the bucket timestamp is invalid, purge it */
            if (!isNum(ts) || isNumGte(now, ts)) {
                to_delete.push(bucket_key);
                if (Array.isArray(keys)) {
                    for (let i = 0; i < keys.length; i++) to_delete.push(keys[i]);
                }
            } else if (isNumGt(next_alarm, ts)) {
                /* Next alarm earlier */
                next_alarm = ts;
            }
        }

        /* Set next alarm */
        await this.#state.storage.setAlarm(next_alarm);


        /* Evict keys */
        for (const batch of split(to_delete, 128)) {
            await this.#state.storage.delete(batch);
        }
    }

	/**
	 * Fetch — routes by /trifrost-{namespace}?key={key}
	 */
    async fetch (request: Request): Promise<Response> {
        const url = new URL(request.url);

        /* Ensure key exists */
        const key = url.searchParams.get('key');
        if (!isNeString(key)) return new Response('Missing key', {status: 400});

        /* Get namespace */
        const match = url.pathname.match(/^\/trifrost-([a-z0-9_-]+)$/i);
        if (
            !match ||
            match.length < 1 || 
            !isNeString(match[1])
        ) return new Response('Invalid namespace', {status: 400});

        /* Namespace key */
        const N_KEY = `${match[1]}:${key}`;

        switch (request.method) {
            case 'GET': {
                try {
                    const stored = await this.#state.storage.get<{v: unknown; exp: number}>(N_KEY);
                    if (!stored) return new Response('null', {status: 200, headers: {'Content-Type': 'application/json'}});

                    /* Lazy delete on read */
                    const now = Date.now();
                    if (!isNum(stored.exp) || isNumGte(now, stored.exp)) {
                        await this.#state.storage.delete(N_KEY);
                        return new Response('null', {status: 200, headers: {'Content-Type': 'application/json'}});
                    }

                    return new Response(JSON.stringify(stored.v), {status: 200, headers: {'Content-Type': 'application/json'}});
                } catch {
                    return new Response('Internal Error', {status: 500});
                }
            }
            case 'PUT': {
                try {
                    if (
                        (request.headers.get('Content-Type') || '').indexOf('application/json') < 0
                    ) return new Response('Unsupported content type', {status: 415});

                    const {v, ttl} = await request.json() as {v: unknown; ttl: number};
                    if (!isIntGt(ttl, 0)) return new Response('Invalid TTL', {status: 400});

                    const now = Date.now();
                    const exp = now + (ttl * 1000);
                    const bucket = bucketFor(exp);
                    const bucket_key = BUCKET_PREFIX + bucket;

                    const set = new Set(await this.#state.storage.get<string[]>(bucket_key) || []);
                    set.add(N_KEY);

                    await Promise.all([
                        this.#state.storage.put(N_KEY, {v, exp}),
                        this.#state.storage.put(bucket_key, [...set]),
                        this.#state.storage.setAlarm(bucket),
                    ]);

                    return new Response('OK', {status: 200});
                } catch {
                    return new Response('Invalid body', {status: 400});
                }
            }
            case 'DELETE': {
                try {
                    await this.#state.storage.delete(N_KEY);
                    return new Response(null, {status: 204});
                } catch {
                    return new Response('Internal Error', {status: 500});
                }
            }
            default:
                return new Response('Method not allowed', {status: 405});
        }
    }

}
