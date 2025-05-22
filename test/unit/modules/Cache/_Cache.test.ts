import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {TriFrostCache} from '../../../../lib/modules/Cache/_Cache';
import {cacheSkip} from '../../../../lib/modules/Cache/util';
import {Store} from '../../../../lib/storage/_Storage';
import CONSTANTS from '../../../constants';
import {TriFrostStoreValue} from '../../../../lib/storage/types';

const mockStore = () => {
    const mock = {
        name: 'MockStore',
        get: vi.fn(async key => {
            mock.calls.push(`get:${key}`);
            return mock.data.get(key) || null;
        }),
        set: vi.fn(async (key, val) => {
            mock.calls.push(`set:${key}`);
            mock.data.set(key, val);
        }),
        del: vi.fn(async key => {
            mock.calls.push(`del:${key}`);
            mock.data.delete(key);
        }),
        stop: vi.fn(),
        spawn: vi.fn(() => mockStore()),
        data: new Map<string, any>(),
        calls: [] as string[],
    };
    return mock as unknown as Store;
};

describe('Modules - Cache - TriFrostCache', () => {
    let store: ReturnType<typeof mockStore>;
    let cache: TriFrostCache<{env: boolean}>;

    beforeEach(() => {
        store = mockStore();
        cache = new TriFrostCache({
            store: () => store,
        });
    });

    describe('ctor', () => {
        it('Throws if not passed a valid store', async () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (isObject(el)) continue;
                /* @ts-ignore This is what we're testing */
                expect(() => new TriFrostCache({store: el})).toThrow(/TriFrostCache: Expected a store initializer/);
            }
        });

        it('Accepts an already-resolved store directly', () => {
            const direct = new TriFrostCache({store});
            direct.init({env: true});
            /* @ts-ignore */
            expect(direct.resolvedStore).toBe(store);
        });
    
        it('Throws if store is not object or function', () => {
            for (const el of [...CONSTANTS.NOT_OBJECT_WITH_EMPTY, ...CONSTANTS.NOT_FUNCTION]) {
                if (typeof el === 'function' || typeof el === 'object') continue;
                /* @ts-ignore */
                expect(() => new TriFrostCache({store: el})).toThrow(/TriFrostCache: Expected a store initializer/);
            }
        });
    });

    describe('initialization', () => {
        it('Throws if used before init', async () => {
            await expect(cache.get('foo')).rejects.toThrow(/TriFrostCache@get: Cache needs to be initialized first/);
            await expect(cache.set('foo', 'bar')).rejects.toThrow(/TriFrostCache@set: Cache needs to be initialized first/);
            await expect(cache.del('foo')).rejects.toThrow(/TriFrostCache@del: Cache needs to be initialized first/);
            await expect(cache.wrap('foo', async () => 'val')).rejects.toThrow(/TriFrostCache@wrap: Cache needs to be initialized first/);
        });

        it('Initializes and resolves', () => {
            expect(() => cache.init({env: true})).not.toThrow();
        });
    });

    describe('get', () => {
        beforeEach(() => cache.init({env: true}));

        it('Delegates get to store and returns value', async () => {
            await store.set('key', {v: 123});
            expect(await cache.get('key')).toBe(123);
        });

        it('Returns null for missing key', async () => {
            expect(await cache.get('missing')).toBe(null);
        });

        it('Ignores non-object results', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                store.get = vi.fn(async () => el as unknown as TriFrostStoreValue);
                expect(await cache.get('invalid')).toBe(null);
            }
        });

        it('Ignores objects without `v` property', async () => {
            store.get = vi.fn(async () => ({x: 1}));
            expect(await cache.get('x')).toBe(null);
        });
    });

    describe('set', () => {
        beforeEach(() => cache.init({env: true}));

        it('Stores wrapped value', async () => {
            await cache.set('a', [1, 2, 3]);
            expect(store.set).toHaveBeenCalledWith('a', {v: [1, 2, 3]}, undefined);
        });

        it('Respects TTL option', async () => {
            await cache.set('b', {foo: true}, {ttl: 120});
            expect(store.set).toHaveBeenCalledWith('b', {v: {foo: true}}, {ttl: 120});
        });

        it('Throws if value is undefined', async () => {
            await expect(cache.set('x', undefined as unknown as TriFrostStoreValue)).rejects.toThrow(/undefined/);
        });
    });

    describe('del', () => {
        beforeEach(() => cache.init({env: true}));

        it('Delegates delete', async () => {
            await cache.set('gone', 'yes');
            await cache.del('gone');
            expect(await cache.get('gone')).toBe(null);
            expect(store.del).toHaveBeenCalledWith('gone');
        });
    });

    describe('wrap', () => {
        beforeEach(() => cache.init({env: true}));

        it('Returns cached value if present', async () => {
            await cache.set('wrapped', 999);
            const result = await cache.wrap('wrapped', async () => 111);
            expect(result).toBe(999);
        });

        it('Computes and caches if missing', async () => {
            const result = await cache.wrap('computed', async () => 42);
            expect(result).toBe(42);
            expect(await cache.get('computed')).toBe(42);
        });

        it('Does not cache if result is undefined', async () => {
            /* @ts-ignore */
            const result = await cache.wrap('undef', async () => {});
            expect(result).toBe(undefined);
            expect(await cache.get('undef')).toBe(null);
        });

        it('Skips caching if result is cacheSkip', async () => {
            const result = await cache.wrap('skip', async () => cacheSkip('ignore'));
            expect(result).toBe('ignore');
            expect(await cache.get('skip')).toBe(null);
        });

        it('Respects TTL in wrap', async () => {
            const result = await cache.wrap('ttl', async () => 'timeboxed', {ttl: 99});
            expect(result).toBe('timeboxed');
            expect(store.set).toHaveBeenCalledWith('ttl', {v: 'timeboxed'}, {ttl: 99});
        });
    });

    describe('stop', () => {
        it('Calls stop() on store if resolved', async () => {
            cache.init({env: true});
            await cache.stop();
            expect(store.stop).toHaveBeenCalled();
        });

        it('Does not throw if store not resolved', async () => {
            await expect(cache.stop()).resolves.toBe(undefined);
        });
    });

    describe('spawn', () => {
        beforeEach(() => {
            cache.init({env: true});
        });
    
        it('Spawns a new cache instance with a spawned store', () => {
            const spawnMock = vi.fn().mockImplementation(ctx => ({
                ...mockStore(),
                name: 'SpawnedMockStore',
                ctx: ctx,
            } as unknown as Store));
            store.spawn = spawnMock;
    
            const ctx = {env: {env: true}, logger: {}} as any;
            const scoped = (cache as any).spawn(ctx);
    
            expect(scoped).toBeInstanceOf(TriFrostCache);
            expect(spawnMock).toHaveBeenCalledWith(ctx);
        });
    
        it('Spawns from unresolved cache and resolves using ctx.env', () => {
            const rawStore = mockStore();
            const lazyCache = new TriFrostCache({
                store: () => rawStore,
            });
    
            rawStore.spawn = vi.fn().mockImplementation(() => ({
                ...mockStore(),
                name: 'LazySpawned',
            } as unknown as Store));
    
            const ctx = {env: {env: true}, logger: {}} as any;
            const spawned = (lazyCache as any).spawn(ctx);
    
            expect(spawned).toBeInstanceOf(TriFrostCache);
            expect(rawStore.spawn).toHaveBeenCalledWith(ctx);
        });

        describe('Spawned Store: behavioral', () => {
            let baseStore: Store;
            let spawnCache: TriFrostCache<{env: boolean}>;
        
            beforeEach(() => {
                baseStore = mockStore();
                spawnCache = new TriFrostCache({store: baseStore});
            });
        
            it('should set and get using spawned cache', async () => {
                const ctx = {env: {env: true}} as any;
                const spawned = (spawnCache as any).spawn(ctx);
                spawned.init(ctx.env);
        
                await spawned.set('hello', 'world');
                expect(await spawned.get('hello')).toBe('world');
            });
        
            it('should delete values using spawned cache', async () => {
                const ctx = {env: {env: true}} as any;
                const spawned = (spawnCache as any).spawn(ctx);
                spawned.init(ctx.env);
        
                await spawned.set('bye', 'world');
                await spawned.del('bye');
                expect(await spawned.get('bye')).toBe(null);
            });
        });
    });
});
