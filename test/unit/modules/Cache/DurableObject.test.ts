import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {DurableObjectCache} from '../../../../lib/modules/Cache/DurableObject';
import {MockDurableObjectNamespace} from '../../../MockDurableObject';
import {type TriFrostCFDurableObjectId} from '../../../../lib/types/providers';
import {cacheSkip} from '../../../../lib/modules/Cache/util';

describe('Modules - Cache - DurableObjectCache', () => {
    let cache: DurableObjectCache;
    let durable: MockDurableObjectNamespace;
    let stub: ReturnType<MockDurableObjectNamespace['get']>;
    let stubId:TriFrostCFDurableObjectId;

    beforeEach(() => {
        durable = new MockDurableObjectNamespace();
        cache = new DurableObjectCache({store: () => durable});
        stubId = durable.idFromName('trifrost-cache');
        stub = durable.get(stubId);
        stub.reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('init', () => {
        it('Throws on get before init', async () => {
            await expect(cache.get('x'))
                .rejects
                .toThrow(/TriFrostCache@get: Cache needs to be initialized first/);
        });

        it('Throws on set before init', async () => {
            await expect(cache.set('x', {fail: true}))
                .rejects
                .toThrow(/TriFrostCache@set: Cache needs to be initialized first/);
        });

        it('Throws on delete before init', async () => {
            await expect(cache.del('x'))
                .rejects
                .toThrow(/TriFrostCache@del: Cache needs to be initialized first/);
        });

        it('Throws on wrap before init', async () => {
            await expect(cache.wrap('x', async () => ({computed: true})))
                .rejects
                .toThrow(/TriFrostCache@wrap: Cache needs to be initialized first/);
        });

        it('Does not throw on stop before init', async () => {
            await expect(cache.stop()).resolves.toBe(undefined);
        });

        it('Initializes without throwing', () => {
            expect(() => cache.init({env: true})).not.toThrow();
        });

        it('Can be initialized more than once safely', () => {
            cache.init({env: true});
            expect(() => cache.init({env: true})).not.toThrow();
        });

        it('Uses DurableObjectStore internally', () => {
            cache.init({env: true});
            /* @ts-ignore we're testing this */
            expect(cache.resolvedStore.constructor.name).toBe('DurableObjectStore');
        });
    });

    describe('get', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Returns null for missing key', async () => {
            expect(await cache.get('missing')).toBe(null);
        });

        it('Returns null if value in DurableObject is malformed or not wrapped', async () => {
            await durable.get(stubId).fetch(
                'https://do/trifrost-cache?key=corrupt',
                {
                    method: 'PUT',
                    body: JSON.stringify({v: {not_v: 123}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                }
            );
            expect(await cache.get('corrupt')).toBe(null);
        
            await durable.get(stubId).fetch(
                'https://do/trifrost-cache?key=not-json',
                {
                    method: 'PUT',
                    body: JSON.stringify({v: 'plain string', ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                }
            );
            expect(await cache.get('not-json')).toBe(null);
        });

        it('Returns stored object', async () => {
            await durable.get(stubId).fetch(
                'https://do/trifrost-cache?key=foo',
                {
                    method: 'PUT',
                    body: JSON.stringify({v: {v: {bar: 1}}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                }
            );
            expect(await cache.get('foo')).toEqual({bar: 1});
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=foo', {
                    body: JSON.stringify({v: {v: {bar: 1}}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
                ['https://do/trifrost-cache?key=foo', {
                    method: 'GET',
                }],
            ]);
        });

        it('Returns stored array', async () => {
            await durable.get(stubId).fetch(
                'https://do/trifrost-cache?key=arr',
                {
                    method: 'PUT',
                    body: JSON.stringify({v: {v: [1,2,3]}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                }
            );
            expect(await cache.get('arr')).toEqual([1, 2, 3]);
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=arr', {
                    body: JSON.stringify({v: {v: [1,2,3]}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
                ['https://do/trifrost-cache?key=arr', {
                    method: 'GET',
                }],
            ]);
        });

        it('Returns stored primitive', async () => {
            for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                await durable.get(stubId).fetch(
                    'https://do/trifrost-cache?key=val',
                    {
                        method: 'PUT',
                        body: JSON.stringify({v: {v: el}, ttl: 60}),
                        headers: {'Content-Type': 'application/json'},
                    }
                );
                expect(await cache.get('val')).toEqual(el);
                expect(stub.calls).toEqual([
                    ['https://do/trifrost-cache?key=val', {
                        body: JSON.stringify({v: {v: el}, ttl: 60}),
                        headers: {'Content-Type': 'application/json'},
                        method: 'PUT',
                    }],
                    ['https://do/trifrost-cache?key=val', {
                        method: 'GET',
                    }],
                ]);
                stub.reset();
            }
        });

        it('Delegates to internal fetch GET', async () => {
            const spy = vi.spyOn(durable.get(stubId), 'fetch');
            await cache.get('test-get');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('test-get'), expect.objectContaining({method: 'GET'}));
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=test-get', {
                    method: 'GET',
                }],
            ]);
        });
    });

    describe('set', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Throws if provided undefined', async () => {
            /* @ts-ignore This is what we're testing */
            await expect(cache.set('x'))
                .rejects
                .toThrow(/TriFrostCache@set: Value can not be undefined/);
            expect(stub.isEmpty);
        });

        it('Stores an object', async () => {
            await cache.set('obj', {x: 1});
            expect(await cache.get('obj')).toEqual({x: 1});
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=obj', {
                    body: JSON.stringify({v: {v: {x: 1}}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
                ['https://do/trifrost-cache?key=obj', {
                    method: 'GET',
                }],
            ]);
        });

        it('Stores an array', async () => {
            await cache.set('arr', [1, 2]);
            expect(await cache.get('arr')).toEqual([1, 2]);
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=arr', {
                    body: JSON.stringify({v: {v: [1, 2]}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
                ['https://do/trifrost-cache?key=arr', {
                    method: 'GET',
                }],
            ]);
        });

        it('Stores primitives', async () => {
            for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                await cache.set('val', el);
                expect(await cache.get('val')).toEqual(el);
                expect(stub.calls).toEqual([
                    ['https://do/trifrost-cache?key=val', {
                        body: JSON.stringify({v: {v: el}, ttl: 60}),
                        headers: {'Content-Type': 'application/json'},
                        method: 'PUT',
                    }],
                    ['https://do/trifrost-cache?key=val', {
                        method: 'GET',
                    }],
                ]);
                stub.reset();
            }
        });

        it('Respects TTL', async () => {
            await cache.set('ttl-key', {v: 1}, {ttl: 90});
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=ttl-key', {
                    body: JSON.stringify({v: {v: {v: 1}}, ttl: 90}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
            ]);
        });

        it('Delegates to internal fetch PUT', async () => {
            const spy = vi.spyOn(durable.get(stubId), 'fetch');
            await cache.set('test-set', {val: 1});
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('test-set'), expect.objectContaining({method: 'PUT'}));
        });
    });

    describe('delete', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Deletes an existing key', async () => {
            await cache.set('gone', {x: 1});
            await cache.del('gone');
            expect(await cache.get('gone')).toBe(null);
        });

        it('Does nothing on non-existent key', async () => {
            await expect(cache.del('ghost')).resolves.toBe(undefined);
        });

        it('Delegates to internal fetch DELETE', async () => {
            const spy = vi.spyOn(durable.get(stubId), 'fetch');
            await cache.del('test-del');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('test-del'), expect.objectContaining({method: 'DELETE'}));
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=test-del', {
                    method: 'DELETE',
                }],
            ]);
        });
    });

    describe('wrap', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Returns cached value if present', async () => {
            await cache.set('wrapped', {a: 1});
            const result = await cache.wrap('wrapped', async () => ({fail: true}));
            expect(result).toEqual({a: 1});
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=wrapped', {
                    body: JSON.stringify({v: {v: {a: 1}}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
                ['https://do/trifrost-cache?key=wrapped', {
                    method: 'GET',
                }],
            ]);
        });

        it('Computes and stores value if missing', async () => {
            const result = await cache.wrap('miss', async () => ({hit: true}));
            expect(result).toEqual({hit: true});
            expect(await cache.get('miss')).toEqual({hit: true});
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=miss', {
                    method: 'GET',
                }],
                ['https://do/trifrost-cache?key=miss', {
                    body: JSON.stringify({v: {v: {hit: true}}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
                ['https://do/trifrost-cache?key=miss', {
                    method: 'GET',
                }],
            ]);
        });

        it('Computes and does not store anything if function returns nada', async () => {
            /* @ts-ignore this is what we're testing */
            const result = await cache.wrap('noret', async () => {});
            expect(result).toEqual(undefined);
            expect(await cache.get('noret')).toEqual(null);
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=noret', {
                    method: 'GET',
                }],
                ['https://do/trifrost-cache?key=noret', {
                    method: 'GET',
                }],
            ]);
        });

        it('Computes and does not store anything if function decided to skip', async () => {
            const result = await cache.wrap('nocache', async () => cacheSkip('you_shall_not_pass'));
            expect(result).toEqual('you_shall_not_pass');
            expect(await cache.get('nocache')).toEqual(null);
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=nocache', {
                    method: 'GET',
                }],
                ['https://do/trifrost-cache?key=nocache', {
                    method: 'GET',
                }],
            ]);
        });

        it('Respects TTL during wrap', async () => {
            const result = await cache.wrap('ttl', async () => ({timed: true}), {ttl: 80});
            expect(result).toEqual({timed: true});
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=ttl', {
                    method: 'GET',
                }],
                ['https://do/trifrost-cache?key=ttl', {
                    body: JSON.stringify({v: {v: {timed: true}}, ttl: 80}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
            ]);
        });

        it('Caches null as a valid value from wrap', async () => {
            const result = await cache.wrap('null-key', async () => null);
            expect(result).toBe(null);
            expect(await cache.get('null-key')).toBe(null);
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=null-key', {
                    method: 'GET',
                }],
                ['https://do/trifrost-cache?key=null-key', {
                    body: JSON.stringify({v: {v: null}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
                ['https://do/trifrost-cache?key=null-key', {
                    method: 'GET',
                }],
            ]);
        });

        it('Delegates to internal fetch in wrap()', async () => {
            const spy = vi.spyOn(durable.get(stubId), 'fetch');
            await cache.wrap('wrap-key', async () => ({fresh: true}));
            expect(spy).toHaveBeenCalled();
            expect(stub.calls).toEqual([
                ['https://do/trifrost-cache?key=wrap-key', {
                    method: 'GET',
                }],
                ['https://do/trifrost-cache?key=wrap-key', {
                    body: JSON.stringify({v: {v: {fresh: true}}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                    method: 'PUT',
                }],
            ]);
        });
    });

    describe('stop', () => {
        it('Can be called before init', async () => {
            await expect(cache.stop()).resolves.toBe(undefined);
        });

        it('Completes cleanly after init', async () => {
            cache.init({env: true});
            await expect(cache.stop()).resolves.toBe(undefined);
        });
    });
});
