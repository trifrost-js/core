import {describe, it, expect, vi, beforeEach} from 'vitest';
import {TriFrostDurableObject} from '../../../../lib/runtimes/Workerd/DurableObject';
import {MockDurableObjectStorage} from '../../../MockDurableObjectStorage';
import CONSTANTS from '../../../constants';

const BUCKET_INTERVAL = 10_000;
const BUCKET_PREFIX = 'ttl:bucket:';

const makeRequest = (method: string, key?: string, body?: any) => {
    const req = new Request(`https://do/trifrost-cache${key ? `?key=${key}` : ''}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? {'Content-Type': 'application/json'} : {},
    });
    return req;
};

describe('Runtimes - Workerd - DurableObject', () => {
    let state: any;
    let durable: TriFrostDurableObject;

    beforeEach(() => {
        state = {
            storage: new MockDurableObjectStorage(),
            setAlarm: vi.fn(),
        };
        durable = new TriFrostDurableObject(state);
    });

    describe('fetch', () => {
        it('Returns 405 for unsupported HTTP methods', async () => {
            const res = await durable.fetch(new Request('https://do/trifrost-cache?key=foo', {method: 'PATCH'}));
            expect(res.status).toBe(405);
            expect(await res.text()).toContain('Method not allowed');
        });        

        describe('GET', () => {
            it('Returns 400 if key is missing in url', async () => {
                const req = new Request('https://do/trifrost-cache', {method: 'GET'});
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Missing key');
            });
        
            it('Returns 404 if path does not match /trifrost-namespace', async () => {
                const req = new Request('https://do/invalid-path?key=foo', {method: 'GET'});
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Invalid namespace');
            });
        
            it('Returns 400 if namespace is not a string', async () => {
                const req = new Request('https://do/trifrost-?key=foo', {method: 'GET'});
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Invalid namespace');
            });

            it('Returns null for missing key in storage', async () => {
                const res = await durable.fetch(makeRequest('GET', 'foo'));
                expect(await res.text()).toBe('null');
                expect(res.status).toBe(200);
            });

            it('Returns value if not expired', async () => {
                const exp = Date.now() + 10000;
                await state.storage.put('cache:foo', {v: {hello: 'world'}, exp});

                const res = await durable.fetch(makeRequest('GET', 'foo'));
                expect(await res.json()).toEqual({hello: 'world'});
                expect(res.status).toBe(200);
            });

            it('Deletes expired key on read', async () => {
                const exp = Date.now() - 1000;
                await state.storage.put('cache:foo', {v: 'bar', exp});

                const res = await durable.fetch(makeRequest('GET', 'foo'));
                expect(await res.text()).toBe('null');
                expect(await state.storage.get('cache:foo')).toBe(undefined);
            });

            it('Deletes key with missing exp', async () => {
                await state.storage.put('cache:foo', {v: 'bar'});
                const res = await durable.fetch(makeRequest('GET', 'foo'));
                expect(await res.text()).toBe('null');
            });

            it('Deletes key with invalid exp', async () => {
                for (const el of CONSTANTS.NOT_NUMERIC) {
                    await state.storage.put('cache:foo', {v: 'bar', exp: el});
                    const res2 = await durable.fetch(makeRequest('GET', 'foo'));
                    expect(await res2.text()).toBe('null');
                }
            });

            it('Handles unexpected error during GET gracefully', async () => {
                const key = 'foo';
                const req = makeRequest('GET', key);
                
                // Inject a storage.get() failure
                state.storage.get = vi.fn(() => {
                    throw new Error('boom');
                });
            
                const res = await durable.fetch(req);
                expect(res.status).toBe(500);
                expect(await res.text()).toContain('Internal Error');
            });            
        });

        describe('PUT', () => {
            it('Returns 400 if key is missing in url', async () => {
                const req = new Request('https://do/trifrost-cache', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({v: {hello: 'world'}, ttl: 60}),
                });
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Missing key');
            });
        
            it('Returns 404 if path does not match /trifrost-namespace', async () => {
                const req = new Request('https://do/invalid-path?key=foo', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({v: {hello: 'world'}, ttl: 60}),
                });
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Invalid namespace');
            });
        
            it('Returns 400 if namespace is not a string', async () => {
                const req = new Request('https://do/trifrost-?key=foo', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({v: {hello: 'world'}, ttl: 60}),
                });
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Invalid namespace');
            });

            it('Returns 400 if request JSON is malformed', async () => {
                const req = new Request('https://do/trifrost-cache?key=foo', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: '{invalid-json}',
                });
            
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Invalid body');
            });        

            it('Stores value with TTL and schedules alarm', async () => {
                const res = await durable.fetch(makeRequest('PUT', 'foo', {v: 'hello', ttl: 60}));
                expect(res.status).toBe(200);

                const stored = await state.storage.get('cache:foo');
                expect(stored?.v).toBe('hello');
                expect(typeof stored?.exp).toBe('number');
            });

            it('Handles duplicate adds into same bucket', async () => {
                const now = Date.now();
                vi.setSystemTime(now);

                await durable.fetch(makeRequest('PUT', 'foo', {v: 'a', ttl: 60}));
                await durable.fetch(makeRequest('PUT', 'foo', {v: 'b', ttl: 60}));

                const bucketKey = BUCKET_PREFIX + ((now + 60000) - ((now + 60000) % BUCKET_INTERVAL));
                const bucketContents = await state.storage.get(bucketKey);

                expect(bucketContents).toContain('cache:foo');
                expect(new Set(bucketContents).size).toBe(bucketContents.length); // no duplicates
            });

            it('Rejects missing Content-Type', async () => {
                const req = new Request('https://do/trifrost-cache?key=foo', {method: 'PUT'});
                const res = await durable.fetch(req);
                expect(res.status).toBe(415);
            });

            it('Rejects invalid Content-Type', async () => {
                for (const el of [
                    'opplication/json',
                    'text/csv',
                    'application/whatever',
                    'application/jsan',
                ]) {
                    const req = new Request('https://do/trifrost-cache?key=foo', {method: 'PUT', headers: {'Content-Type': el}});
                    const res = await durable.fetch(req);
                    expect(res.status).toBe(415);
                }
            });

            it('Rejects invalid TTL values', async () => {
                for (const el of [...CONSTANTS.NOT_NUMERIC, -1, 0, 99.99]) {
                    const res = await durable.fetch(makeRequest('PUT', 'foo', {v: 1, ttl: el}));
                    expect(res.status).toBe(400);
                }
            });
        });

        describe('DELETE', () => {
            it('Returns 400 if key is missing in url', async () => {
                const req = new Request('https://do/trifrost-cache', {method: 'DELETE'});
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Missing key');
            });
        
            it('Returns 404 if path does not match /trifrost-namespace', async () => {
                const req = new Request('https://do/invalid-path?key=foo', {method: 'DELETE'});
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Invalid namespace');
            });
        
            it('Returns 400 if namespace is not a string', async () => {
                const req = new Request('https://do/trifrost-?key=foo', {method: 'DELETE'});
                const res = await durable.fetch(req);
                expect(res.status).toBe(400);
                expect(await res.text()).toContain('Invalid namespace');
            });

            it('Deletes a key', async () => {
                await state.storage.put('cache:foo', {v: 1, exp: Date.now() + 60000});
                const res = await durable.fetch(makeRequest('DELETE', 'foo'));
                expect(res.status).toBe(204);
                expect(await state.storage.get('cache:foo')).toBe(undefined);
            });

            it('Returns 500 if delete throws unexpectedly', async () => {
                state.storage.delete = vi.fn(() => {
                    throw new Error('exploded');
                });
            
                const res = await durable.fetch(makeRequest('DELETE', 'foo'));
                expect(res.status).toBe(500);
                expect(await res.text()).toContain('Internal Error');
            });            
        });
    });

    describe('alarm', () => {
        it('Deletes expired buckets and keys', async () => {
            const now = Date.now();
            const bucket = now - BUCKET_INTERVAL;
            const bucketKey = BUCKET_PREFIX + bucket;

            await state.storage.put('cache:foo', {v: 1, exp: bucket - 1000});
            await state.storage.put(bucketKey, ['cache:foo']);

            await durable.alarm();

            expect(await state.storage.get('cache:foo')).toBe(undefined);
            expect(await state.storage.get(bucketKey)).toBe(undefined);
        });

        it('Schedules next alarm for fallback if next future bucket is above fallback', async () => {
            const now = Date.now();
            const futureBucket = now + 90_000;
            const bucketKey = BUCKET_PREFIX + futureBucket;

            await state.storage.put(bucketKey, ['cache:future']);

            await durable.alarm();
            expect(state.storage.alarms.at(-1)).toBeGreaterThanOrEqual(now + 60_000 - 5);
            expect(state.storage.alarms.at(-1)).toBeLessThanOrEqual(now + 60_000 + 5);
        });

        it('Schedules next alarm for future bucket if next future bucket is below fallback', async () => {
            const now = Date.now();
            const futureBucket = now + 30_000;
            const bucketKey = BUCKET_PREFIX + futureBucket;

            await state.storage.put(bucketKey, ['cache:future']);

            await durable.alarm();
            expect(state.storage.alarms.at(-1)).toBeGreaterThanOrEqual(now + 30_000 - 5);
            expect(state.storage.alarms.at(-1)).toBeLessThanOrEqual(now + 30_000 + 5);
        });

        it('Always sets alarm even when no future bucket', async () => {
            await durable.alarm();
            expect(state.storage.alarms.at(-1)).toBeGreaterThan(Date.now());
        });

        it('Cleans multiple expired buckets in one alarm run', async () => {
            const now = Date.now();
            const b1 = now - (BUCKET_INTERVAL * 2);
            const b2 = now - BUCKET_INTERVAL;
            
            await state.storage.put('cache:k1', {v: 1, exp: b1});
            await state.storage.put('cache:k2', {v: 2, exp: b2});
            await state.storage.put(`${BUCKET_PREFIX}${b1}`, ['cache:k1']);
            await state.storage.put(`${BUCKET_PREFIX}${b2}`, ['cache:k2']);
        
            await durable.alarm();
        
            expect(await state.storage.get('cache:k1')).toBe(undefined);
            expect(await state.storage.get('cache:k2')).toBe(undefined);
            expect(await state.storage.get(`${BUCKET_PREFIX}${b1}`)).toBe(undefined);
            expect(await state.storage.get(`${BUCKET_PREFIX}${b2}`)).toBe(undefined);
        });
        
        it('Purges malformed TTL bucket timestamps and their keys', async () => {
            await state.storage.put(`${BUCKET_PREFIX}garbage`, ['cache:k1']);
            await state.storage.put('cache:k1', {v: 1, exp: Date.now() - 1000});
        
            await durable.alarm();
        
            expect(await state.storage.get(`${BUCKET_PREFIX}garbage`)).toBe(undefined);
            expect(await state.storage.get('cache:k1')).toBe(undefined);
        });        

        it('Does not delete future buckets or keys', async () => {
            const now = Date.now();
            const future = now + 90_000;
        
            await state.storage.put('cache:future', {v: 1, exp: future});
            await state.storage.put(`${BUCKET_PREFIX}${future}`, ['cache:future']);
        
            await durable.alarm();
        
            expect(await state.storage.get('cache:future')).toEqual({v: 1, exp: future});
            expect(await state.storage.get(`${BUCKET_PREFIX}${future}`)).toEqual(['cache:future']);
        });
        
        it('Deletes keys in batches of 128 (batch split integrity)', async () => {
            const now = Date.now();
            const bucket = now - BUCKET_INTERVAL;
            const bucketKey = `${BUCKET_PREFIX}${bucket}`;
        
            const keys = Array.from({length: 300}, (_, i) => `cache:key${i}`);
            await state.storage.put(bucketKey, keys);
            for (const k of keys) {
                await state.storage.put(k, {v: 1, exp: bucket});
            }
        
            await durable.alarm();
        
            for (const k of keys) {
                expect(await state.storage.get(k)).toBe(undefined);
            }
        });        
    });
});
