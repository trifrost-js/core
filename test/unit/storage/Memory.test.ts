import {sleep} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {MemoryStore, MemoryCache, MemoryRateLimit}  from '../../../lib/storage/Memory';
import {cacheSkip} from '../../../lib/modules/Cache/util';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType} from '../../../lib/types/constants';
import {type TriFrostContextKind} from '../../../lib/types/context';
import {MockContext} from '../../MockContext';
import CONSTANTS from '../../constants';

describe('Storage - Memory', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Store', () => {
        let store: MemoryStore;
    
        beforeEach(() => {
            store = new MemoryStore();
        });
    
        afterEach(() => {
            vi.restoreAllMocks();
        });
    
        describe('constructor', () => {
            it('Initializes correctly', () => {
                expect(store).toBeInstanceOf(MemoryStore);
            });
    
            it('Starts GC if gc_interval is provided', async () => {
                const storeWithGC = new MemoryStore({gc_interval: 100});
                /* Avoid leaking times */
                await storeWithGC.stop();
                expect(storeWithGC).toBeInstanceOf(MemoryStore);
            });
        });
    
        describe('get', () => {
            it('Returns null for missing key', async () => {
                expect(await store.get('missing')).toBeNull();
            });
    
            it('Returns stored object', async () => {
                await store.set('foo', {bar: 1});
                expect(await store.get('foo')).toEqual({bar: 1});
            });
    
            it('Returns stored array', async () => {
                await store.set('foo', [1, 2, 3]);
                expect(await store.get('foo')).toEqual([1, 2, 3]);
            });
    
            it('Deletes and returns null if value has expired', async () => {
                const now = Date.now();
                vi.spyOn(Date, 'now').mockReturnValue(now);
                await store.set('expiring', {x: 1}, {ttl: 1});
    
                vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
                expect(await store.get('expiring')).toBeNull();
            });
    
            it('[is:slow] Removes expired key from both store and LRU via get()', async () => {
                const lruStore = new MemoryStore({
                    max_items: 3,
                    /* no gc_interval on purpose */
                });
    
                /* Expires in 1s */
                await lruStore.set('a', {foo: 1}, {ttl: 1});
                await lruStore.set('b', {foo: 2});
                /* wait for 'a' to expire */
                await sleep(1010);
    
                /* Accessing 'a' should trigger internal TTL logic and remove from both store + LRU */
                const result = await lruStore.get('a');
                expect(result).toBe(null);
    
                /* Add two more entries to trigger LRU logic */
                await lruStore.set('c', {foo: 3});
                await lruStore.set('d', {foo: 4});
    
                /* Only b, c, d should remain — 'a' must not have blocked eviction */
                expect(await lruStore.get('b')).toEqual({foo: 2});
                expect(await lruStore.get('c')).toEqual({foo: 3});
                expect(await lruStore.get('d')).toEqual({foo: 4});
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.get(el as string)).rejects.toThrow(/MemoryStore@get: Invalid key/);
                }
            });
        });
    
        describe('set', () => {
            it('Stores object with default TTL', async () => {
                await store.set('a', {z: true});
                expect(await store.get('a')).toEqual({z: true});
            });
    
            it('Stores array with TTL', async () => {
                await store.set('arr', [1, 2], {ttl: 60});
                expect(await store.get('arr')).toEqual([1, 2]);
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.set(el as string, {x: 1})).rejects.toThrow(/MemoryStore@set: Invalid key/);
                }
            });
    
            it('Throws on non-object/non-array value', async () => {
                for (const el of CONSTANTS.NOT_OBJECT) {
                    if (Array.isArray(el)) continue;
                    await expect(store.set('x', el as any)).rejects.toThrow(/MemoryStore@set: Invalid value/);
                }
    
                for (const el of CONSTANTS.NOT_ARRAY) {
                    if (isObject(el)) continue;
                    await expect(store.set('x', el as any)).rejects.toThrow(/MemoryStore@set: Invalid value/);
                }
            });
        });
    
        describe('del', () => {
            it('Removes stored value', async () => {
                await store.set('gone', {hello: 'world'});
                await store.del('gone');
                expect(await store.get('gone')).toBeNull();
            });

            it('Deletes all keys matching prefix', async () => {
                await store.set('user.1', {id: 1});
                await store.set('user.2', {id: 2});
                await store.set('session.1', {id: 's1'});
            
                await store.del({prefix: 'user.'});
            
                expect(await store.get('user.1')).toBeNull();
                expect(await store.get('user.2')).toBeNull();
                expect(await store.get('session.1')).toEqual({id: 's1'});
            });
            
            it('Handles no matches for prefix without error', async () => {
                await store.set('data.1', {v: 1});
                await expect(store.del({prefix: 'nonexistent:'})).resolves.toBeUndefined();
                expect(await store.get('data.1')).toEqual({v: 1});
            });
    
            it('Throws on invalid key', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del(el as string)).rejects.toThrow(/MemoryStore@del: Invalid deletion value/);
                }
            });

            it('Throws on invalid prefix', async () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    await expect(store.del({prefix: el as string})).rejects.toThrow(/MemoryStore@del: Invalid deletion value/);
                }
            });
        });
    
        describe('stop', () => {
            it('clears interval when GC is active', async () => {
                const storeWithGC = new MemoryStore({gc_interval: 10});
                const spy = vi.spyOn(global, 'clearInterval');
                await storeWithGC.stop();
                expect(spy).toHaveBeenCalled();
            });
    
            it('does nothing when GC is already null', async () => {
                await expect(store.stop()).resolves.toBeUndefined();
            });
        });
    
        describe('behavior:GC', () => {
            it('[is:slow] Automatically removes expired items when gc_interval is set', async () => {
                const storeWithGC = new MemoryStore({gc_interval: 10});
                await storeWithGC.set('foo', {x: 1}, {ttl: 1});
                await sleep(1100);
                expect(await storeWithGC.get('foo')).toBe(null);
                await storeWithGC.stop();
            }, 2000);
          
            it('Respects custom gc_filter logic', async () => {
                const storeWithGC = new MemoryStore({
                    gc_interval: 10,
                    gc_filter: (key, value) => key === 'evict-me' || (value as any).shouldEvict === true,
                });
              
                await storeWithGC.set('evict-me', {shouldEvict: true} as any);
                await storeWithGC.set('keep-me', {shouldEvict: false} as any);
              
                await sleep(100);
              
                expect(await storeWithGC.get('evict-me')).toBe(null);
                expect(await storeWithGC.get('keep-me')).toEqual({shouldEvict: false});
              
                await storeWithGC.stop();
            });          
          
            it('Does not crash if stop() is called twice', async () => {
                const storeWithGC = new MemoryStore({gc_interval: 50});
                await storeWithGC.stop();
                await expect(storeWithGC.stop()).resolves.toBeUndefined();
            });
          
            it('Does not run GC if interval is not provided', async () => {
                const spy = vi.spyOn(global, 'setInterval');
                const storeWithoutGC = new MemoryStore();
                await storeWithoutGC.stop();
                expect(spy).not.toHaveBeenCalled();
            });
        });
    
        describe('behavior:LRU', () => {
            it('Evicts least recently used when max_items is exceeded', async () => {
                const lruStore = new MemoryStore({max_items: 3});
    
                await lruStore.set('a', {v: 1});
                await lruStore.set('b', {v: 2});
                await lruStore.set('c', {v: 3});
    
                /* 'a' should be evicted */
                await lruStore.set('d', {v: 4});
      
                /* evicted */
                expect(await lruStore.get('a')).toBeNull();
    
                /* Should still be there */
                expect(await lruStore.get('b')).toEqual({v: 2});
                expect(await lruStore.get('c')).toEqual({v: 3});
                expect(await lruStore.get('d')).toEqual({v: 4});
            });
      
            it('Refreshes key usage on get', async () => {
                const lruStore = new MemoryStore({max_items: 2});
    
                await lruStore.set('x', {v: 1});
                await lruStore.set('y', {v: 2});
    
                /* refresh x */
                await lruStore.get('x');
    
                /* should evict y (least recently used) */
                await lruStore.set('z', {v: 3});
    
                /* refreshed, not evicted */
                expect(await lruStore.get('x')).toEqual({v: 1});
    
                /* evicted */
                expect(await lruStore.get('y')).toBeNull();
    
                expect(await lruStore.get('z')).toEqual({v: 3});
            });
      
            it('Deletes key from LRU when manually deleted', async () => {
                const lruStore = new MemoryStore({max_items: 2});
    
                await lruStore.set('delme', {a: 1});
                await lruStore.del('delme');
    
                /* Should allow us to set 2 more keys without hitting max */
                await lruStore.set('x', {v: 1});
                await lruStore.set('y', {v: 2});
    
                /* should evict 'x' (not 'delme' as already gone) */
                await lruStore.set('z', {v: 3});
    
                /* As previously deleted */
                expect(await lruStore.get('delme')).toBeNull();
    
                /* Evicted */
                expect(await lruStore.get('x')).toBeNull();
                expect(await lruStore.get('y')).toEqual({v: 2});
                expect(await lruStore.get('z')).toEqual({v: 3});
            });
      
            it('Ignores LRU tracking entirely if max_items is not set', async () => {
                const lruStore = new MemoryStore();
    
                await lruStore.set('x', {foo: 1});
                await lruStore.set('y', {foo: 2});
                await lruStore.set('z', {foo: 3});
                await lruStore.set('w', {foo: 4});
    
                expect(await lruStore.get('x')).toEqual({foo: 1});
                expect(await lruStore.get('y')).toEqual({foo: 2});
                expect(await lruStore.get('z')).toEqual({foo: 3});
                expect(await lruStore.get('w')).toEqual({foo: 4});
            });
        });
    
        describe('behavior:GC_LRU', () => {
            it('[is:slow] Evicts expired keys via GC and then oldest via LRU', async () => {
                const gcLruStore = new MemoryStore({
                    gc_interval: 10,
                    max_items: 2,
                });
    
                /* Set two keys, one will expire */
                await gcLruStore.set('a', {v: 1}, {ttl: 1});
                await gcLruStore.set('b', {v: 2});
    
                /* Allow GC to clean up 'a' */
                await sleep(1100);
    
                /* Now add a new key, LRU should not evict anything since 'a' is gone */
                await gcLruStore.set('c', {v: 3});
    
                expect(await gcLruStore.get('a')).toBe(null);
                expect(await gcLruStore.get('b')).toEqual({v: 2});
                expect(await gcLruStore.get('c')).toEqual({v: 3});
    
                await gcLruStore.stop();
            });
    
            it('Does not exceed max_items when GC runs', async () => {
                const gcLruStore = new MemoryStore({
                    gc_interval: 10,
                    max_items: 2,
                });
    
                await gcLruStore.set('x', {v: 1});
                await gcLruStore.set('y', {v: 2});
                /* LRU should evict 'x' */
                await gcLruStore.set('z', {v: 3});
    
                /* Let gc interval run, this won't do anything but we should not see gc evictions */
                await sleep(20);
    
                /* Should evict 'y' */
                await gcLruStore.set('w', {v: 4});
    
                const keys = ['x', 'y', 'z', 'w'];
                const values = await Promise.all(keys.map(k => gcLruStore.get(k)));
    
                expect(values[0]).toBe(null);
                expect(values[1]).toBe(null);
                expect(values[2]).toEqual({v: 3});
                expect(values[3]).toEqual({v: 4});
    
                await gcLruStore.stop();
            });
    
            it('Handles GC-filtered values + LRU without conflict', async () => {
                const gcLruStore = new MemoryStore({
                    gc_interval: 10,
                    max_items: 3,
                    gc_filter: (key, val) => (val as any).evict === true,
                });
    
                /* Filtered out by GC */
                await gcLruStore.set('1', {evict: true} as any);  
                await gcLruStore.set('2', {evict: false} as any);
                await gcLruStore.set('3', {evict: false} as any);
    
                /* Let GC evict */
                await sleep(20);                             
    
                /* Should not evict '2' as '1' should have already been evicted */
                await gcLruStore.set('4', {evict: false} as any);
    
                expect(await gcLruStore.get('1')).toBe(null);
                expect(await gcLruStore.get('2')).toEqual({evict: false});
                expect(await gcLruStore.get('3')).toEqual({evict: false});
                expect(await gcLruStore.get('4')).toEqual({evict: false});
    
                await gcLruStore.stop();
            });
        });
    });    

    describe('Cache', () => {
        let cache: MemoryCache;

        beforeEach(() => {
            cache = new MemoryCache({
                gc_interval: 0, // Disable GC for test consistency
                max_items: 100, // No LRU limits
            });
        });

        afterEach(() => {
            cache.stop();
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
        });  

        describe('get', () => {
            let getSpy:ReturnType<typeof vi['spyOn']>;
            let setSpy:ReturnType<typeof vi['spyOn']>;

            beforeEach(() => {
                cache.init({env: true});
                /* @ts-ignore we're testing this */
                getSpy = vi.spyOn(cache.resolvedStore, 'get');
                /* @ts-ignore we're testing this */
                setSpy = vi.spyOn(cache.resolvedStore, 'set');
            });

            afterEach(() => {
                getSpy.mockRestore();
                setSpy.mockRestore();
            });

            it('Returns null for missing key', async () => {
                expect(await cache.get('missing')).toBe(null);
            });

            it('Returns stored object', async () => {
                await cache.set('foo', {bar: 1});
                expect(await cache.get('foo')).toEqual({bar: 1});
                expect(getSpy).toHaveBeenCalledWith('foo');
                expect(setSpy).toHaveBeenCalledWith('foo', {v: {bar: 1}}, undefined);
            });

            it('Returns stored array', async () => {
                await cache.set('arr', [1, 2, 3]);
                expect(await cache.get('arr')).toEqual([1, 2, 3]);
                expect(getSpy).toHaveBeenCalledWith('arr');
                expect(setSpy).toHaveBeenCalledWith('arr', {v: [1, 2, 3]}, undefined);
            });

            it('Returns stored primitive', async () => {
                for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                    await cache.set('val', el);
                    expect(await cache.get('val')).toEqual(el);
                    expect(getSpy).toHaveBeenCalledWith('val');
                    expect(setSpy).toHaveBeenCalledWith('val', {v: el}, undefined);
                    getSpy.mockReset();
                    setSpy.mockReset();
                }
            });

            it('Delegates to internal store.get', async () => {
                await cache.set('foo', {bar: 1});
                await cache.get('foo');
                expect(getSpy).toHaveBeenCalledWith('foo');
                expect(setSpy).toHaveBeenCalledWith('foo', {v: {bar: 1}}, undefined);
            });
        });

        describe('set', () => {
            let getSpy:ReturnType<typeof vi['spyOn']>;
            let setSpy:ReturnType<typeof vi['spyOn']>;

            beforeEach(() => {
                cache.init({env: true});
                /* @ts-ignore we're testing this */
                getSpy = vi.spyOn(cache.resolvedStore, 'get');
                /* @ts-ignore we're testing this */
                setSpy = vi.spyOn(cache.resolvedStore, 'set');
            });

            afterEach(() => {
                getSpy.mockRestore();
                setSpy.mockRestore();
            });

            it('Throws if provided undefined', async () => {
                /* @ts-ignore This is what we're testing */
                await expect(cache.set('x'))
                    .rejects
                    .toThrow(/TriFrostCache@set: Value can not be undefined/);
                expect(getSpy).toHaveBeenCalledTimes(0);
                expect(setSpy).toHaveBeenCalledTimes(0);
            });

            it('Stores an object value', async () => {
                await cache.set('obj', {z: true});
                expect(await cache.get('obj')).toEqual({z: true});
                expect(setSpy).toHaveBeenCalledWith('obj', {v: {z: true}}, undefined);
                expect(getSpy).toHaveBeenCalledWith('obj');
            });

            it('Stores an array value', async () => {
                await cache.set('nums', [4, 5, 6]);
                expect(await cache.get('nums')).toEqual([4, 5, 6]);
                expect(setSpy).toHaveBeenCalledWith('nums', {v: [4, 5, 6]}, undefined);
                expect(getSpy).toHaveBeenCalledWith('nums');
            });

            it('Stores primitives', async () => {
                for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                    await cache.set('val', el);
                    expect(await cache.get('val')).toEqual(el);
                    expect(setSpy).toHaveBeenCalledWith('val', {v: el}, undefined);
                    expect(getSpy).toHaveBeenCalledWith('val');
                    setSpy.mockReset();
                    getSpy.mockReset();
                }
            });

            it('Overwrites an existing value', async () => {
                await cache.set('x', {v: 1});
                await cache.set('x', {v: 2});
                expect(await cache.get('x')).toEqual({v: 2});
                expect(setSpy).toHaveBeenNthCalledWith(1, 'x', {v: {v: 1}}, undefined);
                expect(setSpy).toHaveBeenNthCalledWith(2, 'x', {v: {v: 2}}, undefined);
            });

            it('Respects TTL', async () => {
                await cache.set('ttl-key', {v: 1}, {ttl: 90});
                expect(setSpy).toHaveBeenCalledWith('ttl-key', {v: {v: 1}}, {ttl: 90});
            });

            it('Delegates to internal store.set', async () => {
                await cache.set('hello', {world: true}, {ttl: 90});
                expect(setSpy).toHaveBeenCalledWith('hello', {v: {world: true}}, {ttl: 90});
            });
        });

        describe('delete', () => {
            beforeEach(() => {
                cache.init({env: true});
            });

            it('Removes an existing key', async () => {
                await cache.set('gone', {v: 1});
                await cache.del('gone');
                expect(await cache.get('gone')).toBe(null);
            });

            it('Does nothing on non-existent key', async () => {
                await expect(cache.del('ghost')).resolves.toBe(undefined);
            });

            it('Delegates to internal store.del', async () => {
                /* @ts-ignore we're testing this */
                const spy = vi.spyOn(cache.resolvedStore, 'del');
        
                await cache.set('x', {v: 1});
                await cache.del('x');
        
                expect(spy).toHaveBeenCalledWith('x');
            });
        });

        describe('wrap', () => {
            let getSpy:ReturnType<typeof vi['spyOn']>;
            let setSpy:ReturnType<typeof vi['spyOn']>;

            beforeEach(() => {
                cache.init({env: true});
                /* @ts-ignore we're testing this */
                getSpy = vi.spyOn(cache.resolvedStore, 'get');
                /* @ts-ignore we're testing this */
                setSpy = vi.spyOn(cache.resolvedStore, 'set');
            });

            afterEach(() => {
                getSpy.mockRestore();
                setSpy.mockRestore();
            });

            it('Returns cached value if present', async () => {
                await cache.set('hit', [9, 8, 7]);
                const result = await cache.wrap('hit', async () => ['miss']);
                expect(result).toEqual([9, 8, 7]);
            });

            it('Computes and stores value if missing', async () => {
                const result = await cache.wrap('miss', async () => ({fresh: true}));
                expect(result).toEqual({fresh: true});
                expect(await cache.get('miss')).toEqual({fresh: true});

                expect(getSpy).toHaveBeenCalledWith('miss');
                expect(setSpy).toHaveBeenCalledWith('miss', {v: {fresh: true}}, undefined);
            });

            it('Computes and does not store anything if function returns nada', async () => {
                /* @ts-ignore this is what we're testing */
                const result = await cache.wrap('noret', async () => {});
                expect(result).toEqual(undefined);
                expect(await cache.get('noret')).toEqual(null);
                expect(getSpy).toHaveBeenCalledWith('noret');
                expect(getSpy).toHaveBeenCalledTimes(2);
                expect(setSpy).toHaveBeenCalledTimes(0);
            });

            it('Computes and does not store anything if function decided to skip', async () => {
                const result = await cache.wrap('nocache', async () => cacheSkip('you_shall_not_pass'));
                expect(result).toEqual('you_shall_not_pass');
                expect(await cache.get('nocache')).toEqual(null);
                expect(getSpy).toHaveBeenCalledWith('nocache');
                expect(getSpy).toHaveBeenCalledTimes(2);
                expect(setSpy).toHaveBeenCalledTimes(0);
            });

            it('Respects TTL when passed', async () => {
                const result = await cache.wrap('timed', async () => [1, 2, 3], {ttl: 60});
                expect(result).toEqual([1, 2, 3]);
                expect(getSpy).toHaveBeenCalledWith('timed');
                expect(setSpy).toHaveBeenCalledWith('timed', {v: [1,2,3]}, {ttl: 60});
            });

            it('Caches null as a valid value from wrap', async () => {
                const result = await cache.wrap('null-key', async () => null);
                expect(result).toBe(null);
                expect(getSpy).toHaveBeenCalledWith('null-key');
                expect(setSpy).toHaveBeenCalledWith('null-key', {v: null}, undefined);
            });

            it('Delegates to internal store.get and store.set from wrap()', async () => {
                const result = await cache.wrap('wrap-test', async () => ({fresh: true}), {ttl: 42});
        
                expect(result).toEqual({fresh: true});
                expect(getSpy).toHaveBeenCalledWith('wrap-test');
                expect(setSpy).toHaveBeenCalledWith('wrap-test', {v: {fresh: true}}, {ttl: 42});
            });
        });

        describe('stop', () => {
            it('Can be called before init safely', async () => {
                await expect(cache.stop()).resolves.toBe(undefined);
            });

            it('Stops cleanly after init and usage', async () => {
                cache.init({env: true});
                await cache.set('x', {stop: true});
                await expect(cache.stop()).resolves.toBe(undefined);
            });
        });
    });

    describe('RateLimit', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe('Initialization', () => {
            it('Initializes with default strategy (fixed) and window (60)', async () => {
                const rl = new MemoryRateLimit();
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                await rl.stop(); /* gc cleanup */
            });

            it('Initializes with sliding strategy', async () => {
                const rl = new MemoryRateLimit({strategy: 'sliding'});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(2);
                await mw(ctx);
                expect(ctx.statusCode).not.toBe(429);
                expect(rl.strategy).toBe('sliding');
                expect(rl.window).toBe(60);
                await rl.stop(); /* gc cleanup */
            });

            it('Throws for invalid limit types', async () => {
                const rl = new MemoryRateLimit();
                const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
                const mw = rl.limit(() => -1);
                await mw(ctx);
                expect(ctx.statusCode).toBe(500);
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                await rl.stop(); /* gc cleanup */
            });

            it('Skips processing for non-std context kinds', async () => {
                const rl = new MemoryRateLimit();
                const mw = rl.limit(1);
            
                for (const kind of ['notfound', 'health', 'options']) {
                    const ctx = new MockContext({kind: kind as TriFrostContextKind});
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(200);
                    expect(Object.keys(ctx.headers).length).toBe(0);
                }
                await rl.stop(); /* gc cleanup */
            });

            it('Registers correct introspection symbols', async () => {
                const rl = new MemoryRateLimit();
                const mw = rl.limit(5);
            
                expect(rl.strategy).toBe('fixed');
                expect(rl.window).toBe(60);
                expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostRateLimit');
                expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
                expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('Middleware for rate limitting contexts passing through it');
                await rl.stop(); /* gc cleanup */
            });

            it('Sets rate limit headers when enabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({window: 1});
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
                await rl.stop(); /* gc cleanup */
            });

            it('Disables rate limit headers when disabled', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({headers: false});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                expect(ctx.headers).toEqual({
                    'Retry-After': '60',
                });
                await rl.stop(); /* gc cleanup */
            });

            it('Supports custom key generators', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({keygen: el => `ip:${el.ip}`});
                const mw = rl.limit(10);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);

                /* @ts-ignore We want to test this */
                const val = await rl.resolvedStore.store.get('ip:127.0.0.1');
                expect(val.amt).toBe(2);
                expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);

                expect(ctx.headers).toEqual({
                    'X-RateLimit-Limit': 10,
                    'X-RateLimit-Remaining': 8,
                    'X-RateLimit-Reset': now + rl.window,
                });
                await rl.stop(); /* gc cleanup */
            });

            it('Supports custom exceeded handler', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const exceeded = vi.fn(el => el.status(400));
                const rl = new MemoryRateLimit({exceeded});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(exceeded).toHaveBeenCalledOnce();
                expect(ctx.statusCode).toBe(400);
                await rl.stop(); /* gc cleanup */
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
                    const rl = new MemoryRateLimit({keygen: key as any});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now()/1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);

                    /* @ts-ignore We want to test this */
                    const val = await rl.resolvedStore.store.get(key_expected);
                    expect(val.amt).toBe(1);
                    expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);
                    await rl.stop();
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
                    const rl = new MemoryRateLimit({keygen: key as any});
                    const mw = rl.limit(1);
                    const now = Math.floor(Date.now()/1000);
                    await mw(ctx);
                    await mw(ctx);
                    expect(ctx.statusCode).toBe(429);

                    /* @ts-ignore We want to test this */
                    const val = await rl.resolvedStore.store.get(key_expected);
                    expect(val.amt).toBe(1);
                    expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);
                    await rl.stop();
                }
            });

            it('Falls back to "unknown" if keygen returns falsy', async () => {
                const rl = new MemoryRateLimit({
                    keygen: () => undefined as unknown as string, /* Force falsy value */
                });
            
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
            
                await mw(ctx);

                /* @ts-ignore We want to test this */
                const val = await rl.resolvedStore.store.get('unknown');
                expect(val.amt).toBe(1);
                expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);

                await mw(ctx);

                /* @ts-ignore We want to test this */
                const val2 = await rl.resolvedStore.store.get('unknown');
                expect(val2.amt).toBe(1); /* It should not have touched on the value as we shouldn't have done writes*/
                expect(val2.reset).toBeGreaterThanOrEqual(now + rl.window);
            
                expect(ctx.statusCode).toBe(429);
                await rl.stop(); /* gc cleanup */
            });
        });

        describe('strategy:fixed', () => {
            it('Allows requests within limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({window: 1});
                const mw = rl.limit(2);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
            });

            it('Blocks requests over the limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({window: 1});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                await rl.stop(); /* gc cleanup */
            });

            it('Removes expired items using GC filter (fixed)', async () => {
                const rl = new MemoryRateLimit({window: 1, strategy: 'fixed', gc_interval: 50});
            
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(1);
            
                await mw(ctx);
                
                const now = Math.floor(Date.now()/1000);

                /* @ts-ignore We want to test this */
                const val = await rl.resolvedStore.store.get('127.0.0.1:test:POST');
                expect(val.amt).toBe(1);
                expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);
            
                await sleep(100); /* Allow gc to run */
            
                /* @ts-ignore We want to test this */
                expect(await rl.resolvedStore.store.get('127.0.0.1:test:POST')).toBeNull();
                await rl.stop(); /* gc cleanup */
            });

            it('Calls stop() without error when the store was not resolved yet', async () => {
                const rl = new MemoryRateLimit({strategy: 'fixed'});
                await expect(rl.stop()).resolves.toBeUndefined();
            });

            it('Calls stop() without error when the store was resolved', async () => {
                const rl = new MemoryRateLimit({strategy: 'fixed'});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(1);
                await mw(ctx);
                await expect(rl.stop()).resolves.toBeUndefined();
            });
        });

        describe('strategy:sliding', () => {
            it('Allows requests within windowed limit', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
                const mw = rl.limit(3);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                await rl.stop(); /* gc cleanup */
            });

            it('Blocks when timestamps exceed limit in window', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
                const mw = rl.limit(1);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);
                await rl.stop(); /* gc cleanup */
            });

            it('[is:slow] Clears oldest timestamps after window expiry', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
                const mw = rl.limit(1);
                await mw(ctx);
                await sleep(1100);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                await rl.stop(); /* gc cleanup */
            });

            it('[is:slow] Removes old timestamps using GC filter (sliding)', async () => {
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const rl = new MemoryRateLimit({strategy: 'sliding', window: 1, gc_interval: 50});
                const mw = rl.limit(1);
                await mw(ctx);
                await sleep(2000);
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                await rl.stop();
            });

            it('Prunes first timestamp if it falls outside the window', async () => {
                const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
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
                await rl.stop(); /* gc cleanup */
            });          

            it('Calls stop() without error when the store was not resolved yet', async () => {
                const rl = new MemoryRateLimit({strategy: 'sliding'});
                await expect(rl.stop()).resolves.toBeUndefined();
            });

            it('Calls stop() without error when the store was resolved', async () => {
                const rl = new MemoryRateLimit({strategy: 'sliding'});
                const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
                const mw = rl.limit(1);
                await mw(ctx);
                await expect(rl.stop()).resolves.toBeUndefined();
            });
        });
    });
});