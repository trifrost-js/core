import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, beforeEach} from 'vitest';
import {KVStore} from '../../../../lib/modules/_storage/KV';
import {MockKV} from '../../../MockKV';
import CONSTANTS from '../../../constants';

describe('Modules - Storage - KV', () => {
    let kv:MockKV;
    let store:KVStore;

    beforeEach(() => {
        kv = new MockKV();
        store = new KVStore(kv);
    });

    describe('constructor', () => {
        it('initializes correctly with a KV namespace', () => {
            expect(store).toBeInstanceOf(KVStore);
        });
    });

    describe('get', () => {
        it('Returns null for missing keys', async () => {
            const result = await store.get('not-set');
            expect(result).toBeNull();
            expect(kv.calls).toEqual([
                ['get', ['not-set', 'json']],
            ]);
        });

        it('Returns parsed object if present', async () => {
            await kv.put('obj', JSON.stringify({x: 1}));
            const result = await store.get('obj');
            expect(result).toEqual({x: 1});
            expect(kv.calls).toEqual([
                ['put', ['obj', '{"x":1}', undefined]],
                ['get', ['obj', 'json']],
            ]);
        });

        it('Returns parsed array if present', async () => {
            await kv.put('val', JSON.stringify([0, 1, 2, {x: 1}]));
            const result = await store.get('val');
            expect(result).toEqual([0, 1, 2, {x: 1}]);
            expect(kv.calls).toEqual([
                ['put', ['val', '[0,1,2,{"x":1}]', undefined]],
                ['get', ['val', 'json']],
            ]);
        });

        it('Returns null if stored value is malformed JSON', async () => {
            await kv.put('bad-json', 'not:json');
            const result = await store.get('bad-json');
            expect(result).toBeNull();
            expect(kv.calls).toEqual([
                ['put', ['bad-json', 'not:json', undefined]],
                ['get', ['bad-json', 'json']],
            ]);
        });

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.get(el as string)).rejects.toThrow(/TriFrostKVStore@get: Invalid key/);
            }
            expect(kv.isEmpty);
        });
    });

    describe('set', () => {
        it('Defaults TTL to 60 if not provided', async () => {
            await store.set('ttl-default', {hello: 'world'});
            expect(kv.calls).toEqual([
                ['put', ['ttl-default', '{"hello":"world"}', {expirationTtl: 60}]],
            ]);
        });

        it('Stores object value as JSON', async () => {
            await store.set('thing', {test: true});
            const result = await store.get('thing');
            expect(result).toEqual({test: true});
            expect(kv.calls).toEqual([
                ['put', ['thing', '{"test":true}', {expirationTtl: 60}]],
                ['get', ['thing', 'json']],
            ]);
        });

        it('Stores array value as JSON', async () => {
            await store.set('thing', [0, 1, 2, {test: true}]);
            const result = await store.get('thing');
            expect(result).toEqual([0, 1, 2, {test: true}]);
            expect(kv.calls).toEqual([
                ['put', ['thing', '[0,1,2,{"test":true}]', {expirationTtl: 60}]],
                ['get', ['thing', 'json']],
            ]);
        });

        it('Respects provided TTL if valid', async () => {
            await store.set('ttl-key', {y: 2}, {ttl: 300});
            expect(kv.calls).toEqual([
                ['put', ['ttl-key', '{"y":2}', {expirationTtl: 300}]],
            ]);
        });

        it('Falls back to a TTL of 60 if provided TTL is not an integer above 0', async () => {
            for (const el of [...CONSTANTS.NOT_INTEGER, 0, -1, 10.5]) {
                await store.set('ttl-key', {y: 2}, {ttl: el as number});
                expect(kv.calls).toEqual([
                    ['put', ['ttl-key', '{"y":2}', {expirationTtl: 60}]],
                ]);
                kv.reset();
            }
        });

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.set(el as string, {x: 1})).rejects.toThrow(/TriFrostKVStore@set: Invalid key/);
            }
            expect(kv.isEmpty).toBe(true);
        });

        it('Throws on non-object/non-array value', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (Array.isArray(el)) continue;
                await expect(store.set('key', el as Record<string, unknown>)).rejects.toThrow(/TriFrostKVStore@set: Invalid value/);
            }

            for (const el of CONSTANTS.NOT_ARRAY) {
                if (isObject(el)) continue;
                await expect(store.set('key', el as Record<string, unknown>)).rejects.toThrow(/TriFrostKVStore@set: Invalid value/);
            }
            expect(kv.isEmpty).toBe(true);
        });
    });

    describe('del', () => {
        it('Removes a key if it exists', async () => {
            await store.set('toremove', {z: 9});
            expect(await store.get('toremove')).toEqual({z: 9});
            
            await store.del('toremove');
            expect(await store.get('toremove')).toBe(null);

            expect(kv.calls).toEqual([
                ['put', ['toremove', '{"z":9}', {expirationTtl: 60}]],
                ['get', ['toremove', 'json']],
                ['delete', ['toremove']],
                ['get', ['toremove', 'json']],
            ]);
        });

        it('does nothing for non-existent key', async () => {
            await expect(store.del('ghost')).resolves.toBe(undefined);
            expect(kv.calls).toEqual([
                ['delete', ['ghost']],
            ]);
        });

        it('throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.del(el as string)).rejects.toThrow(/TriFrostKVStore@del: Invalid key/);
            }
            expect(kv.isEmpty);
        });
    });

    describe('stop', () => {
        it('Should not do anything and not throw', async () => {
            await store.stop();
            expect(kv.isEmpty).toBe(true);
        });
    });
});
