import {isArray} from '@valkyriestudios/utils/array';
import {sleep} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {cacheSkip} from '../../../lib/modules/Cache/util';
import {DurableObjectStore, DurableObjectCache, DurableObjectRateLimit} from '../../../lib/storage/DurableObject';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType} from '../../../lib/types/constants';
import {type TriFrostContextKind} from '../../../lib/types/context';
import {type TriFrostCFDurableObjectId} from '../../../lib/types/providers';
import {MockContext} from '../../MockContext';
import CONSTANTS from '../../constants';
import {MockDurableObjectNamespace} from '../../MockDurableObject';

describe('Storage - DurableObject', () => {
    let ns:MockDurableObjectNamespace;

    beforeEach(() => {
        ns = new MockDurableObjectNamespace();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Store', () => {
        let store: DurableObjectStore;
        let stub: ReturnType<MockDurableObjectNamespace['get']>;
    
        beforeEach(() => {
            ns = new MockDurableObjectNamespace();
            store = new DurableObjectStore(ns, 'test');
            stub = ns.get(ns.idFromName('trifrost-test'));
            stub.reset();
        });
    
        describe('constructor', () => {
            it('Initializes correctly with a namespace', () => {
                expect(store).toBeInstanceOf(DurableObjectStore);
            });
        });
    
        describe('get', () => {
            it('Returns null for missing key', async () => {
                const result = await store.get('not-set');
                expect(result).toBeNull();
                expect(stub.calls).toEqual([
                    ['https://do/trifrost-test?key=not-set', {method: 'GET'}],
                ]);
            });
    
            it('Returns parsed object if present', async () => {
                stub.map.set('obj', {x: 1});
                const result = await store.get('obj');
                expect(result).toEqual({x: 1});
                expect(stub.calls).toEqual([
                    ['https://do/trifrost-test?key=obj', {method: 'GET'}],
                ]);
            });
    
            it('Returns parsed array if present', async () => {
                stub.map.set('arr', [0, 1, 2]);
                const result = await store.get('arr');
                expect(result).toEqual([0, 1, 2]);
                expect(stub.calls).toEqual([
                    ['https://do/trifrost-test?key=arr', {method: 'GET'}],
                ]);
            });
    
            it('Returns null if stored value is malformed JSON', async () => {
                stub.fetch = async () => new Response('not-json', {status: 200});
                const result = await store.get('bad');
                expect(result).toBe(null);
                expect(stub.isEmpty);
            });
    
            it('Returns null if response is valid JSON but not object/array', async () => {
                stub.fetch = async () => new Response(JSON.stringify('not-a-struct'), {status: 200});
                const result = await store.get('scalar');
                expect(result).toBe(null);
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.get(el as string)).rejects.toThrow(/DurableObjectStore@get: Invalid key/);
                }
                expect(stub.isEmpty).toBe(true);
            });
        });
    
        describe('set', () => {
            it('Stores object with default TTL', async () => {
                await store.set('foo', {a: 1});
                expect(stub.map.get('foo')).toEqual({a: 1});
                expect(stub.calls).toEqual([
                    [
                        'https://do/trifrost-test?key=foo',
                        {method: 'PUT', body: '{"v":{"a":1},"ttl":60}', headers: {'Content-Type': 'application/json'}},
                    ],
                ]);
            });
    
            it('Stores array with default TTL', async () => {
                await store.set('arr', [1, 2, 3]);
                expect(stub.map.get('arr')).toEqual([1, 2, 3]);
                expect(stub.calls).toEqual([
                    [
                        'https://do/trifrost-test?key=arr',
                        {method: 'PUT', body: '{"v":[1,2,3],"ttl":60}', headers: {'Content-Type': 'application/json'}},
                    ],
                ]);
            });
    
            it('Respects custom TTL', async () => {
                await store.set('ttl-key', {y: 2}, {ttl: 120});
                expect(stub.calls).toEqual([
                    [
                        'https://do/trifrost-test?key=ttl-key',
                        {method: 'PUT', body: '{"v":{"y":2},"ttl":120}', headers: {'Content-Type': 'application/json'}},
                    ],
                ]);
            });
    
            it('Falls back to TTL = 60 if invalid', async () => {
                for (const el of [...CONSTANTS.NOT_INTEGER, 0, -1, 10.5]) {
                    await store.set('fallback', {y: 1}, {ttl: el as number});
                    expect(stub.calls).toEqual([
                        [
                            'https://do/trifrost-test?key=fallback',
                            {method: 'PUT', body: '{"v":{"y":1},"ttl":60}', headers: {'Content-Type': 'application/json'}},
                        ],
                    ]);
                    stub.reset();
                }
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.set(el as string, {x: 1})).rejects.toThrow(/DurableObjectStore@set: Invalid key/);
                }
                expect(stub.isEmpty).toBe(true);
            });
    
            it('Throws on non-object/non-array value', async () => {
                for (const el of CONSTANTS.NOT_OBJECT) {
                    if (isArray(el)) continue;
                    await expect(store.set('bad', el as any)).rejects.toThrow(/DurableObjectStore@set: Invalid value/);
                }
    
                for (const el of CONSTANTS.NOT_ARRAY) {
                    if (isObject(el)) continue;
                    await expect(store.set('bad', el as any)).rejects.toThrow(/DurableObjectStore@set: Invalid value/);
                }
                expect(stub.isEmpty).toBe(true);
            });
        });
    
        describe('del', () => {
            it('Deletes key successfully', async () => {
                await store.set('to-del', {z: 9});
                await store.del('to-del');
                expect(stub.calls).toEqual([
                    [
                        'https://do/trifrost-test?key=to-del',
                        {method: 'PUT', body: '{"v":{"z":9},"ttl":60}', headers: {'Content-Type': 'application/json'}},
                    ],
                    [
                        'https://do/trifrost-test?key=to-del',
                        {method: 'DELETE'},
                    ],
                ]);
            });
    
            it('Does nothing for missing key', async () => {
                await store.del('ghost');
                expect(stub.calls).toEqual([
                    [
                        'https://do/trifrost-test?key=ghost',
                        {method: 'DELETE'},
                    ],
                ]);
            });

            it('Deletes all keys matching prefix', async () => {
                await store.del({prefix: 'user.'});
                
                expect(stub.calls).toEqual([
                    [
                        'https://do/trifrost-test?key=user.*',
                        {method: 'DELETE'},
                    ],
                ]);
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del(el as string)).rejects.toThrow(/DurableObjectStore@del: Invalid deletion value/);
                }
                expect(stub.isEmpty).toBe(true);
            });

            it('Throws on invalid prefix', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del({prefix: el as string})).rejects.toThrow(/DurableObjectStore@del: Invalid deletion value/);
                }
                expect(stub.isEmpty).toBe(true);
            });
        });
    
        describe('stop', () => {
            it('Should not do anything and not throw', async () => {
                await store.stop();
                expect(stub.isEmpty).toBe(true);
            });
        });
    });

    describe('Cache', () => {
        let cache: DurableObjectCache;
        let stub: ReturnType<MockDurableObjectNamespace['get']>;
        let stubId:TriFrostCFDurableObjectId;

        beforeEach(() => {
            cache = new DurableObjectCache({store: () => ns});
            stubId = ns.idFromName('trifrost-cache');
            stub = ns.get(stubId);
            stub.reset();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe('init', () => {
            it('Should throw if not provided a store', () => {
                for (const el of [
                    ...CONSTANTS.NOT_OBJECT_WITH_EMPTY,
                    ...[...CONSTANTS.NOT_FUNCTION].map(val => ({store: val})),
                ]) {
                    /* @ts-ignore */
                    expect(() => new DurableObjectCache(el)).toThrow(/DurableObjectCache: Expected a store initializer/);
                }
            });

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
        });

        describe('get', () => {
            beforeEach(() => {
                cache.init({env: true});
            });

            it('Returns null for missing key', async () => {
                expect(await cache.get('missing')).toBe(null);
            });

            it('Returns null if value in DurableObject is malformed or not wrapped', async () => {
                await ns.get(stubId).fetch(
                    'https://do/trifrost-cache?key=corrupt',
                    {
                        method: 'PUT',
                        body: JSON.stringify({v: {not_v: 123}, ttl: 60}),
                        headers: {'Content-Type': 'application/json'},
                    }
                );
                expect(await cache.get('corrupt')).toBe(null);
            
                await ns.get(stubId).fetch(
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
                await ns.get(stubId).fetch(
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
                await ns.get(stubId).fetch(
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
                    await ns.get(stubId).fetch(
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
                const spy = vi.spyOn(ns.get(stubId), 'fetch');
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
                const spy = vi.spyOn(ns.get(stubId), 'fetch');
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
                const spy = vi.spyOn(ns.get(stubId), 'fetch');
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
                const spy = vi.spyOn(ns.get(stubId), 'fetch');
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

    describe('RateLimit', () => {
        let stub: ReturnType<MockDurableObjectNamespace['get']>;
    
        beforeEach(() => {
            stub = ns.get(ns.idFromName('trifrost-ratelimit'));
            stub.reset();
        });
    
        describe('init', () => {
            it('Should throw if not provided a store', () => {
                for (const el of [
                    ...CONSTANTS.NOT_OBJECT_WITH_EMPTY,
                    ...[...CONSTANTS.NOT_FUNCTION].map(val => ({store: val})),
                ]) {
                    /* @ts-ignore */
                    expect(() => new DurableObjectRateLimit(el)).toThrow(/DurableObjectRateLimit: Expected a store initializer/);
                }
            });
    
            it('Initializes with default strategy (fixed) and window (60)', async () => {
                const rl = new DurableObjectRateLimit({store: () => ns});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                ]);
            });
    
            it('Initializes with sliding strategy', async () => {
                const rl = new DurableObjectRateLimit({
                    store: () => ns,
                    strategy: 'sliding',
                });
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('sliding');
                expect(rl.window).toBe(60);
                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {
                        method: 'PUT',
                        body: `{"v":[${now}],"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                ]);
            });
    
            it('Throws for invalid limit types', async () => {
                const rl = new DurableObjectRateLimit({store: () => ns});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(() => -1);
                await mw(ctx);
                expect(ctx.statusCode).toBe(500);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(stub.isEmpty).toBe(true);
            });
    
            it('Skips processing for non-std context kinds', async () => {
                const rl = new DurableObjectRateLimit({store: () => ns});
                const mw = rl.limit(1);
              
                for (const kind of ['notfound', 'health', 'options']) {
                    const ctx = new MockContext({kind: kind as TriFrostContextKind});
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(200);
                    expect(Object.keys(ctx.headers).length).toBe(0);
                    expect(stub.isEmpty).toBe(true);
                }
            });
    
            it('Registers correct introspection symbols', async () => {
                const rl = new DurableObjectRateLimit({store: () => ns});
                const mw = rl.limit(5);
              
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostRateLimit');
                expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
                expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('Middleware for rate limitting contexts passing through it');
                expect(stub.isEmpty).toBe(true);
            });
    
            it('Sets rate limit headers when enabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({window: 1, store: () => ns});
                const now = Math.floor(Date.now()/1000);
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                expect(ctx.headers).toEqual({
                    'Retry-After': 1,
                    'X-RateLimit-Limit': 1,
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': now + 1,
                });
                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":1}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                ]);
            });
    
            it('Disables rate limit headers when disabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({headers: false, store: () => ns});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                expect(ctx.headers).toEqual({
                    'Retry-After': '60',
                });
                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                ]);
            });
    
            it('Supports custom key generators', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({keygen: el => `ip:${el.ip}`, store: () => ns});
                const mw = rl.limit(10);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                expect(ctx.headers).toEqual({
                    'X-RateLimit-Limit': 10,
                    'X-RateLimit-Remaining': 8,
                    'X-RateLimit-Reset': now + rl.window,
                });
                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":2,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                ]);
            });
    
            it('Supports custom exceeded handler', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const exceeded = vi.fn(el => el.status(400));
                const rl = new DurableObjectRateLimit({exceeded, store: () => ns});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(exceeded).toHaveBeenCalledOnce();
                expect(ctx.statusCode).toBe(400);
                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                ]);
            });
    
            it('Generates correct keys for all built-in keygens (with IP)', async () => {
                const ctx = new MockContext({ip: '72.8.34.9', name: 'foo', method: 'GET'});
              
                const expected = {
                    ip: '72.8.34.9',
                    ip_name: '72.8.34.9:foo',
                    ip_method: '72.8.34.9:GET',
                    ip_name_method: '72.8.34.9:foo:GET',
                };
              
                for (const [key, key_expected] of Object.entries(expected)) {
                    const rl = new DurableObjectRateLimit({keygen: key as any, store: () => ns});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now()/1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);
    
                    expect(stub.calls).toEqual([
                        [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                        [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {
                            method: 'PUT',
                            body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                            headers: {'Content-Type': 'application/json'},
                        }],
                        [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                    ]);
                    stub.reset();
                }
            });
              
            it('Falls back to "unknown" if no IP is available', async () => {
                const ctx = new MockContext({ip: null, name: 'foo', method: 'GET'});
              
                const expected = {
                    ip: 'unknown',
                    ip_name: 'unknown:foo',
                    ip_method: 'unknown:GET',
                    ip_name_method: 'unknown:foo:GET',
                };
              
                for (const [key, key_expected] of Object.entries(expected)) {
                    const rl = new DurableObjectRateLimit({keygen: key as any, store: () => ns});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now()/1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);
    
                    expect(stub.calls).toEqual([
                        [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                        [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {
                            method: 'PUT',
                            body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                            headers: {'Content-Type': 'application/json'},
                        }],
                        [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                    ]);
                    stub.reset();
                }
            });
    
            it('Falls back to "unknown" if keygen returns falsy', async () => {
                const rl = new DurableObjectRateLimit({
                    store: () => ns,
                    keygen: () => undefined as unknown as string, /* Force falsy value */
                });
              
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(stub.calls).toEqual([
                    ['https://do/trifrost-ratelimit?key=unknown', {method: 'GET'}],
                    ['https://do/trifrost-ratelimit?key=unknown', {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                    ['https://do/trifrost-ratelimit?key=unknown', {method: 'GET'}],
                ]);
              
                expect(ctx.statusCode).toBe(429);
            });
        });
    
        describe('strategy:fixed', () => {
            it('Allows requests within limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({window: 1000, store: () => ns});
                const mw = rl.limit(2);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });
    
            it('Blocks requests over the limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({window: 1000, store: () => ns});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
            });
        });
    
        describe('strategy:sliding', () => {
            it('Allows requests within windowed limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => ns});
                const mw = rl.limit(3);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });
    
            it('Blocks when timestamps exceed limit in window', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => ns});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
            });
    
            it('Clears oldest timestamps after window expiry', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => ns});
                const mw = rl.limit(1);
                await mw(ctx);
                await sleep(2000);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });
    
            it('Prunes first timestamp if it falls outside the window', async () => {
                const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => ns});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(2);
              
                /* First request */
                await mw(ctx);
              
                /* @ts-ignore Manually insert an old timestamp to simulate an aged entry */
                await rl.resolvedStore.store.set('127.0.0.1:test:POST', [Math.floor(Date.now()/1000) - 2]);
              
                /* Second request triggers pruning of old timestamp */
                await mw(ctx);
              
                /* @ts-ignore We want to test this */
                const val = await rl.resolvedStore.store.get('127.0.0.1:test:POST');
              
                expect(Array.isArray(val)).toBe(true);
                expect(val.length).toBe(1); /* old timestamp pruned */
                expect(val[0]).toBeGreaterThan(Math.floor(Date.now()/1000) - 1); /* only recent timestamp remains */
                expect(ctx.statusCode).toBe(200);
            });
        });
    });
});
