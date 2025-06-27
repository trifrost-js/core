import {describe, it, expect, vi} from 'vitest';
import {Store} from '../../../lib/storage/_Storage';
import {MockContext} from '../../MockContext';

const mockAdapter = () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delPrefixed: vi.fn(),
    stop: vi.fn(),
});

describe('Storage - Storage', () => {
    describe('get', () => {
        it('Throws on invalid key', async () => {
            const store = new Store('TestStore', mockAdapter());
            for (const el of [null, '', undefined, 0, false]) {
                /* @ts-expect-error Should be good */
                await expect(store.get(el)).rejects.toThrow(/TestStore@get: Invalid key/);
            }
        });

        it('Returns value if adapter returns object/array', async () => {
            const adapter = mockAdapter();
            adapter.get.mockResolvedValue({foo: 'bar'});
            const store = new Store('TestStore', adapter);
            expect(await store.get('key')).toEqual({foo: 'bar'});
        });

        it('Returns null if adapter returns non-object', async () => {
            const adapter = mockAdapter();
            adapter.get.mockResolvedValue('string');
            const store = new Store('TestStore', adapter);
            expect(await store.get('key')).toBeNull();
        });

        it('Returns null and logs if adapter.get throws (spawned)', async () => {
            const adapter = mockAdapter();
            adapter.get.mockImplementation(() => {
                throw new Error('fail');
            });

            const ctx = new MockContext();
            const spy = vi.spyOn(ctx.logger, 'error');
            const store = new Store('TestStore', adapter).spawn(ctx);

            expect(await store.get('foo')).toBeNull();
            expect(spy).toHaveBeenCalledWith(expect.any(Error), {key: 'foo'});
        });
    });

    describe('set', () => {
        it('Throws on invalid key', async () => {
            const store = new Store('MyStore', mockAdapter());
            for (const el of [null, '', undefined]) {
                /* @ts-expect-error Should be good */
                await expect(store.set(el, {x: 1})).rejects.toThrow(/MyStore@set: Invalid key/);
            }
        });

        it('Throws on invalid value', async () => {
            const store = new Store('MyStore', mockAdapter());
            for (const val of [true, 'string', 123, null, undefined]) {
                await expect(store.set('key', val)).rejects.toThrow(/MyStore@set: Invalid value/);
            }
        });

        it('Uses TTL = 60 if missing or invalid', async () => {
            const adapter = mockAdapter();
            const store = new Store('MyStore', adapter);
            await store.set('k', {x: 1});
            expect(adapter.set).toHaveBeenCalledWith('k', {x: 1}, 60);

            await store.set('k', {x: 1}, {ttl: 0});
            expect(adapter.set).toHaveBeenCalledWith('k', {x: 1}, 60);
        });

        it('Respects provided TTL if valid', async () => {
            const adapter = mockAdapter();
            const store = new Store('MyStore', adapter);
            await store.set('k', {x: 1}, {ttl: 120});
            expect(adapter.set).toHaveBeenCalledWith('k', {x: 1}, 120);
        });

        it('Logs error if adapter.set throws (spawned)', async () => {
            const adapter = mockAdapter();
            adapter.set.mockImplementation(() => {
                throw new Error('fail');
            });

            const ctx = new MockContext();
            const spy = vi.spyOn(ctx.logger, 'error');
            const store = new Store('MyStore', adapter).spawn(ctx);

            await expect(store.set('fail', {x: 1})).resolves.toBeUndefined();
            expect(spy).toHaveBeenCalledWith(expect.any(Error), {
                key: 'fail',
                value: {x: 1},
                opts: undefined,
            });
        });
    });

    describe('del', () => {
        it('Calls adapter.del on string keys', async () => {
            const adapter = mockAdapter();
            const store = new Store('S', adapter);
            await store.del('user');
            expect(adapter.del).toHaveBeenCalledWith('user');
        });

        it('Calls adapter.delPrefixed on {prefix}', async () => {
            const adapter = mockAdapter();
            const store = new Store('S', adapter);
            await store.del({prefix: 'user:'});
            expect(adapter.delPrefixed).toHaveBeenCalledWith('user:');
        });

        it('Throws on invalid deletion input', async () => {
            const store = new Store('FailStore', mockAdapter());
            for (const val of [null, undefined, {}, {prefix: ''}]) {
                /* @ts-expect-error Should be good */
                await expect(store.del(val)).rejects.toThrow(/FailStore@del: Invalid deletion value/);
            }
        });

        it('Logs if adapter.del fails (spawned)', async () => {
            const adapter = mockAdapter();
            adapter.del.mockImplementation(() => {
                throw new Error('del error');
            });
            const ctx = new MockContext();
            const store = new Store('LogStore', adapter).spawn(ctx);
            const spy = vi.spyOn(ctx.logger, 'error');
            await expect(store.del('x')).resolves.toBeUndefined();
            expect(spy).toHaveBeenCalledWith(expect.any(Error), {val: 'x'});
        });

        it('Logs if adapter.delPrefixed fails (spawned)', async () => {
            const adapter = mockAdapter();
            adapter.delPrefixed.mockImplementation(() => {
                throw new Error('prefixed error');
            });
            const ctx = new MockContext();
            const store = new Store('PrefixLog', adapter).spawn(ctx);
            const spy = vi.spyOn(ctx.logger, 'error');
            await expect(store.del({prefix: 'x.'})).resolves.toBeUndefined();
            expect(spy).toHaveBeenCalledWith(expect.any(Error), {val: {prefix: 'x.'}});
        });
    });

    describe('stop', () => {
        it('Calls adapter.stop()', async () => {
            const adapter = mockAdapter();
            const store = new Store('StopTest', adapter);
            await store.stop();
            expect(adapter.stop).toHaveBeenCalled();
        });

        it('Logs error if stop throws (spawned)', async () => {
            const ctx = new MockContext();
            const adapter = mockAdapter();
            adapter.stop.mockImplementation(() => {
                throw new Error('stop fail');
            });

            const spy = vi.spyOn(ctx.logger, 'error');
            const store = new Store('FailStop', adapter).spawn(ctx);
            await expect(store.stop()).resolves.toBeUndefined();
            expect(spy).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('spawn', () => {
        it('Creates new Store with same adapter and name', () => {
            const ctx = new MockContext();
            const base = new Store('Spawned', mockAdapter());
            const cloned = base.spawn(ctx);

            expect(cloned.name).toBe('Spawned');
            expect(cloned).not.toBe(base);
        });
    });
});
