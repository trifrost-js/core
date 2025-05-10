import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {MemoryCache} from '../../../../lib/modules/Cache/Memory';

describe('Modules - Cache - MemoryCache', () => {
    let cache: MemoryCache;

    beforeEach(() => {
        cache = new MemoryCache({
            gc_interval: 0, // Disable GC for test consistency
            max_items: 100, // No LRU limits
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
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
            await expect(cache.delete('x'))
                .rejects
                .toThrow(/TriFrostCache@delete: Cache needs to be initialized first/);
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

        it('Uses MemoryStore internally', () => {
            cache.init({env: true});
            /* @ts-ignore we're testing this */
            expect(cache.resolvedStore.constructor.name).toBe('MemoryStore');
        });      
    });  

    describe('get', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Returns null for missing key', async () => {
            expect(await cache.get('missing')).toBe(null);
        });

        it('Returns stored object', async () => {
            await cache.set('foo', {bar: 1});
            expect(await cache.get('foo')).toEqual({bar: 1});
        });

        it('Returns stored array', async () => {
            await cache.set('arr', [1, 2, 3]);
            expect(await cache.get('arr')).toEqual([1, 2, 3]);
        });

        it('Delegates to internal store.get', async () => {
            cache.init({env: true});
            await cache.set('foo', {bar: 1});
      
            /* @ts-ignore we're testing this */
            const spy = vi.spyOn(cache.resolvedStore, 'get');
      
            await cache.get('foo');
      
            expect(spy).toHaveBeenCalledWith('foo');
        });
    });

    describe('set', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Stores an object value', async () => {
            await cache.set('obj', {z: true});
            expect(await cache.get('obj')).toEqual({z: true});
        });

        it('Stores an array value', async () => {
            await cache.set('nums', [4, 5, 6]);
            expect(await cache.get('nums')).toEqual([4, 5, 6]);
        });

        it('Overwrites an existing value', async () => {
            await cache.set('x', {v: 1});
            await cache.set('x', {v: 2});
            expect(await cache.get('x')).toEqual({v: 2});
        });

        it('Delegates to internal store.set', async () => {
            cache.init({env: true});
            
            /* @ts-ignore we're testing this */
            const spy = vi.spyOn(cache.resolvedStore, 'set');
      
            await cache.set('hello', {world: true}, {ttl: 90});
      
            expect(spy).toHaveBeenCalledWith('hello', {world: true}, {ttl: 90});
        });
    });

    describe('delete', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Removes an existing key', async () => {
            await cache.set('gone', {v: 1});
            await cache.delete('gone');
            expect(await cache.get('gone')).toBe(null);
        });

        it('Does nothing on non-existent key', async () => {
            await expect(cache.delete('ghost')).resolves.toBe(undefined);
        });

        it('Delegates to internal store.delete', async () => {
            cache.init({env: true});
            
            /* @ts-ignore we're testing this */
            const spy = vi.spyOn(cache.resolvedStore, 'delete');
      
            await cache.set('x', {v: 1});
            await cache.delete('x');
      
            expect(spy).toHaveBeenCalledWith('x');
        });
    });

    describe('wrap', () => {
        beforeEach(() => {
            cache.init({env: true});
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
        });

        it('Respects TTL when passed (doesn’t throw)', async () => {
            const result = await cache.wrap('timed', async () => [1, 2, 3], {ttl: 60});
            expect(result).toEqual([1, 2, 3]);
        });

        it('Does not store null/undefined computed values', async () => {
            const result = await cache.wrap('empty', async () => null as any);
            expect(result).toBe(null);
            expect(await cache.get('empty')).toBe(null);
        });

        it('Delegates to internal store.get and store.set from wrap()', async () => {
            cache.init({env: true});
      
            /* @ts-ignore we're testing this */
            const getSpy = vi.spyOn(cache.resolvedStore, 'get');

            /* @ts-ignore we're testing this */
            const setSpy = vi.spyOn(cache.resolvedStore, 'set');
      
            const result = await cache.wrap('wrap-test', async () => ({fresh: true}), {ttl: 42});
      
            expect(result).toEqual({fresh: true});
            expect(getSpy).toHaveBeenCalledWith('wrap-test');
            expect(setSpy).toHaveBeenCalledWith('wrap-test', {fresh: true}, {ttl: 42});
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
