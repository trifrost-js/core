import {describe, it, expect} from 'vitest';
import {DurableObjectCache as OGDurableObjectCache} from '../../../../lib/modules/Cache/DurableObject';
import {KVCache as OGKVCache} from '../../../../lib/modules/Cache/KV';
import {MemoryCache as OGMemoryCache} from '../../../../lib/modules/Cache/Memory';
import {RedisCache as OGRedisCache} from '../../../../lib/modules/Cache/Redis';
import * as Cache from '../../../../lib/modules/Cache';

describe('Modules - Cache', () => {
    describe('DurableObject', () => {
        it('Should link to the correct module', () => {
            expect(Cache.DurableObjectCache).toEqual(OGDurableObjectCache);
        });
    });

    describe('KV', () => {
        it('Should link to the correct module', () => {
            expect(Cache.KVCache).toEqual(OGKVCache);
        });
    });

    describe('Memory', () => {
        it('Should link to the correct module', () => {
            expect(Cache.MemoryCache).toEqual(OGMemoryCache);
        });
    });

    describe('Redis', () => {
        it('Should link to the correct module', () => {
            expect(Cache.RedisCache).toEqual(OGRedisCache);
        });
    });
});
