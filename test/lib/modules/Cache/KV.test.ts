import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {KVCache} from '../../../../lib/modules/Cache/KV';
import {MockKV} from '../../../MockKV';
import {cacheSkip} from '../../../../lib/modules/Cache/util';

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

        it('Returns null if value in KV is malformed or not wrapped', async () => {
            await mockKV.put('corrupt', JSON.stringify({not_v: 123}));
            expect(await cache.get('corrupt')).toBe(null);
        
            await mockKV.put('not-json', 'plain string');
            expect(await cache.get('not-json')).toBe(null);
        });        

        it('Returns stored object', async () => {
            await mockKV.put('foo', JSON.stringify({v: {bar: 1}}));
            expect(await cache.get('foo')).toEqual({bar: 1});
            expect(mockKV.calls).toEqual([
                ['put', ['foo', JSON.stringify({v: {bar: 1}}), undefined]],
                ['get', ['foo', 'json']],
            ]);
        });

        it('Returns stored array', async () => {
            await mockKV.put('arr', JSON.stringify({v: [1, 2, 3]}));
            expect(await cache.get('arr')).toEqual([1, 2, 3]);
            expect(mockKV.calls).toEqual([
                ['put', ['arr', JSON.stringify({v: [1,2,3]}), undefined]],
                ['get', ['arr', 'json']],
            ]);
        });

        it('Returns stored primitive', async () => {
            for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                await mockKV.put('val', JSON.stringify({v: el}));
                expect(await cache.get('val')).toEqual(el);
                expect(mockKV.calls).toEqual([
                    ['put', ['val', JSON.stringify({v: el}), undefined]],
                    ['get', ['val', 'json']],
                ]);
                mockKV.reset();
            }
        });

        it('Delegates to internal store.get', async () => {
            const spy = vi.spyOn(mockKV, 'get');
            await cache.get('key');
            expect(spy).toHaveBeenCalledWith('key', 'json');
            expect(mockKV.calls).toEqual([
                ['get', ['key', 'json']],
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
            expect(mockKV.isEmpty);
        });

        it('Stores an object', async () => {
            await cache.set('obj', {x: 1});
            expect(await cache.get('obj')).toEqual({x: 1});
            expect(mockKV.calls).toEqual([
                ['put', ['obj', JSON.stringify({v: {x: 1}}), {expirationTtl: 60}]],
                ['get', ['obj', 'json']],
            ]);
        });

        it('Stores an array', async () => {
            await cache.set('arr', [1, 2]);
            expect(await cache.get('arr')).toEqual([1, 2]);
            expect(mockKV.calls).toEqual([
                ['put', ['arr', JSON.stringify({v: [1, 2]}), {expirationTtl: 60}]],
                ['get', ['arr', 'json']],
            ]);
        });

        it('Stores primitives', async () => {
            for (const el of [true, false, null, 1, 'hello', '', 99.999, -100]) {
                await cache.set('val', el);
                expect(await cache.get('val')).toEqual(el);
                expect(mockKV.calls).toEqual([
                    ['put', ['val', JSON.stringify({v: el}), {expirationTtl: 60}]],
                    ['get', ['val', 'json']],
                ]);
                mockKV.reset();
            }
        });

        it('Respects TTL', async () => {
            await cache.set('with-ttl', {v: 9}, {ttl: 120});
            expect(mockKV.calls.at(-1)).toEqual([
                'put',
                ['with-ttl', JSON.stringify({v: {v: 9}}), {expirationTtl: 120}],
            ]);
        });

        it('Delegates to internal store.set', async () => {
            const spy = vi.spyOn(mockKV, 'put');
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
            expect(mockKV.calls).toEqual([['delete', ['x']]]);
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
            expect(mockKV.calls).toEqual([
                ['put', ['wrapped', JSON.stringify({v: {a: 1}}), {expirationTtl: 60}]],
                ['get', ['wrapped', 'json']],
            ]);
        });

        it('Computes and stores value if missing', async () => {
            const result = await cache.wrap('miss', async () => ({hit: true}));
            expect(result).toEqual({hit: true});
            expect(await cache.get('miss')).toEqual({hit: true});
            expect(mockKV.calls).toEqual([
                ['get', ['miss', 'json']],
                ['put', ['miss', JSON.stringify({v: {hit: true}}), {expirationTtl: 60}]],
                ['get', ['miss', 'json']],
            ]);
        });

        it('Computes and does not store anything if function returns nada', async () => {
            /* @ts-ignore this is what we're testing */
            const result = await cache.wrap('noret', async () => {});
            expect(result).toEqual(undefined);
            expect(await cache.get('noret')).toEqual(null);
            expect(mockKV.calls).toEqual([
                ['get', ['noret', 'json']],
                ['get', ['noret', 'json']],
            ]);
        });

        it('Computes and does not store anything if function decided to skip', async () => {
            const result = await cache.wrap('nocache', async () => cacheSkip('you_shall_not_pass'));
            expect(result).toEqual('you_shall_not_pass');
            expect(await cache.get('nocache')).toEqual(null);
            expect(mockKV.calls).toEqual([
                ['get', ['nocache', 'json']],
                ['get', ['nocache', 'json']],
            ]);
        });

        it('Respects TTL during wrap', async () => {
            const result = await cache.wrap(
                'with-ttl',
                async () => ({cached: true}),
                {ttl: 80}
            );
            expect(result).toEqual({cached: true});
            expect(mockKV.calls).toEqual([
                ['get', ['with-ttl', 'json']],
                ['put', ['with-ttl', JSON.stringify({v: {cached: true}}), {expirationTtl: 80}]],
            ]);
        });

        it('Caches null as a valid value from wrap', async () => {
            const result = await cache.wrap('null-key', async () => null);
            expect(result).toBe(null);
            expect(await cache.get('null-key')).toBe(null);
            expect(mockKV.calls).toEqual([
                ['get', ['null-key', 'json']],
                ['put', ['null-key', JSON.stringify({v: null}), {expirationTtl: 60}]],
                ['get', ['null-key', 'json']],
            ]);
        });

        it('Delegates to internal get/set during wrap', async () => {
            const getSpy = vi.spyOn(mockKV, 'get');
            const putSpy = vi.spyOn(mockKV, 'put');
            await cache.wrap('combo', async () => ({cool: true}), {ttl: 99});
            expect(getSpy).toHaveBeenCalledWith('combo', 'json');
            expect(putSpy).toHaveBeenCalledWith(
                'combo',
                JSON.stringify({v: {cool: true}}),
                {expirationTtl: 99}
            );
            expect(mockKV.calls).toEqual([
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
