import {sleep} from '@valkyriestudios/utils/function';
import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest';
import {DurableObjectRateLimit} from '../../../../lib/modules/RateLimit/DurableObject';
import {MockContext} from '../../../MockContext';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType} from '../../../../lib/types/constants';
import {type TriFrostContextKind} from '../../../../lib/types/context';
import {MockDurableObjectNamespace} from '../../../MockDurableObject';
import CONSTANTS from '../../../constants';

describe('Modules - RateLimit - DurableObjectRateLimit', () => {
    let durable:MockDurableObjectNamespace;
    let stub: ReturnType<MockDurableObjectNamespace['get']>;

    beforeEach(() => {
        durable = new MockDurableObjectNamespace();
        stub = durable.get(durable.idFromName('trifrost-ratelimit'));
        stub.reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('Should throw if not provided a store', () => {
            for (const el of [
                ...CONSTANTS.NOT_OBJECT_WITH_EMPTY,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({store: val})),
            ]) {
                /* @ts-ignore */
                expect(() => new DurableObjectRateLimit(el)).toThrow(/DurableObjectRateLimit: Expected a store initializer/);
            }
        });

        it('Initializes with default strategy (fixed) and window (60)', async () => {
            const rl = new DurableObjectRateLimit({store: () => durable});
            const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
            const mw = rl.limit(2);
            const now = Math.floor(Date.now()/1000);
            await mw(ctx);
            expect(ctx.statusCode).not.toBe(429);
            expect(rl.strategy).toBe('fixed');
            expect(rl.window).toBe(60);
            expect(stub.calls).toEqual([
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {method: 'GET'}],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {
                    method: 'PUT',
                    body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                    headers: {'Content-Type': 'application/json'},
                }],
            ]);
        });

        it('Initializes with sliding strategy', async () => {
            const rl = new DurableObjectRateLimit({
                store: () => durable,
                strategy: 'sliding',
            });
            const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
            const mw = rl.limit(2);
            const now = Math.floor(Date.now()/1000);
            await mw(ctx);
            expect(ctx.statusCode).not.toBe(429);
            expect(rl.strategy).toBe('sliding');
            expect(rl.window).toBe(60);
            expect(stub.calls).toEqual([
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {method: 'GET'}],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:route:GET')}`, {
                    method: 'PUT',
                    body: `{"v":[${now}],"ttl":60}`,
                    headers: {'Content-Type': 'application/json'},
                }],
            ]);
        });

        it('Throws for invalid limit types', async () => {
            const rl = new DurableObjectRateLimit({store: () => durable});
            const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
            const mw = rl.limit(() => -1);
            await mw(ctx);
            expect(ctx.statusCode).toBe(500);
            expect(rl.strategy).toBe('fixed');
            expect(rl.window).toBe(60);
            expect(stub.isEmpty).toBe(true);
        });

        it('Skips processing for non-std context kinds', async () => {
            const rl = new DurableObjectRateLimit({store: () => durable});
            const mw = rl.limit(1);
          
            for (const kind of ['notfound', 'health', 'options']) {
                const ctx = new MockContext({kind: kind as TriFrostContextKind});
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                expect(Object.keys(ctx.headers).length).toBe(0);
                expect(stub.isEmpty).toBe(true);
            }
        });

        it('Registers correct introspection symbols', async () => {
            const rl = new DurableObjectRateLimit({store: () => durable});
            const mw = rl.limit(5);
          
            expect(rl.strategy).toBe('fixed');
            expect(rl.window).toBe(60);
            expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostRateLimit');
            expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
            expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('Middleware for rate limitting contexts passing through it');
            expect(stub.isEmpty).toBe(true);
        });

        it('Sets rate limit headers when enabled', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({window: 1, store: () => durable});
            const now = Math.floor(Date.now()/1000);
            const mw = rl.limit(1);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(429);
            expect(ctx.headers).toEqual({
                'Retry-After': 1,
                'X-RateLimit-Limit': 1,
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': now + 1,
            });
            expect(stub.calls).toEqual([
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {
                    method: 'PUT',
                    body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":1}`,
                    headers: {'Content-Type': 'application/json'},
                }],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
            ]);
        });

        it('Disables rate limit headers when disabled', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({headers: false, store: () => durable});
            const mw = rl.limit(1);
            const now = Math.floor(Date.now()/1000);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(429);
            expect(ctx.headers).toEqual({
                'Retry-After': '60',
            });
            expect(stub.calls).toEqual([
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {
                    method: 'PUT',
                    body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                    headers: {'Content-Type': 'application/json'},
                }],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
            ]);
        });

        it('Supports custom key generators', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({keygen: el => `ip:${el.ip}`, store: () => durable});
            const mw = rl.limit(10);
            const now = Math.floor(Date.now()/1000);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
            expect(ctx.headers).toEqual({
                'X-RateLimit-Limit': 10,
                'X-RateLimit-Remaining': 8,
                'X-RateLimit-Reset': now + rl.window,
            });
            expect(stub.calls).toEqual([
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {method: 'GET'}],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {
                    method: 'PUT',
                    body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                    headers: {'Content-Type': 'application/json'},
                }],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {method: 'GET'}],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('ip:127.0.0.1')}`, {
                    method: 'PUT',
                    body: `{"v":{"amt":2,"reset":${now+rl.window}},"ttl":60}`,
                    headers: {'Content-Type': 'application/json'},
                }],
            ]);
        });

        it('Supports custom exceeded handler', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const exceeded = vi.fn(el => el.status(400));
            const rl = new DurableObjectRateLimit({exceeded, store: () => durable});
            const mw = rl.limit(1);
            const now = Math.floor(Date.now()/1000);
            await mw(ctx);
            await mw(ctx);
            expect(exceeded).toHaveBeenCalledOnce();
            expect(ctx.statusCode).toBe(400);
            expect(stub.calls).toEqual([
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {
                    method: 'PUT',
                    body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                    headers: {'Content-Type': 'application/json'},
                }],
                [`https://do/trifrost-ratelimit?key=${encodeURIComponent('127.0.0.1:test:POST')}`, {method: 'GET'}],
            ]);
        });

        it('Generates correct keys for all built-in keygens (with IP)', async () => {
            const ctx = new MockContext({ip: '72.8.34.9', name: 'foo', method: 'GET'});
          
            const expected = {
                ip: '72.8.34.9',
                ip_name: '72.8.34.9:foo',
                ip_method: '72.8.34.9:GET',
                ip_name_method: '72.8.34.9:foo:GET',
            };
          
            for (const [key, key_expected] of Object.entries(expected)) {
                const rl = new DurableObjectRateLimit({keygen: key as any, store: () => durable});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);

                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                ]);
                stub.reset();
            }
        });
          
        it('Falls back to "unknown" if no IP is available', async () => {
            const ctx = new MockContext({ip: null, name: 'foo', method: 'GET'});
          
            const expected = {
                ip: 'unknown',
                ip_name: 'unknown:foo',
                ip_method: 'unknown:GET',
                ip_name_method: 'unknown:foo:GET',
            };
          
            for (const [key, key_expected] of Object.entries(expected)) {
                const rl = new DurableObjectRateLimit({keygen: key as any, store: () => durable});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);

                expect(stub.calls).toEqual([
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {
                        method: 'PUT',
                        body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                        headers: {'Content-Type': 'application/json'},
                    }],
                    [`https://do/trifrost-ratelimit?key=${encodeURIComponent(key_expected)}`, {method: 'GET'}],
                ]);
                stub.reset();
            }
        });

        it('Falls back to "unknown" if keygen returns falsy', async () => {
            const rl = new DurableObjectRateLimit({
                store: () => durable,
                keygen: () => undefined as unknown as string, /* Force falsy value */
            });
          
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const mw = rl.limit(1);
            const now = Math.floor(Date.now()/1000);
            await mw(ctx);
            await mw(ctx);
            expect(stub.calls).toEqual([
                ['https://do/trifrost-ratelimit?key=unknown', {method: 'GET'}],
                ['https://do/trifrost-ratelimit?key=unknown', {
                    method: 'PUT',
                    body: `{"v":{"amt":1,"reset":${now+rl.window}},"ttl":60}`,
                    headers: {'Content-Type': 'application/json'},
                }],
                ['https://do/trifrost-ratelimit?key=unknown', {method: 'GET'}],
            ]);
          
            expect(ctx.statusCode).toBe(429);
        });
    });

    describe('strategy:fixed', () => {
        it('Allows requests within limit', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({window: 1000, store: () => durable});
            const mw = rl.limit(2);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
        });

        it('Blocks requests over the limit', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({window: 1000, store: () => durable});
            const mw = rl.limit(1);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(429);
        });
    });

    describe('strategy:sliding', () => {
        it('Allows requests within windowed limit', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => durable});
            const mw = rl.limit(3);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
        });

        it('Blocks when timestamps exceed limit in window', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => durable});
            const mw = rl.limit(1);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(429);
        });

        it('Clears oldest timestamps after window expiry', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => durable});
            const mw = rl.limit(1);
            await mw(ctx);
            await sleep(2000);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
        });

        it('Prunes first timestamp if it falls outside the window', async () => {
            const rl = new DurableObjectRateLimit({strategy: 'sliding', window: 1, store: () => durable});
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const mw = rl.limit(2);
          
            /* First request */
            await mw(ctx);
          
            /* @ts-ignore Manually insert an old timestamp to simulate an aged entry */
            await rl.resolvedStore.store.set('127.0.0.1:test:POST', [Math.floor(Date.now()/1000) - 2]);
          
            /* Second request triggers pruning of old timestamp */
            await mw(ctx);
          
            /* @ts-ignore We want to test this */
            const val = await rl.resolvedStore.store.get('127.0.0.1:test:POST');
          
            expect(Array.isArray(val)).toBe(true);
            expect(val.length).toBe(1); /* old timestamp pruned */
            expect(val[0]).toBeGreaterThan(Math.floor(Date.now()/1000) - 1); /* only recent timestamp remains */
            expect(ctx.statusCode).toBe(200);
        });
    });
});
