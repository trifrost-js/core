import {sleep} from '@valkyriestudios/utils/function';
import {describe, it, expect, vi, afterEach} from 'vitest';
import {MemoryRateLimit} from '../../../../lib/modules/RateLimit/Memory';
import {MockContext} from '../../../MockContext';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType} from '../../../../lib/types/constants';
import {type TriFrostContextKind} from '../../../../lib/types/context';

describe('Modules - RateLimit - MemoryRateLimit', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('Initializes with default strategy (fixed) and window (60)', async () => {
            const rl = new MemoryRateLimit();
            const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
            const mw = rl.limit(2);
            await mw(ctx);
            expect(ctx.statusCode).not.toBe(429);
            expect(rl.strategy).toBe('fixed');
            expect(rl.window).toBe(60);
            await rl.stop(); /* gc cleanup */
        });

        it('Initializes with sliding strategy', async () => {
            const rl = new MemoryRateLimit({strategy: 'sliding'});
            const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
            const mw = rl.limit(2);
            await mw(ctx);
            expect(ctx.statusCode).not.toBe(429);
            expect(rl.strategy).toBe('sliding');
            expect(rl.window).toBe(60);
            await rl.stop(); /* gc cleanup */
        });

        it('Throws for invalid limit types', async () => {
            const rl = new MemoryRateLimit();
            const ctx = new MockContext({ip: '127.0.0.1', name: 'route', method: 'GET'});
            const mw = rl.limit(() => -1);
            await mw(ctx);
            expect(ctx.statusCode).toBe(500);
            expect(rl.strategy).toBe('fixed');
            expect(rl.window).toBe(60);
            await rl.stop(); /* gc cleanup */
        });

        it('Skips processing for non-std context kinds', async () => {
            const rl = new MemoryRateLimit();
            const mw = rl.limit(1);
          
            for (const kind of ['notfound', 'health', 'options']) {
                const ctx = new MockContext({kind: kind as TriFrostContextKind});
                await mw(ctx);
                expect(ctx.statusCode).toBe(200);
                expect(Object.keys(ctx.headers).length).toBe(0);
            }
            await rl.stop(); /* gc cleanup */
        });

        it('Registers correct introspection symbols', async () => {
            const rl = new MemoryRateLimit();
            const mw = rl.limit(5);
          
            expect(rl.strategy).toBe('fixed');
            expect(rl.window).toBe(60);
            expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostRateLimit');
            expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
            expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('Middleware for rate limitting contexts passing through it');
            await rl.stop(); /* gc cleanup */
        });

        it('Sets rate limit headers when enabled', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({window: 1});
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
            await rl.stop(); /* gc cleanup */
        });

        it('Disables rate limit headers when disabled', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({headers: false});
            const mw = rl.limit(1);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(429);
            expect(ctx.headers).toEqual({
                'Retry-After': '60',
            });
            await rl.stop(); /* gc cleanup */
        });

        it('Supports custom key generators', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({keygen: el => `ip:${el.ip}`});
            const mw = rl.limit(10);
            const now = Math.floor(Date.now()/1000);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);

            /* @ts-ignore We want to test this */
            const val = await rl.resolvedStore.store.get('ip:127.0.0.1');
            expect(val.amt).toBe(2);
            expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);

            expect(ctx.headers).toEqual({
                'X-RateLimit-Limit': 10,
                'X-RateLimit-Remaining': 8,
                'X-RateLimit-Reset': now + rl.window,
            });
            await rl.stop(); /* gc cleanup */
        });

        it('Supports custom exceeded handler', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const exceeded = vi.fn(el => el.status(400));
            const rl = new MemoryRateLimit({exceeded});
            const mw = rl.limit(1);
            await mw(ctx);
            await mw(ctx);
            expect(exceeded).toHaveBeenCalledOnce();
            expect(ctx.statusCode).toBe(400);
            await rl.stop(); /* gc cleanup */
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
                const rl = new MemoryRateLimit({keygen: key as any});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);

                /* @ts-ignore We want to test this */
                const val = await rl.resolvedStore.store.get(key_expected);
                expect(val.amt).toBe(1);
                expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);
                await rl.stop();
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
                const rl = new MemoryRateLimit({keygen: key as any});
                const mw = rl.limit(1);
                const now = Math.floor(Date.now()/1000);
                await mw(ctx);
                await mw(ctx);
                expect(ctx.statusCode).toBe(429);

                /* @ts-ignore We want to test this */
                const val = await rl.resolvedStore.store.get(key_expected);
                expect(val.amt).toBe(1);
                expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);
                await rl.stop();
            }
        });

        it('Falls back to "unknown" if keygen returns falsy', async () => {
            const rl = new MemoryRateLimit({
                keygen: () => undefined as unknown as string, /* Force falsy value */
            });
          
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const mw = rl.limit(1);
            const now = Math.floor(Date.now()/1000);
        
            await mw(ctx);

            /* @ts-ignore We want to test this */
            const val = await rl.resolvedStore.store.get('unknown');
            expect(val.amt).toBe(1);
            expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);

            await mw(ctx);

            /* @ts-ignore We want to test this */
            const val2 = await rl.resolvedStore.store.get('unknown');
            expect(val2.amt).toBe(1); /* It should not have touched on the value as we shouldn't have done writes*/
            expect(val2.reset).toBeGreaterThanOrEqual(now + rl.window);
          
            expect(ctx.statusCode).toBe(429);
            await rl.stop(); /* gc cleanup */
        });
    });

    describe('strategy:fixed', () => {
        it('Allows requests within limit', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({window: 1});
            const mw = rl.limit(2);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
        });

        it('Blocks requests over the limit', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({window: 1});
            const mw = rl.limit(1);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(429);
            await rl.stop(); /* gc cleanup */
        });

        it('Removes expired items using GC filter (fixed)', async () => {
            const rl = new MemoryRateLimit({window: 1, strategy: 'fixed', gc_interval: 50});
          
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const mw = rl.limit(1);
          
            await mw(ctx);
            
            const now = Math.floor(Date.now()/1000);

            /* @ts-ignore We want to test this */
            const val = await rl.resolvedStore.store.get('127.0.0.1:test:POST');
            expect(val.amt).toBe(1);
            expect(val.reset).toBeGreaterThanOrEqual(now + rl.window);
          
            await sleep(100); /* Allow gc to run */
          
            /* @ts-ignore We want to test this */
            expect(await rl.resolvedStore.store.get('127.0.0.1:test:POST')).toBeNull();
            await rl.stop(); /* gc cleanup */
        });

        it('Calls stop() without error when the store was not resolved yet', async () => {
            const rl = new MemoryRateLimit({strategy: 'fixed'});
            await expect(rl.stop()).resolves.toBeUndefined();
        });

        it('Calls stop() without error when the store was resolved', async () => {
            const rl = new MemoryRateLimit({strategy: 'fixed'});
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const mw = rl.limit(1);
            await mw(ctx);
            await expect(rl.stop()).resolves.toBeUndefined();
        });
    });

    describe('strategy:sliding', () => {
        it('Allows requests within windowed limit', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
            const mw = rl.limit(3);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
            await rl.stop(); /* gc cleanup */
        });

        it('Blocks when timestamps exceed limit in window', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
            const mw = rl.limit(1);
            await mw(ctx);
            await mw(ctx);
            expect(ctx.statusCode).toBe(429);
            await rl.stop(); /* gc cleanup */
        });

        it('[is:slow] Clears oldest timestamps after window expiry', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
            const mw = rl.limit(1);
            await mw(ctx);
            await sleep(1100);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
            await rl.stop(); /* gc cleanup */
        });

        it('[is:slow] Removes old timestamps using GC filter (sliding)', async () => {
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const rl = new MemoryRateLimit({strategy: 'sliding', window: 1, gc_interval: 50});
            const mw = rl.limit(1);
            await mw(ctx);
            await sleep(2000);
            await mw(ctx);
            expect(ctx.statusCode).toBe(200);
            await rl.stop();
        });

        it('Prunes first timestamp if it falls outside the window', async () => {
            const rl = new MemoryRateLimit({strategy: 'sliding', window: 1});
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
            await rl.stop(); /* gc cleanup */
        });          

        it('Calls stop() without error when the store was not resolved yet', async () => {
            const rl = new MemoryRateLimit({strategy: 'sliding'});
            await expect(rl.stop()).resolves.toBeUndefined();
        });

        it('Calls stop() without error when the store was resolved', async () => {
            const rl = new MemoryRateLimit({strategy: 'sliding'});
            const ctx = new MockContext({ip: '127.0.0.1', name: 'test', method: 'POST'});
            const mw = rl.limit(1);
            await mw(ctx);
            await expect(rl.stop()).resolves.toBeUndefined();
        });
    });
});
