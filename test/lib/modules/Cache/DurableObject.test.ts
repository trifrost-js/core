import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {DurableObjectCache} from '../../../../lib/modules/Cache/DurableObject';
import {MockDurableObjectNamespace} from '../../../MockDurableObject';

describe('Modules - Cache - DurableObjectCache', () => {
    let cache: DurableObjectCache;
    let ns: MockDurableObjectNamespace;

    beforeEach(() => {
        ns = new MockDurableObjectNamespace();
        cache = new DurableObjectCache({
            store: () => ns,
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

        it('Uses DurableObjectStore internally', () => {
            cache.init({env: true});
            // @ts-ignore: accessing test-only internals
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

        it('Returns parsed object', async () => {
            await ns.get(ns.idFromName('trifrost-cache')).fetch(
                'https://do/trifrost-cache?key=foo',
                {
                    method: 'PUT',
                    body: JSON.stringify({v: {bar: 1}, ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                }
            );
            expect(await cache.get('foo')).toEqual({bar: 1});
        });

        it('Returns parsed array', async () => {
            await ns.get(ns.idFromName('trifrost-cache')).fetch(
                'https://do/trifrost-cache?key=arr',
                {
                    method: 'PUT',
                    body: JSON.stringify({v: [1,2,3], ttl: 60}),
                    headers: {'Content-Type': 'application/json'},
                }
            );
            expect(await cache.get('arr')).toEqual([1, 2, 3]);
        });

        it('Delegates to internal fetch GET', async () => {
            const spy = vi.spyOn(ns.get(ns.idFromName('trifrost-cache')), 'fetch');
            await cache.get('test-get');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('test-get'), expect.objectContaining({method: 'GET'}));
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
            await cache.set('ttl-key', {v: 1}, {ttl: 90});
            const id = ns.idFromName('trifrost-cache');
            const obj = ns.get(id);
            const lastCall = obj.calls.at(-1);
            expect(lastCall?.[1]!.body).toContain('"ttl":90');
        });

        it('Delegates to internal fetch PUT', async () => {
            const spy = vi.spyOn(ns.get(ns.idFromName('trifrost-cache')), 'fetch');
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
            await cache.delete('gone');
            expect(await cache.get('gone')).toBe(null);
        });

        it('Does nothing on non-existent key', async () => {
            await expect(cache.delete('ghost')).resolves.toBe(undefined);
        });

        it('Delegates to internal fetch DELETE', async () => {
            const spy = vi.spyOn(ns.get(ns.idFromName('trifrost-cache')), 'fetch');
            await cache.delete('test-del');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('test-del'), expect.objectContaining({method: 'DELETE'}));
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
            const result = await cache.wrap('ttl', async () => ({timed: true}), {ttl: 80});
            expect(result).toEqual({timed: true});
        
            const id = ns.idFromName('trifrost-cache');
            const obj = ns.get(id);
            const last = obj.calls.at(-1);
            expect(last?.[1]!.body).toContain('"ttl":80');
        });

        it('Delegates to internal fetch in wrap()', async () => {
            const id = ns.idFromName('trifrost-cache');
            const spy = vi.spyOn(ns.get(id), 'fetch');
            await cache.wrap('wrap-key', async () => ({fresh: true}));
            expect(spy).toHaveBeenCalled();
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
