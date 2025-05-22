import {describe, it, expect} from 'vitest';
import {
    DurableObjectCache,
    DurableObjectRateLimit,
} from '../../../lib/storage/DurableObject';
import {
    KVCache,
    KVRateLimit,
} from '../../../lib/storage/KV';
import {
    MemoryCache,
    MemoryRateLimit,
} from '../../../lib/storage/Memory';
import {
    RedisCache,
    RedisRateLimit,
} from '../../../lib/storage/Redis';
import * as Storage from '../../../lib/storage';

describe('Modules - Storage', () => {
    describe('DurableObject', () => {
        it('Cache should link to the correct module', () => {
            expect(Storage.DurableObjectCache).toEqual(DurableObjectCache);
        });

        it('RateLimit should link to the correct module', () => {
            expect(Storage.DurableObjectRateLimit).toEqual(DurableObjectRateLimit);
        });
    });

    describe('KV', () => {
        it('Cache should link to the correct module', () => {
            expect(Storage.KVCache).toEqual(KVCache);
        });

        it('RateLimit should link to the correct module', () => {
            expect(Storage.KVRateLimit).toEqual(KVRateLimit);
        });
    });

    describe('Memory', () => {
        it('Cache should link to the correct module', () => {
            expect(Storage.MemoryCache).toEqual(MemoryCache);
        });

        it('RateLimit should link to the correct module', () => {
            expect(Storage.MemoryRateLimit).toEqual(MemoryRateLimit);
        });
    });

    describe('Redis', () => {
        it('Cache should link to the correct module', () => {
            expect(Storage.RedisCache).toEqual(RedisCache);
        });

        it('RateLimit should link to the correct module', () => {
            expect(Storage.RedisRateLimit).toEqual(RedisRateLimit);
        });
    });
});
