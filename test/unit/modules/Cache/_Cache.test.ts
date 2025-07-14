import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {TriFrostCache} from '../../../../lib/modules/Cache/_Cache';
import {cacheSkip, Sym_TriFrostSkipCache} from '../../../../lib/modules/Cache/util';
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
        cache = new TriFrostCache({store});
    });

    describe('ctor', () => {
        it('Throws if not passed a valid store', async () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (isObject(el)) continue;
                /* @ts-expect-error Should be good */
                expect(() => new TriFrostCache({store: el})).toThrow(/TriFrostCache: Expected a store/);
            }
        });

        it('Throws if store is not object', () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                /* @ts-expect-error Should be good */
                expect(() => new TriFrostCache({store: el})).toThrow(/TriFrostCache: Expected a store/);
            }
        });
    });

    describe('get', () => {
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
        it('Delegates delete', async () => {
            await cache.set('gone', 'yes');
            await cache.del('gone');
            expect(await cache.get('gone')).toBe(null);
            expect(store.del).toHaveBeenCalledWith('gone');
        });
    });

    describe('wrap', () => {
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
            /* @ts-expect-error Should be good */
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

    describe('skip', () => {
        it('Preserves original value', () => {
            const obj = {user: 1};
            const result = cache.skip(obj);
            /* @ts-expect-error The return type of cacheSkip is ON PURPOSE the type of the original value */
            expect(result.value).toBe(obj);
        });

        it('Allows passing primitives', () => {
            for (const el of [null, undefined, 1, true, false, 'hello', 0.999]) {
                /* @ts-expect-error The return type of cacheSkip is ON PURPOSE the type of the original value */
                expect(cache.skip(el).value).toEqual(el);
            }
        });

        it('Attaches Sym_TriFrostSkipCache to result', () => {
            const result = cache.skip(123);
            /* @ts-expect-error The return type of cacheSkip is ON PURPOSE the type of the original value */
            expect(Reflect.get(result, Sym_TriFrostSkipCache)).toBe(true);
        });

        it('Result remains an object and serializable', () => {
            const result = cache.skip({x: 1});
            expect(isObject(result)).toBe(true);
            expect(JSON.stringify(result)).toEqual('{"value":{"x":1}}');
        });
    });

    describe('stop', () => {
        it('Calls stop() on store', async () => {
            await cache.stop();
            expect(store.stop).toHaveBeenCalled();
        });
    });

    describe('spawn', () => {
        it('Spawns a new cache instance with a spawned store', () => {
            const spawnMock = vi.fn().mockImplementation(
                ctx =>
                    ({
                        ...mockStore(),
                        name: 'SpawnedMockStore',
                        ctx: ctx,
                    }) as unknown as Store,
            );
            store.spawn = spawnMock;

            const ctx = {env: {env: true}, logger: {}} as any;
            const scoped = (cache as any).spawn(ctx);

            expect(scoped).toBeInstanceOf(TriFrostCache);
            expect(spawnMock).toHaveBeenCalledWith(ctx);
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
                await spawned.set('hello', 'world');
                expect(await spawned.get('hello')).toBe('world');
            });

            it('should delete values using spawned cache', async () => {
                const ctx = {env: {env: true}} as any;
                const spawned = (spawnCache as any).spawn(ctx);
                await spawned.set('bye', 'world');
                await spawned.del('bye');
                expect(await spawned.get('bye')).toBe(null);
            });
        });
    });
});
