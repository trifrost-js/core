import {sleep} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {cacheSkip} from '../../../lib/modules/Cache/util';
import {RedisStore, RedisCache, RedisRateLimit} from '../../../lib/storage/Redis';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType} from '../../../lib/types/constants';
import {type TriFrostContextKind} from '../../../lib/types/context';
import {MockRedis} from '../../MockRedis';
import {MockContext} from '../../MockContext';
import CONSTANTS from '../../constants';

describe('Storage - Redis', () => {
    let redis:MockRedis;

    beforeEach(() => {
        redis = new MockRedis();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Store', () => {
        let store: RedisStore;
    
        beforeEach(() => {
            store = new RedisStore(redis);
        });
    
        describe('constructor', () => {
            it('Initializes correctly with a Redis client', () => {
                expect(store).toBeInstanceOf(RedisStore);
            });
        });
    
        describe('get', () => {
            it('Returns null for missing keys', async () => {
                const result = await store.get('not-set');
                expect(result).toBeNull();
                expect(redis.calls).toEqual([
                    ['get', ['not-set']],
                ]);
            });
    
            it('Returns parsed object if present', async () => {
                await redis.set('obj', JSON.stringify({x: 1}));
                const result = await store.get('obj');
                expect(result).toEqual({x: 1});
                expect(redis.calls).toEqual([
                    ['set', ['obj', '{"x":1}', []]],
                    ['get', ['obj']],
                ]);
            });
    
            it('Returns parsed array if present', async () => {
                await redis.set('arr', JSON.stringify([0, 1, 2]));
                const result = await store.get('arr');
                expect(result).toEqual([0, 1, 2]);
                expect(redis.calls).toEqual([
                    ['set', ['arr', '[0,1,2]', []]],
                    ['get', ['arr']],
                ]);
            });
    
            it('Returns null if stored value is malformed JSON', async () => {
                await redis.set('bad-json', '{invalid}');
                const result = await store.get('bad-json');
                expect(result).toBe(null);
                expect(redis.calls).toEqual([
                    ['set', ['bad-json', '{invalid}', []]],
                    ['get', ['bad-json']],
                ]);
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.get(el as string)).rejects.toThrow(/RedisStore@get: Invalid key/);
                }
                expect(redis.isEmpty).toBe(true);
            });
    
            it('Returns null on Redis get failure', async () => {
                const errStore = new RedisStore({
                    ...redis,
                    get: async () => {
                        throw new Error('Redis down'); 
                    },
                } as any);
    
                const result = await errStore.get('foo');
                expect(result).toBeNull();
            });
        });
    
        describe('set', () => {
            it('Stores object with default TTL', async () => {
                await store.set('foo', {a: 1});
                expect(redis.calls).toEqual([
                    ['set', ['foo', '{"a":1}', ['EX', 60]]],
                ]);
            });
    
            it('Stores array with default TTL', async () => {
                await store.set('arr', [1, 2, 3]);
                expect(redis.calls).toEqual([
                    ['set', ['arr', '[1,2,3]', ['EX', 60]]],
                ]);
            });
    
            it('Respects custom TTL', async () => {
                await store.set('foo', {x: 2}, {ttl: 120});
                expect(redis.calls).toEqual([
                    ['set', ['foo', '{"x":2}', ['EX', 120]]],
                ]);
            });
    
            it('Falls back to TTL = 60 if invalid', async () => {
                for (const el of [...CONSTANTS.NOT_INTEGER, 0, -1, 10.5]) {
                    await store.set('fallback', {y: 1}, {ttl: el as number});
                    expect(redis.calls).toEqual([
                        ['set', ['fallback', '{"y":1}', ['EX', 60]]],
                    ]);
                    redis.reset();
                }
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.set(el as string, {x: 1})).rejects.toThrow(/RedisStore@set: Invalid key/);
                }
                expect(redis.isEmpty).toBe(true);
            });
    
            it('Throws on non-object/non-array value', async () => {
                for (const el of CONSTANTS.NOT_OBJECT) {
                    if (Array.isArray(el)) continue;
                    await expect(store.set('bad', el as any)).rejects.toThrow(/RedisStore@set: Invalid value/);
                }
    
                for (const el of CONSTANTS.NOT_ARRAY) {
                    if (isObject(el)) continue;
                    await expect(store.set('bad', el as any)).rejects.toThrow(/RedisStore@set: Invalid value/);
                }
    
                expect(redis.isEmpty).toBe(true);
            });
    
            it('Ignores Redis errors during set', async () => {
                const errStore = new RedisStore({
                    ...redis,
                    set: async () => {
                        throw new Error('Set failed'); 
                    },
                } as any);
    
                await expect(errStore.set('x', {ok: true})).resolves.toBeUndefined();
            });
        });
    
        describe('del', () => {
            it('Deletes key successfully', async () => {
                await store.set('to-del', {z: 9});
                await store.del('to-del');
                expect(redis.calls).toEqual([
                    ['set', ['to-del', '{"z":9}', ['EX', 60]]],
                    ['del', ['to-del']],
                ]);
            });
    
            it('Does nothing for missing key', async () => {
                await store.del('ghost');
                expect(redis.calls).toEqual([
                    ['del', ['ghost']],
                ]);
            });
    
            it('Deletes all keys matching prefix', async () => {
                await store.set('a.1', {x: 1});
                await store.set('a.2', {y: 2});
                await store.set('b.1', {z: 3});
                await store.del({prefix: 'a.'});
                expect(redis.calls).toEqual([
                    ['set', ['a.1', '{"x":1}', ['EX', 60]]],
                    ['set', ['a.2', '{"y":2}', ['EX', 60]]],
                    ['set', ['b.1', '{"z":3}', ['EX', 60]]],
                    ['scan', ['0', 'MATCH', 'a.*', 'COUNT', 250]],
                    ['del', ['a.1', 'a.2']],
                ]);
            });
    
            it('Handles no matches for prefix without error', async () => {
                await store.set('x', {a: 1});
                await store.del({prefix: 'not-found:'});
                expect(redis.calls).toEqual([
                    ['set', ['x', '{"a":1}', ['EX', 60]]],
                    ['scan', ['0', 'MATCH', 'not-found:*', 'COUNT', 250]],
                ]);
            });
    
            it('Performs multiple scan/del calls when prefix match exceeds count', async () => {
                /* Insert 260 keys so that scan (COUNT = 250) will require 2 rounds */
                for (let i = 0; i < 260; i++) {
                    await store.set(`p.${i}`, {x: i});
                }
            
                await store.del({prefix: 'p.'});
            
                const scans = redis.calls.filter(([cmd]) => cmd === 'scan');
                const dels = redis.calls.filter(([cmd]) => cmd === 'del');
            
                /* Expect at least two scan calls due to count limit */
                expect(scans.length).toBeGreaterThanOrEqual(2);
            
                /* Expect del calls to be batched (100 per batch max) */
                const del_keys = dels.flatMap(([_cmd, args]) => args);
                expect(del_keys.length).toBe(260);
                for (let i = 0; i < 260; i++) expect(del_keys).toContain(`p.${i}`);
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del(el as string)).rejects.toThrow(/RedisStore@del: Invalid deletion value/);
                }
                expect(redis.isEmpty).toBe(true);
            });
    
            it('Throws on invalid prefix', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del({prefix: el as string})).rejects.toThrow(/RedisStore@del: Invalid deletion value/);
                }
                expect(redis.isEmpty).toBe(true);
            });
    
            it('Gracefully handles scan errors during prefix deletion', async () => {
                const errStore = new RedisStore({
                    ...redis,
                    scan: async () => {
                        throw new Error('Scan failed'); 
                    },
                } as any);
    
                await expect(errStore.del({prefix: 'some:'})).resolves.toBeUndefined();
            });
    
            it('Gracefully handles del errors during prefix deletion', async () => {
                await store.set('match.1', {x: 1});
                await store.set('match.2', {x: 2});
                redis.del = async () => {
                    throw new Error('Del failed'); 
                };
                await expect(store.del({prefix: 'match.'})).resolves.toBeUndefined();
            });
        });
    
        describe('stop', () => {
            it('Should not do anything and not throw', async () => {
                await store.stop();
                expect(redis.isEmpty).toBe(true);
            });
        });
    });

    describe('Cache', () => {
        let cache: RedisCache;

        beforeEach(() => {
            cache = new RedisCache({store: () => redis});
        });

        describe('init', () => {
            it('Should throw if not provided a store', () => {
                for (const el of [
                    ...CONSTANTS.NOT_OBJECT_WITH_EMPTY,
                    ...[...CONSTANTS.NOT_FUNCTION].map(val => ({store: val})),
                ]) {
                    /* @ts-ignore */
                    expect(() => new RedisCache(el)).toThrow(/RedisCache: Expected a store initializer/);
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

            it('Returns null if value in Redis is malformed or not wrapped', async () => {
                await redis.set('corrupt', JSON.stringify({not_v: 123}));
                expect(await cache.get('corrupt')).toBe(null);
            
                await redis.set('not-json', 'plain string');
                expect(await cache.get('not-json')).toBe(null);
            });        

            it('Returns stored object', async () => {
                await redis.set('foo', JSON.stringify({v: {bar: 1}}));
                expect(await cache.get('foo')).toEqual({bar: 1});
                expect(redis.calls).toEqual([
                    ['set', ['foo', JSON.stringify({v: {bar: 1}}), []]],
                    ['get', ['foo']],
                ]);
            });

            it('Returns stored array', async () => {
                await redis.set('arr', JSON.stringify({v: [1, 2, 3]}));
                expect(await cache.get('arr')).toEqual([1, 2, 3]);
                expect(redis.calls).toEqual([
                    ['set', ['arr', JSON.stringify({v: [1,2,3]}), []]],
                    ['get', ['arr']],
                ]);
            });

            it('Returns stored primitive', async () => {
                for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                    await redis.set('val', JSON.stringify({v: el}));
                    expect(await cache.get('val')).toEqual(el);
                    expect(redis.calls).toEqual([
                        ['set', ['val', JSON.stringify({v: el}), []]],
                        ['get', ['val']],
                    ]);
                    redis.reset();
                }
            });

            it('Delegates to internal store.get', async () => {
                const spy = vi.spyOn(redis, 'get');
                await cache.get('key');
                expect(spy).toHaveBeenCalledWith('key');
                expect(redis.calls).toEqual([
                    ['get', ['key']],
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
                expect(redis.isEmpty);
            });

            it('Stores an object', async () => {
                await cache.set('obj', {x: 1});
                expect(await cache.get('obj')).toEqual({x: 1});
                expect(redis.calls).toEqual([
                    ['set', ['obj', JSON.stringify({v: {x: 1}}), ['EX', 60]]],
                    ['get', ['obj']],
                ]);
            });

            it('Stores an array', async () => {
                await cache.set('arr', [1, 2]);
                expect(await cache.get('arr')).toEqual([1, 2]);
                expect(redis.calls).toEqual([
                    ['set', ['arr', JSON.stringify({v: [1, 2]}), ['EX', 60]]],
                    ['get', ['arr']],
                ]);
            });

            it('Stores primitives', async () => {
                for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                    await cache.set('val', el);
                    expect(await cache.get('val')).toEqual(el);
                    expect(redis.calls).toEqual([
                        ['set', ['val', JSON.stringify({v: el}), ['EX', 60]]],
                        ['get', ['val']],
                    ]);
                    redis.reset();
                }
            });

            it('Respects TTL', async () => {
                await cache.set('with-ttl', {v: 9}, {ttl: 120});
                expect(redis.calls.at(-1)).toEqual([
                    'set',
                    ['with-ttl', JSON.stringify({v: {v: 9}}), ['EX', 120]],
                ]);
            });

            it('Delegates to internal store.set', async () => {
                const spy = vi.spyOn(redis, 'set');
                await cache.set('spy', {val: 1}, {ttl: 55});
                expect(spy).toHaveBeenCalledWith('spy', JSON.stringify({v: {val: 1}}), 'EX', 55);
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
                const spy = vi.spyOn(redis, 'del');
                await cache.del('x');
                expect(spy).toHaveBeenCalledWith('x');
                expect(redis.calls).toEqual([['del', ['x']]]);
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
                expect(redis.calls).toEqual([
                    ['set', ['wrapped', JSON.stringify({v: {a: 1}}), ['EX', 60]]],
                    ['get', ['wrapped']],
                ]);
            });

            it('Computes and stores value if missing', async () => {
                const result = await cache.wrap('miss', async () => ({hit: true}));
                expect(result).toEqual({hit: true});
                expect(await cache.get('miss')).toEqual({hit: true});
                expect(redis.calls).toEqual([
                    ['get', ['miss']],
                    ['set', ['miss', JSON.stringify({v: {hit: true}}), ['EX', 60]]],
                    ['get', ['miss']],
                ]);
            });

            it('Computes and does not store anything if function returns nada', async () => {
                /* @ts-ignore this is what we're testing */
                const result = await cache.wrap('noret', async () => {});
                expect(result).toEqual(undefined);
                expect(await cache.get('noret')).toEqual(null);
                expect(redis.calls).toEqual([
                    ['get', ['noret']],
                    ['get', ['noret']],
                ]);
            });

            it('Computes and does not store anything if function decided to skip', async () => {
                const result = await cache.wrap('nocache', async () => cacheSkip('you_shall_not_pass'));
                expect(result).toEqual('you_shall_not_pass');
                expect(await cache.get('nocache')).toEqual(null);
                expect(redis.calls).toEqual([
                    ['get', ['nocache']],
                    ['get', ['nocache']],
                ]);
            });

            it('Respects TTL during wrap', async () => {
                const result = await cache.wrap(
                    'with-ttl',
                    async () => ({cached: true}),
                    {ttl: 80}
                );
                expect(result).toEqual({cached: true});
                expect(redis.calls).toEqual([
                    ['get', ['with-ttl']],
                    ['set', ['with-ttl', JSON.stringify({v: {cached: true}}), ['EX', 80]]],
                ]);
            });

            it('Caches null as a valid value from wrap', async () => {
                const result = await cache.wrap('null-key', async () => null);
                expect(result).toBe(null);
                expect(await cache.get('null-key')).toBe(null);
                expect(redis.calls).toEqual([
                    ['get', ['null-key']],
                    ['set', ['null-key', JSON.stringify({v: null}), ['EX', 60]]],
                    ['get', ['null-key']],
                ]);
            });        

            it('Delegates to internal get/set during wrap', async () => {
                const getSpy = vi.spyOn(redis, 'get');
                const putSpy = vi.spyOn(redis, 'set');
                await cache.wrap('combo', async () => ({cool: true}), {ttl: 99});
                expect(getSpy).toHaveBeenCalledWith('combo');
                expect(putSpy).toHaveBeenCalledWith(
                    'combo',
                    JSON.stringify({v: {cool: true}}),
                    'EX',
                    99
                );
                expect(redis.calls).toEqual([
                    ['get', ['combo']],
                    ['set', ['combo', JSON.stringify({v: {cool: true}}), ['EX', 99]]],
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
                for (const el of [
                    ...CONSTANTS.NOT_OBJECT_WITH_EMPTY,
                    ...[...CONSTANTS.NOT_FUNCTION].map(val => ({store: val})),
                ]) {
                    /* @ts-ignore */
                    expect(() => new RedisRateLimit(el)).toThrow(/RedisRateLimit: Expected a store initializer/);
                }
            });
    
            it('Initializes with default strategy (fixed) and window (60)', async () => {
                const rl = new RedisRateLimit({store: () => redis});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(redis.calls).toEqual([
                    ['get', ['127.0.0.1:route:GET']],
                    ['set', ['127.0.0.1:route:GET', `{"amt":1,"reset":${now+rl.window}}`, ['EX', 60]]],
                ]);
            });
    
            it('Initializes with sliding strategy', async () => {
                const rl = new RedisRateLimit({
                    store: () => redis,
                    strategy: 'sliding',
                });
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('sliding');
                expect(rl.window).toBe(60);
                expect(redis.calls).toEqual([
                    ['get', ['127.0.0.1:route:GET']],
                    ['set', ['127.0.0.1:route:GET', `[${now}]`, ['EX', 60]]],
                ]);
            });
    
            it('Throws for invalid limit types', async () => {
                const rl = new RedisRateLimit({store: () => redis});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(() => -1);
                await mw(ctx);
                expect(ctx.statusCode).toBe(500);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(redis.isEmpty).toBe(true);
            });
    
            it('Skips processing for non-std context kinds', async () => {
                const rl = new RedisRateLimit({store: () => redis});
                const mw = rl.limit(1);
                
                for (const kind of ['notfound', 'health', 'options']) {
                    const ctx = new MockContext({kind: kind as TriFrostContextKind});
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(200);
                    expect(Object.keys(ctx.headers).length).toBe(0);
                    expect(redis.isEmpty).toBe(true);
                }
            });
    
            it('Registers correct introspection symbols', async () => {
                const rl = new RedisRateLimit({store: () => redis});
                const mw = rl.limit(5);
                
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostRateLimit');
                expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
                expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('Middleware for rate limitting contexts passing through it');
                expect(redis.isEmpty).toBe(true);
            });
    
            it('Sets rate limit headers when enabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({window: 1, store: () => redis});
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
                expect(redis.calls).toEqual([
                    ['get', ['127.0.0.1:test:POST']],
                    ['set', ['127.0.0.1:test:POST', `{"amt":1,"reset":${now+rl.window}}`, ['EX', 1]]],
                    ['get', ['127.0.0.1:test:POST']],
                ]);
            });
    
            it('Disables rate limit headers when disabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({headers: false, store: () => redis});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                expect(ctx.headers).toEqual({
                    'Retry-After': '60',
                });
                expect(redis.calls).toEqual([
                    ['get', ['127.0.0.1:test:POST']],
                    ['set', ['127.0.0.1:test:POST', `{"amt":1,"reset":${now+rl.window}}`, ['EX', 60]]],
                    ['get', ['127.0.0.1:test:POST']],
                ]);
            });
    
            it('Supports custom key generators', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({keygen: el => `ip:${el.ip}`, store: () => redis});
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
                expect(redis.calls).toEqual([
                    ['get', ['ip:127.0.0.1']],
                    ['set', ['ip:127.0.0.1', `{"amt":1,"reset":${now+rl.window}}`, ['EX', 60]]],
                    ['get', ['ip:127.0.0.1']],
                    ['set', ['ip:127.0.0.1', `{"amt":2,"reset":${now+rl.window}}`, ['EX', 60]]],
                ]);
            });
    
            it('Supports custom exceeded handler', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const exceeded = vi.fn(el => el.status(400));
                const rl = new RedisRateLimit({exceeded, store: () => redis});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(exceeded).toHaveBeenCalledOnce();
                expect(ctx.statusCode).toBe(400);
                expect(redis.calls).toEqual([
                    ['get', ['127.0.0.1:test:POST']],
                    ['set', ['127.0.0.1:test:POST', `{"amt":1,"reset":${now+rl.window}}`, ['EX', 60]]],
                    ['get', ['127.0.0.1:test:POST']],
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
                    const rl = new RedisRateLimit({keygen: key as any, store: () => redis});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now()/1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);
    
                    expect(redis.calls).toEqual([
                        ['get', [key_expected]],
                        ['set', [key_expected, `{"amt":1,"reset":${now+rl.window}}`, ['EX', 60]]],
                        ['get', [key_expected]],
                    ]);
                    redis.reset();
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
                    const rl = new RedisRateLimit({keygen: key as any, store: () => redis});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now()/1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);
    
                    expect(redis.calls).toEqual([
                        ['get', [key_expected]],
                        ['set', [key_expected, `{"amt":1,"reset":${now+rl.window}}`, ['EX', 60]]],
                        ['get', [key_expected]],
                    ]);
                    redis.reset();
                }
            });
    
            it('Falls back to "unknown" if keygen returns falsy', async () => {
                const rl = new RedisRateLimit({
                    store: () => redis,
                    keygen: () => undefined as unknown as string, /* Force falsy value */
                });
                
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(redis.calls).toEqual([
                    ['get', ['unknown']],
                    ['set', ['unknown', `{"amt":1,"reset":${now+rl.window}}`, ['EX', 60]]],
                    ['get', ['unknown']],
                ]);
                
                expect(ctx.statusCode).toBe(429);
            });
        });
    
        describe('strategy:fixed', () => {
            it('Allows requests within limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({window: 1000, store: () => redis});
                const mw = rl.limit(2);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });
    
            it('Blocks requests over the limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({window: 1000, store: () => redis});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
            });
        });
    
        describe('strategy:sliding', () => {
            it('Allows requests within windowed limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({strategy: 'sliding', window: 1, store: () => redis});
                const mw = rl.limit(3);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });
    
            it('Blocks when timestamps exceed limit in window', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({strategy: 'sliding', window: 1, store: () => redis});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
            });
    
            it('Clears oldest timestamps after window expiry', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new RedisRateLimit({strategy: 'sliding', window: 1, store: () => redis});
                const mw = rl.limit(1);
                await mw(ctx);
                await sleep(2000);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });
    
            it('Prunes first timestamp if it falls outside the window', async () => {
                const rl = new RedisRateLimit({strategy: 'sliding', window: 1, store: () => redis});
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
