import {describe, it, expect} from 'vitest';
import {DurableObjectRateLimit as OGDurableObjectRateLimit} from '../../../../lib/modules/RateLimit/DurableObject.ts';
import {KVRateLimit as OGKVRateLimit} from '../../../../lib/modules/RateLimit/KV.ts';
import {MemoryRateLimit as OGMemoryRateLimit} from '../../../../lib/modules/RateLimit/Memory.ts';
import {RedisRateLimit as OGRedisRateLimit} from '../../../../lib/modules/RateLimit/Redis.ts';
import * as RateLimit from '../../../../lib/modules/RateLimit';

describe('Modules - RateLimit', () => {
    describe('DurableObject', () => {
        it('Should link to the correct module', () => {
            expect(RateLimit.DurableObjectRateLimit).toEqual(OGDurableObjectRateLimit);
        });
    });

    describe('KV', () => {
        it('Should link to the correct module', () => {
            expect(RateLimit.KVRateLimit).toEqual(OGKVRateLimit);
        });
    });

    describe('Memory', () => {
        it('Should link to the correct module', () => {
            expect(RateLimit.MemoryRateLimit).toEqual(OGMemoryRateLimit);
        });
    });

    describe('Redis', () => {
        it('Should link to the correct module', () => {
            expect(RateLimit.RedisRateLimit).toEqual(OGRedisRateLimit);
        });
    });
});
