import {describe, it, expect} from 'vitest';
import {DurableObjectCache} from '../../../../lib/modules/Cache/DurableObject';
import {KVCache} from '../../../../lib/modules/Cache/KV';
import {MemoryCache} from '../../../../lib/modules/Cache/Memory';
import {RedisCache} from '../../../../lib/modules/Cache/Redis';
import {cacheSkip, cache, cacheFn} from '../../../../lib/modules/Cache/util';
import * as Cache from '../../../../lib/modules/Cache';

describe('Modules - Cache', () => {
    describe('DurableObject', () => {
        it('Should link to the correct module', () => {
            expect(Cache.DurableObjectCache).toEqual(DurableObjectCache);
        });
    });

    describe('KV', () => {
        it('Should link to the correct module', () => {
            expect(Cache.KVCache).toEqual(KVCache);
        });
    });

    describe('Memory', () => {
        it('Should link to the correct module', () => {
            expect(Cache.MemoryCache).toEqual(MemoryCache);
        });
    });

    describe('Redis', () => {
        it('Should link to the correct module', () => {
            expect(Cache.RedisCache).toEqual(RedisCache);
        });
    });

    describe('cache', () => {
        it('Should link to the correct method', () => {
            expect(Cache.cache).toEqual(cache);
        });
    });

    describe('cacheFn', () => {
        it('Should link to the correct method', () => {
            expect(Cache.cacheFn).toEqual(cacheFn);
        });
    });

    describe('cacheSkip', () => {
        it('Should link to the correct method', () => {
            expect(Cache.cacheSkip).toEqual(cacheSkip);
        });
    });
});
