import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach} from 'vitest';
import {RedisStore} from '../../../../lib/modules/_storage/Redis';
import {MockRedis} from '../../../MockRedis';
import CONSTANTS from '../../../constants';

describe('Modules - Storage - Redis', () => {
    let redis: MockRedis;
    let store: RedisStore;

    beforeEach(() => {
        redis = new MockRedis();
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
                await expect(store.get(el as string)).rejects.toThrow(/TriFrostRedisStore@get: Invalid key/);
            }
            expect(redis.isEmpty).toBe(true);
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
                await expect(store.set(el as string, {x: 1})).rejects.toThrow(/TriFrostRedisStore@set: Invalid key/);
            }
            expect(redis.isEmpty).toBe(true);
        });

        it('Throws on non-object/non-array value', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (Array.isArray(el)) continue;
                await expect(store.set('bad', el as any)).rejects.toThrow(/TriFrostRedisStore@set: Invalid value/);
            }

            for (const el of CONSTANTS.NOT_ARRAY) {
                if (isObject(el)) continue;
                await expect(store.set('bad', el as any)).rejects.toThrow(/TriFrostRedisStore@set: Invalid value/);
            }

            expect(redis.isEmpty).toBe(true);
        });
    });

    describe('delete', () => {
        it('Deletes key successfully', async () => {
            await store.set('to-del', {z: 9});
            await store.delete('to-del');
            expect(redis.calls).toEqual([
                ['set', ['to-del', '{"z":9}', ['EX', 60]]],
                ['del', ['to-del']],
            ]);
        });

        it('Does nothing for missing key', async () => {
            await store.delete('ghost');
            expect(redis.calls).toEqual([
                ['del', ['ghost']],
            ]);
        });

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.delete(el as string)).rejects.toThrow(/TriFrostRedisStore@delete: Invalid key/);
            }
            expect(redis.isEmpty).toBe(true);
        });
    });

    describe('stop', () => {
        it('Should not do anything and not throw', async () => {
            await store.stop();
            expect(redis.isEmpty).toBe(true);
        });
    });
});
