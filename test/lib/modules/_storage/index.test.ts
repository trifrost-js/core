import {describe, it, expect} from 'vitest';
import {DurableObjectStore as OGDurableObjectStore} from '../../../../lib/modules/_storage/DurableObject.ts';
import {KVStore as OGKVStore} from '../../../../lib/modules/_storage/KV.ts';
import {MemoryStore as OGMemoryStore} from '../../../../lib/modules/_storage/Memory.ts';
import {RedisStore as OGRedisStore} from '../../../../lib/modules/_storage/Redis.ts';
import * as Storage from '../../../../lib/modules/_storage';

describe('Modules - Storage', () => {
    describe('DurableObject', () => {
        it('Should link to the correct module', () => {
            expect(Storage.DurableObjectStore).toEqual(OGDurableObjectStore);
        });
    });

    describe('KV', () => {
        it('Should link to the correct module', () => {
            expect(Storage.KVStore).toEqual(OGKVStore);
        });
    });

    describe('Memory', () => {
        it('Should link to the correct module', () => {
            expect(Storage.MemoryStore).toEqual(OGMemoryStore);
        });
    });

    describe('Redis', () => {
        it('Should link to the correct module', () => {
            expect(Storage.RedisStore).toEqual(OGRedisStore);
        });
    });
});
