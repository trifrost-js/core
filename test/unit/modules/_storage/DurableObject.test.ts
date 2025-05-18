import {describe, it, expect, beforeEach} from 'vitest';
import {DurableObjectStore} from '../../../../lib/modules/_storage/DurableObject';
import {MockDurableObjectNamespace} from '../../../MockDurableObject';
import CONSTANTS from '../../../constants';
import {isObject} from '@valkyriestudios/utils/object';
import {isArray} from '@valkyriestudios/utils/array';

describe('Modules - Storage - DurableObject', () => {
    let ns: MockDurableObjectNamespace;
    let store: DurableObjectStore;
    let stub: ReturnType<MockDurableObjectNamespace['get']>;

    beforeEach(() => {
        ns = new MockDurableObjectNamespace();
        store = new DurableObjectStore(ns, 'test');
        stub = ns.get(ns.idFromName('trifrost-test'));
        stub.reset();
    });

    describe('constructor', () => {
        it('Initializes correctly with a namespace', () => {
            expect(store).toBeInstanceOf(DurableObjectStore);
        });
    });

    describe('get', () => {
        it('Returns null for missing key', async () => {
            const result = await store.get('not-set');
            expect(result).toBeNull();
            expect(stub.calls).toEqual([
                ['https://do/trifrost-test?key=not-set', {method: 'GET'}],
            ]);
        });

        it('Returns parsed object if present', async () => {
            stub.map.set('obj', {x: 1});
            const result = await store.get('obj');
            expect(result).toEqual({x: 1});
            expect(stub.calls).toEqual([
                ['https://do/trifrost-test?key=obj', {method: 'GET'}],
            ]);
        });

        it('Returns parsed array if present', async () => {
            stub.map.set('arr', [0, 1, 2]);
            const result = await store.get('arr');
            expect(result).toEqual([0, 1, 2]);
            expect(stub.calls).toEqual([
                ['https://do/trifrost-test?key=arr', {method: 'GET'}],
            ]);
        });

        it('Returns null if stored value is malformed JSON', async () => {
            stub.fetch = async () => new Response('not-json', {status: 200});
            const result = await store.get('bad');
            expect(result).toBe(null);
            expect(stub.isEmpty);
        });

        it('Returns null if response is valid JSON but not object/array', async () => {
            stub.fetch = async () => new Response(JSON.stringify('not-a-struct'), {status: 200});
            const result = await store.get('scalar');
            expect(result).toBe(null);
        });

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.get(el as string)).rejects.toThrow(/TriFrostDurableObjectStore@get: Invalid key/);
            }
            expect(stub.isEmpty).toBe(true);
        });
    });

    describe('set', () => {
        it('Stores object with default TTL', async () => {
            await store.set('foo', {a: 1});
            expect(stub.map.get('foo')).toEqual({a: 1});
            expect(stub.calls).toEqual([
                [
                    'https://do/trifrost-test?key=foo',
                    {method: 'PUT', body: '{"v":{"a":1},"ttl":60}', headers: {'Content-Type': 'application/json'}},
                ],
            ]);
        });

        it('Stores array with default TTL', async () => {
            await store.set('arr', [1, 2, 3]);
            expect(stub.map.get('arr')).toEqual([1, 2, 3]);
            expect(stub.calls).toEqual([
                [
                    'https://do/trifrost-test?key=arr',
                    {method: 'PUT', body: '{"v":[1,2,3],"ttl":60}', headers: {'Content-Type': 'application/json'}},
                ],
            ]);
        });

        it('Respects custom TTL', async () => {
            await store.set('ttl-key', {y: 2}, {ttl: 120});
            expect(stub.calls).toEqual([
                [
                    'https://do/trifrost-test?key=ttl-key',
                    {method: 'PUT', body: '{"v":{"y":2},"ttl":120}', headers: {'Content-Type': 'application/json'}},
                ],
            ]);
        });

        it('Falls back to TTL = 60 if invalid', async () => {
            for (const el of [...CONSTANTS.NOT_INTEGER, 0, -1, 10.5]) {
                await store.set('fallback', {y: 1}, {ttl: el as number});
                expect(stub.calls).toEqual([
                    [
                        'https://do/trifrost-test?key=fallback',
                        {method: 'PUT', body: '{"v":{"y":1},"ttl":60}', headers: {'Content-Type': 'application/json'}},
                    ],
                ]);
                stub.reset();
            }
        });

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.set(el as string, {x: 1})).rejects.toThrow(/TriFrostDurableObjectStore@set: Invalid key/);
            }
            expect(stub.isEmpty).toBe(true);
        });

        it('Throws on non-object/non-array value', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (isArray(el)) continue;
                await expect(store.set('bad', el as any)).rejects.toThrow(/TriFrostDurableObjectStore@set: Invalid value/);
            }

            for (const el of CONSTANTS.NOT_ARRAY) {
                if (isObject(el)) continue;
                await expect(store.set('bad', el as any)).rejects.toThrow(/TriFrostDurableObjectStore@set: Invalid value/);
            }
            expect(stub.isEmpty).toBe(true);
        });
    });

    describe('del', () => {
        it('Deletes key successfully', async () => {
            await store.set('to-del', {z: 9});
            await store.del('to-del');
            expect(stub.calls).toEqual([
                [
                    'https://do/trifrost-test?key=to-del',
                    {method: 'PUT', body: '{"v":{"z":9},"ttl":60}', headers: {'Content-Type': 'application/json'}},
                ],
                [
                    'https://do/trifrost-test?key=to-del',
                    {method: 'DELETE'},
                ],
            ]);
        });

        it('Does nothing for missing key', async () => {
            await store.del('ghost');
            expect(stub.calls).toEqual([
                [
                    'https://do/trifrost-test?key=ghost',
                    {method: 'DELETE'},
                ],
            ]);
        });

        it('Throws when DO returns an error', async () => {
            stub.fetch = async () => new Response('fail', {status: 500});
            await expect(store.del('key')).rejects.toThrow(/TriFrostDurableObjectStore@del: Failed with status 500/);
            expect(stub.calls).toEqual([]);
        });

        it('Throws on invalid key', async () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                await expect(store.del(el as string)).rejects.toThrow(/TriFrostDurableObjectStore@del: Invalid key/);
            }
            expect(stub.isEmpty).toBe(true);
        });
    });

    describe('stop', () => {
        it('Should not do anything and not throw', async () => {
            await store.stop();
            expect(stub.isEmpty).toBe(true);
        });
    });
});
