import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {KVCache} from '../../../../lib/modules/Cache/KV';
import {MockKV} from '../../../MockKV';

describe('Modules - Cache - KVCache', () => {
    let cache: KVCache;
    let mockKV: MockKV;

    beforeEach(() => {
        mockKV = new MockKV();
        cache = new KVCache({
            store: () => mockKV,
        });
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

        it('Uses KVStore internally', () => {
            cache.init({env: true});
      /* @ts-ignore we're testing this */
            expect(cache.resolvedStore.constructor.name).toBe('KVStore');
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
            await mockKV.put('foo', JSON.stringify({bar: 1}));
            expect(await cache.get('foo')).toEqual({bar: 1});
        });

        it('Returns stored array', async () => {
            await mockKV.put('arr', JSON.stringify([1, 2, 3]));
            expect(await cache.get('arr')).toEqual([1, 2, 3]);
        });

        it('Delegates to internal store.get', async () => {
            const spy = vi.spyOn(mockKV, 'get');
            await cache.get('key');
            expect(spy).toHaveBeenCalledWith('key', 'json');
        });
    });

    describe('set', () => {
        beforeEach(() => {
            cache.init({env: true});
        });

        it('Stores an object', async () => {
            await cache.set('obj', {x: 1});
            expect(await cache.get('obj')).toEqual({x: 1});
        });

        it('Stores an array', async () => {
            await cache.set('arr', [1, 2]);
            expect(await cache.get('arr')).toEqual([1, 2]);
        });

        it('Respects TTL', async () => {
            await cache.set('with-ttl', {v: 9}, {ttl: 120});
            expect(mockKV.calls.at(-1)).toEqual([
                'put',
                ['with-ttl', JSON.stringify({v: 9}), {expirationTtl: 120}],
            ]);
        });

        it('Delegates to internal store.set', async () => {
            const spy = vi.spyOn(mockKV, 'put');
            await cache.set('spy', {val: 1}, {ttl: 55});
            expect(spy).toHaveBeenCalledWith('spy', JSON.stringify({val: 1}), {
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
            await cache.delete('gone');
            expect(await cache.get('gone')).toBe(null);
        });

        it('Does nothing on missing key', async () => {
            await expect(cache.delete('ghost')).resolves.toBe(undefined);
        });

        it('Delegates to internal store.delete', async () => {
            const spy = vi.spyOn(mockKV, 'delete');
            await cache.delete('x');
            expect(spy).toHaveBeenCalledWith('x');
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
        });

        it('Computes and stores value if missing', async () => {
            const result = await cache.wrap('miss', async () => ({hit: true}));
            expect(result).toEqual({hit: true});
            expect(await cache.get('miss')).toEqual({hit: true});
        });

        it('Respects TTL during wrap', async () => {
            const result = await cache.wrap(
                'with-ttl',
                async () => ({cached: true}),
                {ttl: 80}
            );
            expect(result).toEqual({cached: true});
            expect(mockKV.calls.at(-1)?.[1]?.[2]).toEqual({expirationTtl: 80});
        });

        it('Delegates to internal get/set during wrap', async () => {
            const getSpy = vi.spyOn(mockKV, 'get');
            const putSpy = vi.spyOn(mockKV, 'put');
            await cache.wrap('combo', async () => ({cool: true}), {ttl: 99});
            expect(getSpy).toHaveBeenCalledWith('combo', 'json');
            expect(putSpy).toHaveBeenCalledWith(
                'combo',
                JSON.stringify({cool: true}),
                {expirationTtl: 99}
            );
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
