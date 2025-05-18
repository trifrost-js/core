import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {MemoryCache} from '../../../../lib/modules/Cache/Memory';
import {cacheSkip} from '../../../../lib/modules/Cache/util';

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

        it('Uses MemoryStore internally', () => {
            cache.init({env: true});
            /* @ts-ignore we're testing this */
            expect(cache.resolvedStore.constructor.name).toBe('MemoryStore');
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
