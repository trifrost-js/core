import {sleep} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {cacheSkip} from '../../../lib/modules/Cache/util';
import {KVStore, KVCache, KVRateLimit} from '../../../lib/storage/KV';
import {Sym_TriFrostDescription, Sym_TriFrostName} from '../../../lib/types/constants';
import {type TriFrostContextKind} from '../../../lib/types/context';
import {MockKV} from '../../MockKV';
import {MockContext} from '../../MockContext';
import CONSTANTS from '../../constants';

describe('Storage - KV', () => {
    let kv: MockKV;

    beforeEach(() => {
        kv = new MockKV();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Store', () => {
        let store: KVStore;

        beforeEach(() => {
            store = new KVStore(kv);
        });

        describe('constructor', () => {
            it('initializes correctly with a KV namespace', () => {
                expect(store).toBeInstanceOf(KVStore);
            });
        });

        describe('get', () => {
            it('Returns null for missing keys', async () => {
                const result = await store.get('not-set');
                expect(result).toBeNull();
                expect(kv.calls).toEqual([['get', ['not-set', 'json']]]);
            });

            it('Returns parsed object if present', async () => {
                await kv.put('obj', JSON.stringify({x: 1}));
                const result = await store.get('obj');
                expect(result).toEqual({x: 1});
                expect(kv.calls).toEqual([
                    ['put', ['obj', '{"x":1}', undefined]],
                    ['get', ['obj', 'json']],
                ]);
            });

            it('Returns parsed array if present', async () => {
                await kv.put('val', JSON.stringify([0, 1, 2, {x: 1}]));
                const result = await store.get('val');
                expect(result).toEqual([0, 1, 2, {x: 1}]);
                expect(kv.calls).toEqual([
                    ['put', ['val', '[0,1,2,{"x":1}]', undefined]],
                    ['get', ['val', 'json']],
                ]);
            });

            it('Returns null if stored value is malformed JSON', async () => {
                await kv.put('bad-json', 'not:json');
                const result = await store.get('bad-json');
                expect(result).toBeNull();
                expect(kv.calls).toEqual([
                    ['put', ['bad-json', 'not:json', undefined]],
                    ['get', ['bad-json', 'json']],
                ]);
            });

            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.get(el as string)).rejects.toThrow(/KVStore@get: Invalid key/);
                }
                expect(kv.isEmpty);
            });

            it('Returns null if adapter.get throws (non-spawned)', async () => {
                const errStore = new KVStore({
                    ...kv,
                    get: async () => {
                        throw new Error('kv failure');
                    },
                } as any);

                const result = await errStore.get('boom');
                expect(result).toBeNull();
            });

            it('Logs and returns null if adapter.get throws (spawned)', async () => {
                const ctx = new MockContext();
                const spy = vi.spyOn(ctx.logger, 'error');
                const result = await new KVStore({
                    ...kv,
                    get: async () => {
                        throw new Error('kv exploded');
                    },
                } as any)
                    .spawn(ctx)
                    .get('fail');
                expect(result).toBeNull();
                expect(spy).toHaveBeenCalledWith(expect.any(Error), {key: 'fail'});
            });
        });

        describe('set', () => {
            it('Defaults TTL to 60 if not provided', async () => {
                await store.set('ttl-default', {hello: 'world'});
                expect(kv.calls).toEqual([['put', ['ttl-default', '{"hello":"world"}', {expirationTtl: 60}]]]);
            });

            it('Stores object value as JSON', async () => {
                await store.set('thing', {test: true});
                const result = await store.get('thing');
                expect(result).toEqual({test: true});
                expect(kv.calls).toEqual([
                    ['put', ['thing', '{"test":true}', {expirationTtl: 60}]],
                    ['get', ['thing', 'json']],
                ]);
            });

            it('Stores array value as JSON', async () => {
                await store.set('thing', [0, 1, 2, {test: true}]);
                const result = await store.get('thing');
                expect(result).toEqual([0, 1, 2, {test: true}]);
                expect(kv.calls).toEqual([
                    ['put', ['thing', '[0,1,2,{"test":true}]', {expirationTtl: 60}]],
                    ['get', ['thing', 'json']],
                ]);
            });

            it('Respects provided TTL if valid', async () => {
                await store.set('ttl-key', {y: 2}, {ttl: 300});
                expect(kv.calls).toEqual([['put', ['ttl-key', '{"y":2}', {expirationTtl: 300}]]]);
            });

            it('Falls back to a TTL of 60 if provided TTL is not an integer above 0', async () => {
                for (const el of [...CONSTANTS.NOT_INTEGER, 0, -1, 10.5]) {
                    await store.set('ttl-key', {y: 2}, {ttl: el as number});
                    expect(kv.calls).toEqual([['put', ['ttl-key', '{"y":2}', {expirationTtl: 60}]]]);
                    kv.reset();
                }
            });

            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.set(el as string, {x: 1})).rejects.toThrow(/KVStore@set: Invalid key/);
                }
                expect(kv.isEmpty).toBe(true);
            });

            it('Throws on non-object/non-array value', async () => {
                for (const el of CONSTANTS.NOT_OBJECT) {
                    if (Array.isArray(el)) continue;
                    await expect(store.set('key', el as Record<string, unknown>)).rejects.toThrow(/KVStore@set: Invalid value/);
                }

                for (const el of CONSTANTS.NOT_ARRAY) {
                    if (isObject(el)) continue;
                    await expect(store.set('key', el as Record<string, unknown>)).rejects.toThrow(/KVStore@set: Invalid value/);
                }
                expect(kv.isEmpty).toBe(true);
            });

            it('Does not throw if adapter.set fails (non-spawned)', async () => {
                const errStore = new KVStore({
                    ...kv,
                    put: async () => {
                        throw new Error('KV put died');
                    },
                } as any);

                await expect(errStore.set('key', {x: 1})).resolves.toBeUndefined();
            });

            it('Logs error if adapter.set fails (spawned)', async () => {
                const ctx = new MockContext();
                const spy = vi.spyOn(ctx.logger, 'error');

                await expect(
                    new KVStore({
                        ...kv,
                        put: async () => {
                            throw new Error('cannot set');
                        },
                    } as any)
                        .spawn(ctx)
                        .set('trouble', {x: 5}),
                ).resolves.toBeUndefined();
                expect(spy).toHaveBeenCalledWith(expect.any(Error), {
                    key: 'trouble',
                    value: {x: 5},
                    opts: undefined,
                });
            });
        });

        describe('del', () => {
            it('Removes a key if it exists', async () => {
                await store.set('toremove', {z: 9});
                expect(await store.get('toremove')).toEqual({z: 9});

                await store.del('toremove');
                expect(await store.get('toremove')).toBe(null);

                expect(kv.calls).toEqual([
                    ['put', ['toremove', '{"z":9}', {expirationTtl: 60}]],
                    ['get', ['toremove', 'json']],
                    ['delete', ['toremove']],
                    ['get', ['toremove', 'json']],
                ]);
            });

            it('does nothing for non-existent key', async () => {
                await expect(store.del('ghost')).resolves.toBe(undefined);
                expect(kv.calls).toEqual([['delete', ['ghost']]]);
            });

            it('Deletes all keys matching prefix', async () => {
                await store.set('user.1', {x: 1});
                await store.set('user.2', {y: 2});
                await store.set('auth', {z: 3});

                await store.del({prefix: 'user.'});

                expect(await store.get('user.1')).toBe(null);
                expect(await store.get('user.2')).toBe(null);
                expect(await store.get('auth')).toEqual({z: 3});
                expect(kv.calls).toEqual([
                    ['put', ['user.1', '{"x":1}', {expirationTtl: 60}]],
                    ['put', ['user.2', '{"y":2}', {expirationTtl: 60}]],
                    ['put', ['auth', '{"z":3}', {expirationTtl: 60}]],
                    ['list', [{cursor: undefined, prefix: 'user.'}]],
                    ['delete', ['user.1']],
                    ['delete', ['user.2']],
                    ['get', ['user.1', 'json']],
                    ['get', ['user.2', 'json']],
                    ['get', ['auth', 'json']],
                ]);
            });

            it('Handles prefix that matches no keys gracefully', async () => {
                await store.set('foo', {a: 1});
                await store.del({prefix: 'doesnotexist:'});
                expect(await store.get('foo')).toEqual({a: 1});
                expect(kv.calls).toEqual([
                    ['put', ['foo', '{"a":1}', {expirationTtl: 60}]],
                    ['list', [{cursor: undefined, prefix: 'doesnotexist:'}]],
                    ['get', ['foo', 'json']],
                ]);
            });

            it('throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del(el as string)).rejects.toThrow(/KVStore@del: Invalid deletion value/);
                }
                expect(kv.isEmpty);
            });

            it('Throws on invalid prefix', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del({prefix: el as string})).rejects.toThrow(/KVStore@del: Invalid deletion value/);
                }
                expect(kv.isEmpty).toBe(true);
            });

            it('Does not throw if adapter.del fails (non-spawned)', async () => {
                const errStore = new KVStore({
                    ...kv,
                    delete: async () => {
                        throw new Error('kv delete error');
                    },
                } as any);

                await expect(errStore.del('key')).resolves.toBeUndefined();
            });

            it('Logs error if adapter.del fails for key (spawned)', async () => {
                const ctx = new MockContext();
                const spy = vi.spyOn(ctx.logger, 'error');

                await expect(
                    new KVStore({
                        ...kv,
                        delete: async () => {
                            throw new Error('delete err');
                        },
                    } as any)
                        .spawn(ctx)
                        .del('key'),
                ).resolves.toBeUndefined();
                expect(spy).toHaveBeenCalledWith(expect.any(Error), {val: 'key'});
            });

            it('Logs error if adapter.delPrefixed fails (spawned)', async () => {
                const ctx = new MockContext();
                const spy = vi.spyOn(ctx.logger, 'error');

                await expect(
                    new KVStore({
                        ...kv,
                        list: async () => {
                            throw new Error('list explode');
                        },
                    } as any)
                        .spawn(ctx)
                        .del({prefix: 'x.'}),
                ).resolves.toBeUndefined();
                expect(spy).toHaveBeenCalledWith(expect.any(Error), {val: {prefix: 'x.'}});
            });
        });

        describe('stop', () => {
            it('Should not do anything and not throw', async () => {
                await store.stop();
                expect(kv.isEmpty).toBe(true);
            });
        });
    });

    describe('Cache', () => {
        let cache: KVCache;

        beforeEach(() => {
            cache = new KVCache({store: () => kv});
        });

        describe('init', () => {
            it('Should throw if not provided a store', () => {
                for (const el of [...CONSTANTS.NOT_OBJECT_WITH_EMPTY, ...[...CONSTANTS.NOT_FUNCTION].map(val => ({store: val}))]) {
                    /* @ts-expect-error Should be good */
                    expect(() => new KVCache(el)).toThrow(/KVCache: Expected a store initializer/);
                }
            });

            it('Throws on get before init', async () => {
                await expect(cache.get('x')).rejects.toThrow(/TriFrostCache@get: Cache needs to be initialized first/);
            });

            it('Throws on set before init', async () => {
                await expect(cache.set('x', {fail: true})).rejects.toThrow(/TriFrostCache@set: Cache needs to be initialized first/);
            });

            it('Throws on delete before init', async () => {
                await expect(cache.del('x')).rejects.toThrow(/TriFrostCache@del: Cache needs to be initialized first/);
            });

            it('Throws on wrap before init', async () => {
                await expect(cache.wrap('x', async () => ({computed: true}))).rejects.toThrow(
                    /TriFrostCache@wrap: Cache needs to be initialized first/,
                );
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

            it('Returns null if value in KV is malformed or not wrapped', async () => {
                await kv.put('corrupt', JSON.stringify({not_v: 123}));
                expect(await cache.get('corrupt')).toBe(null);

                await kv.put('not-json', 'plain string');
                expect(await cache.get('not-json')).toBe(null);
            });

            it('Returns stored object', async () => {
                await kv.put('foo', JSON.stringify({v: {bar: 1}}));
                expect(await cache.get('foo')).toEqual({bar: 1});
                expect(kv.calls).toEqual([
                    ['put', ['foo', JSON.stringify({v: {bar: 1}}), undefined]],
                    ['get', ['foo', 'json']],
                ]);
            });

            it('Returns stored array', async () => {
                await kv.put('arr', JSON.stringify({v: [1, 2, 3]}));
                expect(await cache.get('arr')).toEqual([1, 2, 3]);
                expect(kv.calls).toEqual([
                    ['put', ['arr', JSON.stringify({v: [1, 2, 3]}), undefined]],
                    ['get', ['arr', 'json']],
                ]);
            });

            it('Returns stored primitive', async () => {
                for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                    await kv.put('val', JSON.stringify({v: el}));
                    expect(await cache.get('val')).toEqual(el);
                    expect(kv.calls).toEqual([
                        ['put', ['val', JSON.stringify({v: el}), undefined]],
                        ['get', ['val', 'json']],
                    ]);
                    kv.reset();
                }
            });

            it('Delegates to internal store.get', async () => {
                const spy = vi.spyOn(kv, 'get');
                await cache.get('key');
                expect(spy).toHaveBeenCalledWith('key', 'json');
                expect(kv.calls).toEqual([['get', ['key', 'json']]]);
            });
        });

        describe('set', () => {
            beforeEach(() => {
                cache.init({env: true});
            });

            it('Throws if provided undefined', async () => {
                /* @ts-expect-error Should be good */
                await expect(cache.set('x')).rejects.toThrow(/TriFrostCache@set: Value can not be undefined/);
                expect(kv.isEmpty);
            });

            it('Stores an object', async () => {
                await cache.set('obj', {x: 1});
                expect(await cache.get('obj')).toEqual({x: 1});
                expect(kv.calls).toEqual([
                    ['put', ['obj', JSON.stringify({v: {x: 1}}), {expirationTtl: 60}]],
                    ['get', ['obj', 'json']],
                ]);
            });

            it('Stores an array', async () => {
                await cache.set('arr', [1, 2]);
                expect(await cache.get('arr')).toEqual([1, 2]);
                expect(kv.calls).toEqual([
                    ['put', ['arr', JSON.stringify({v: [1, 2]}), {expirationTtl: 60}]],
                    ['get', ['arr', 'json']],
                ]);
            });

            it('Stores primitives', async () => {
                for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                    await cache.set('val', el);
                    expect(await cache.get('val')).toEqual(el);
                    expect(kv.calls).toEqual([
                        ['put', ['val', JSON.stringify({v: el}), {expirationTtl: 60}]],
                        ['get', ['val', 'json']],
                    ]);
                    kv.reset();
                }
            });

            it('Respects TTL', async () => {
                await cache.set('with-ttl', {v: 9}, {ttl: 120});
                expect(kv.calls.at(-1)).toEqual(['put', ['with-ttl', JSON.stringify({v: {v: 9}}), {expirationTtl: 120}]]);
            });

            it('Delegates to internal store.set', async () => {
                const spy = vi.spyOn(kv, 'put');
                await cache.set('spy', {val: 1}, {ttl: 55});
                expect(spy).toHaveBeenCalledWith('spy', JSON.stringify({v: {val: 1}}), {
                    expirationTtl: 55,
                });
            });
        });

        describe('delete', () => {
            beforeEach(() => {
                cache.init({env: true});
            });

            it('Deletes a key', async () => {
                await cache.set('gone', {v: 1});
                await cache.del('gone');
                expect(await cache.get('gone')).toBe(null);
            });

            it('Does nothing on missing key', async () => {
                await expect(cache.del('ghost')).resolves.toBe(undefined);
            });

            it('Delegates to internal store.del', async () => {
                const spy = vi.spyOn(kv, 'delete');
                await cache.del('x');
                expect(spy).toHaveBeenCalledWith('x');
                expect(kv.calls).toEqual([['delete', ['x']]]);
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
                expect(kv.calls).toEqual([
                    ['put', ['wrapped', JSON.stringify({v: {a: 1}}), {expirationTtl: 60}]],
                    ['get', ['wrapped', 'json']],
                ]);
            });

            it('Computes and stores value if missing', async () => {
                const result = await cache.wrap('miss', async () => ({hit: true}));
                expect(result).toEqual({hit: true});
                expect(await cache.get('miss')).toEqual({hit: true});
                expect(kv.calls).toEqual([
                    ['get', ['miss', 'json']],
                    ['put', ['miss', JSON.stringify({v: {hit: true}}), {expirationTtl: 60}]],
                    ['get', ['miss', 'json']],
                ]);
            });

            it('Computes and does not store anything if function returns nada', async () => {
                /* @ts-expect-error Should be good */
                const result = await cache.wrap('noret', async () => {});
                expect(result).toEqual(undefined);
                expect(await cache.get('noret')).toEqual(null);
                expect(kv.calls).toEqual([
                    ['get', ['noret', 'json']],
                    ['get', ['noret', 'json']],
                ]);
            });

            it('Computes and does not store anything if function decided to skip', async () => {
                const result = await cache.wrap('nocache', async () => cacheSkip('you_shall_not_pass'));
                expect(result).toEqual('you_shall_not_pass');
                expect(await cache.get('nocache')).toEqual(null);
                expect(kv.calls).toEqual([
                    ['get', ['nocache', 'json']],
                    ['get', ['nocache', 'json']],
                ]);
            });

            it('Respects TTL during wrap', async () => {
                const result = await cache.wrap('with-ttl', async () => ({cached: true}), {ttl: 80});
                expect(result).toEqual({cached: true});
                expect(kv.calls).toEqual([
                    ['get', ['with-ttl', 'json']],
                    ['put', ['with-ttl', JSON.stringify({v: {cached: true}}), {expirationTtl: 80}]],
                ]);
            });

            it('Caches null as a valid value from wrap', async () => {
                const result = await cache.wrap('null-key', async () => null);
                expect(result).toBe(null);
                expect(await cache.get('null-key')).toBe(null);
                expect(kv.calls).toEqual([
                    ['get', ['null-key', 'json']],
                    ['put', ['null-key', JSON.stringify({v: null}), {expirationTtl: 60}]],
                    ['get', ['null-key', 'json']],
                ]);
            });

            it('Delegates to internal get/set during wrap', async () => {
                const getSpy = vi.spyOn(kv, 'get');
                const putSpy = vi.spyOn(kv, 'put');
                await cache.wrap('combo', async () => ({cool: true}), {ttl: 99});
                expect(getSpy).toHaveBeenCalledWith('combo', 'json');
                expect(putSpy).toHaveBeenCalledWith('combo', JSON.stringify({v: {cool: true}}), {expirationTtl: 99});
                expect(kv.calls).toEqual([
                    ['get', ['combo', 'json']],
                    ['put', ['combo', JSON.stringify({v: {cool: true}}), {expirationTtl: 99}]],
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
        describe('init', () => {
            it('Should throw if not provided a store', () => {
                for (const el of [...CONSTANTS.NOT_OBJECT_WITH_EMPTY, ...[...CONSTANTS.NOT_FUNCTION].map(val => ({store: val}))]) {
                    /* @ts-expect-error Should be good */
                    expect(() => new KVRateLimit(el)).toThrow(/KVRateLimit: Expected a store initializer/);
                }
            });

            it('Initializes with default strategy (fixed) and window (60)', async () => {
                const rl = new KVRateLimit({store: () => kv});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                const now = Math.floor(Date.now() / 1000);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(kv.calls).toEqual([
                    ['get', ['127.0.0.1:route:GET', 'json']],
                    ['put', ['127.0.0.1:route:GET', `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                ]);
            });

            it('Initializes with sliding strategy', async () => {
                const rl = new KVRateLimit({
                    store: () => kv,
                    strategy: 'sliding',
                });
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                const now = Math.floor(Date.now() / 1000);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('sliding');
                expect(rl.window).toBe(60);
                expect(kv.calls).toEqual([
                    ['get', ['127.0.0.1:route:GET', 'json']],
                    ['put', ['127.0.0.1:route:GET', `[${now}]`, {expirationTtl: 60}]],
                ]);
            });

            it('Throws for invalid limit types', async () => {
                const rl = new KVRateLimit({store: () => kv});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(() => -1);
                await mw(ctx);
                expect(ctx.statusCode).toBe(500);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(kv.isEmpty).toBe(true);
            });

            it('Skips processing for non-std context kinds', async () => {
                const rl = new KVRateLimit({store: () => kv});
                const mw = rl.limit(1);

                for (const kind of ['notfound', 'health', 'options']) {
                    const ctx = new MockContext({kind: kind as TriFrostContextKind});
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(200);
                    expect(Object.keys(ctx.headers).length).toBe(0);
                    expect(kv.isEmpty).toBe(true);
                }
            });

            it('Registers correct introspection symbols', async () => {
                const rl = new KVRateLimit({store: () => kv});
                const mw = rl.limit(5);

                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostRateLimit');
                expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('Middleware for rate limitting contexts passing through it');
                expect(kv.isEmpty).toBe(true);
            });

            it('Sets rate limit headers when enabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({window: 1, store: () => kv});
                const now = Math.floor(Date.now() / 1000);
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                expect(ctx.headers).toEqual({
                    'retry-after': 1,
                    'x-ratelimit-limit': 1,
                    'x-ratelimit-remaining': '0',
                    'x-ratelimit-reset': now + 1,
                });
                expect(kv.calls).toEqual([
                    ['get', ['127.0.0.1:test:POST', 'json']],
                    ['put', ['127.0.0.1:test:POST', `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 1}]],
                    ['get', ['127.0.0.1:test:POST', 'json']],
                ]);
            });

            it('Disables rate limit headers when disabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({headers: false, store: () => kv});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now() / 1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                expect(ctx.headers).toEqual({
                    'retry-after': '60',
                });
                expect(kv.calls).toEqual([
                    ['get', ['127.0.0.1:test:POST', 'json']],
                    ['put', ['127.0.0.1:test:POST', `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                    ['get', ['127.0.0.1:test:POST', 'json']],
                ]);
            });

            it('Supports custom key generators', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({keygen: el => `ip:${el.ip}`, store: () => kv});
                const mw = rl.limit(10);
                const now = Math.floor(Date.now() / 1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                expect(ctx.headers).toEqual({
                    'x-ratelimit-limit': 10,
                    'x-ratelimit-remaining': 8,
                    'x-ratelimit-reset': now + rl.window,
                });
                expect(kv.calls).toEqual([
                    ['get', ['ip:127.0.0.1', 'json']],
                    ['put', ['ip:127.0.0.1', `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                    ['get', ['ip:127.0.0.1', 'json']],
                    ['put', ['ip:127.0.0.1', `{"amt":2,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                ]);
            });

            it('Supports custom exceeded handler', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const exceeded = vi.fn(el => el.status(400));
                const rl = new KVRateLimit({exceeded, store: () => kv});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now() / 1000);
                await mw(ctx);
                await mw(ctx);
                expect(exceeded).toHaveBeenCalledOnce();
                expect(ctx.statusCode).toBe(400);
                expect(kv.calls).toEqual([
                    ['get', ['127.0.0.1:test:POST', 'json']],
                    ['put', ['127.0.0.1:test:POST', `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                    ['get', ['127.0.0.1:test:POST', 'json']],
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
                    const rl = new KVRateLimit({keygen: key as any, store: () => kv});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now() / 1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);

                    expect(kv.calls).toEqual([
                        ['get', [key_expected, 'json']],
                        ['put', [key_expected, `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                        ['get', [key_expected, 'json']],
                    ]);
                    kv.reset();
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
                    const rl = new KVRateLimit({keygen: key as any, store: () => kv});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now() / 1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);

                    expect(kv.calls).toEqual([
                        ['get', [key_expected, 'json']],
                        ['put', [key_expected, `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                        ['get', [key_expected, 'json']],
                    ]);
                    kv.reset();
                }
            });

            it('Falls back to "unknown" if keygen returns falsy', async () => {
                const rl = new KVRateLimit({
                    store: () => kv,
                    keygen: () => undefined as unknown as string /* Force falsy value */,
                });

                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now() / 1000);
                await mw(ctx);
                await mw(ctx);
                expect(kv.calls).toEqual([
                    ['get', ['unknown', 'json']],
                    ['put', ['unknown', `{"amt":1,"reset":${now + rl.window}}`, {expirationTtl: 60}]],
                    ['get', ['unknown', 'json']],
                ]);

                expect(ctx.statusCode).toBe(429);
            });
        });

        describe('strategy:fixed', () => {
            it('Allows requests within limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({window: 1000, store: () => kv});
                const mw = rl.limit(2);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });

            it('Blocks requests over the limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({window: 1000, store: () => kv});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
            });
        });

        describe('strategy:sliding', () => {
            it('Allows requests within windowed limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({strategy: 'sliding', window: 1, store: () => kv});
                const mw = rl.limit(3);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });

            it('Blocks when timestamps exceed limit in window', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({strategy: 'sliding', window: 1, store: () => kv});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
            });

            it('Clears oldest timestamps after window expiry', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new KVRateLimit({strategy: 'sliding', window: 1, store: () => kv});
                const mw = rl.limit(1);
                await mw(ctx);
                await sleep(2000);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });

            it('Prunes first timestamp if it falls outside the window', async () => {
                const rl = new KVRateLimit({strategy: 'sliding', window: 1, store: () => kv});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(2);

                /* First request */
                await mw(ctx);

                /* @ts-expect-error Should be good */
                await rl.resolvedStore.store.set('127.0.0.1:test:POST', [Math.floor(Date.now() / 1000) - 2]);

                /* Second request triggers pruning of old timestamp */
                await mw(ctx);

                /* @ts-expect-error Should be good */
                const val = await rl.resolvedStore.store.get('127.0.0.1:test:POST');

                expect(Array.isArray(val)).toBe(true);
                expect(val.length).toBe(1); /* old timestamp pruned */
                expect(val[0]).toBeGreaterThan(Math.floor(Date.now() / 1000) - 1); /* only recent timestamp remains */
                expect(ctx.statusCode).toBe(200);
            });
        });
    });
});
