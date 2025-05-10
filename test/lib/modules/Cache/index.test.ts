import {describe, it, expect} from 'vitest';
import {DurableObjectCache as OGDurableObjectCache} from '../../../../lib/modules/Cache/DurableObject.ts';
import {KVCache as OGKVCache} from '../../../../lib/modules/Cache/KV.ts';
import {MemoryCache as OGMemoryCache} from '../../../../lib/modules/Cache/Memory.ts';
import {RedisCache as OGRedisCache} from '../../../../lib/modules/Cache/Redis.ts';
import * as Storage from '../../../../lib/modules/Cache';

describe('Modules - Cache', () => {
    describe('DurableObject', () => {
        it('Should link to the correct module', () => {
            expect(Storage.DurableObjectCache).toEqual(OGDurableObjectCache);
        });
    });

    describe('KV', () => {
        it('Should link to the correct module', () => {
            expect(Storage.KVCache).toEqual(OGKVCache);
        });
    });

    describe('Memory', () => {
        it('Should link to the correct module', () => {
            expect(Storage.MemoryCache).toEqual(OGMemoryCache);
        });
    });

    describe('Redis', () => {
        it('Should link to the correct module', () => {
            expect(Storage.RedisCache).toEqual(OGRedisCache);
        });
    });
});
