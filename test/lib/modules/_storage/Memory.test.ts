import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {MemoryStore} from '../../../../lib/modules/_storage/Memory';
import CONSTANTS from '../../../constants';
import {sleep} from '@valkyriestudios/utils/function';

describe('MemoryStore', () => {
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

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.get(el as string)).rejects.toThrow(/TriFrostMemoryStore@get: Invalid key/);
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
                await expect(store.set(el as string, {x: 1})).rejects.toThrow(/TriFrostMemoryStore@set: Invalid key/);
            }
        });

        it('Throws on non-object/non-array value', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (Array.isArray(el)) continue;
                await expect(store.set('x', el as any)).rejects.toThrow(/TriFrostMemoryStore@set: Invalid value/);
            }

            for (const el of CONSTANTS.NOT_ARRAY) {
                if (isObject(el)) continue;
                await expect(store.set('x', el as any)).rejects.toThrow(/TriFrostMemoryStore@set: Invalid value/);
            }
        });
    });

    describe('delete', () => {
        it('Removes stored value', async () => {
            await store.set('gone', {hello: 'world'});
            await store.delete('gone');
            expect(await store.get('gone')).toBeNull();
        });

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.delete(el as string)).rejects.toThrow(/TriFrostMemoryStore@delete: Invalid key/);
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
        it('[intentional slow] Automatically removes expired items when gc_interval is set', async () => {
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
            await lruStore.delete('delme');

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
});
