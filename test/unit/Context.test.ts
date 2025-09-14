/* eslint-disable @typescript-eslint/no-unused-vars */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {HttpMethods} from '../../lib/types/constants';
import {hexId} from '@valkyriestudios/utils/hash';
import {Context, IP_HEADER_CANDIDATES} from '../../lib/Context';
import {type TriFrostRootLogger} from '../../lib/modules/Logger/RootLogger';
import {type TriFrostContextConfig} from '../../lib/types/context';
import CONSTANTS from '../constants';
import {Cookies} from '../../lib/modules';
import {NONCE_WIN_SCRIPT} from '../../lib/modules/JSX/ctx/nonce';
import {ARC_GLOBAL, ARC_GLOBAL_OBSERVER} from '../../lib/modules/JSX/script/atomic';
import * as Generic from '../../lib/utils/Generic';
import {MemoryCache} from '../../lib';
import {Lazy} from '../../lib/utils/Lazy';

class TestContext extends Context {
    constructor(logger: TriFrostRootLogger, cfg: TriFrostContextConfig, req: any) {
        super(logger, cfg, req);
    }

    protected getIP(): string | null {
        return '127.0.0.1';
    }

    async getStream(path: string) {
        return {stream: new ReadableStream(), size: 123};
    }

    public stream(stream: unknown, size: number | null): void {
        super.stream(stream, size);
    }

    runAfter(): void {
        const hooks = this.afterHooks;
        for (let i = 0; i < hooks.length; i++) {
            try {
                hooks[i]({} as any);
            } catch {
                /* No-Op */
            }
        }
    }
}

describe('Context', () => {
    let ctx: TestContext;
    const mockLogger = {
        spawn: vi.fn().mockReturnValue({
            traceId: hexId(16),
            setAttributes: vi.fn(),
            span: vi.fn((_, fn) => fn()),
            error: vi.fn(),
            debug: vi.fn(),
        }),
    };

    const baseEnv = {};
    const baseConfig = {
        env: baseEnv,
        cache: new Lazy(() => new MemoryCache()),
        cookies: {},
        trustProxy: true,
    };
    const baseRequest = {
        method: HttpMethods.GET,
        path: '/test',
        query: '',
        headers: {host: 'localhost'},
    };

    beforeEach(() => {
        ctx = new TestContext(mockLogger as any, baseConfig as any, baseRequest);
    });

    describe('Constructor', () => {
        it('Uses requestId from headers when present and valid', () => {
            const ctxWithId = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    /* @ts-expect-error Should be good */
                    requestId: {
                        inbound: ['x-request-id'],
                    },
                },
                {
                    ...baseRequest,
                    headers: {
                        ...baseRequest.headers,
                        'x-request-id': 'abc-123',
                    },
                },
            );

            expect(ctxWithId.requestId).toBe('abc-123');
        });

        it('Skips invalid requestId when validator fails', () => {
            const validator = (val: string) => val.startsWith('valid-');

            const ctxInvalid = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    /* @ts-expect-error Should be good */
                    requestId: {
                        inbound: ['x-request-id'],
                        validate: validator,
                    },
                },
                {
                    ...baseRequest,
                    headers: {
                        ...baseRequest.headers,
                        'x-request-id': 'bad-id',
                    },
                },
            );

            // Should fall back to hexId (not 'bad-id')
            expect(ctxInvalid.requestId).not.toBe('bad-id');
            expect(ctxInvalid.requestId).toMatch(/^[a-f0-9]{32}$/);
        });

        it('Accepts requestId from headers if validator passes', () => {
            const validator = (val: string) => val.startsWith('valid-');

            const ctxValid = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    /* @ts-expect-error Should be good */
                    requestId: {
                        inbound: ['x-request-id'],
                        validate: validator,
                    },
                },
                {
                    ...baseRequest,
                    headers: {
                        ...baseRequest.headers,
                        'x-request-id': 'valid-42',
                    },
                },
            );

            expect(ctxValid.requestId).toBe('valid-42');
        });

        it('Falls back to hexId if no requestId header present', () => {
            const ctxFallback = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    /* @ts-expect-error Should be good */
                    requestId: {
                        inbound: ['x-request-id'],
                    },
                },
                {
                    ...baseRequest,
                    headers: {}, // no headers
                },
            );

            expect(ctxFallback.requestId).toMatch(/^[a-f0-9]{32}$/);
        });

        it('Spawns logger with correct traceId and env', () => {
            const loggerSpy = vi.fn().mockReturnValue({
                traceId: 'trace-me',
                setAttributes: vi.fn(),
                span: vi.fn((_, fn) => fn()),
                error: vi.fn(),
                debug: vi.fn(),
            });

            const req = {
                ...baseRequest,
                headers: {
                    'x-trace-id': 'trace-me',
                },
            };

            const ctxFresh = new TestContext(
                {spawn: loggerSpy} as any,
                {
                    ...baseConfig,
                    env: {stage: 'test'},
                    /* @ts-expect-error Should be good */
                    requestId: {
                        inbound: ['x-trace-id'],
                    },
                },
                req,
            );

            expect(loggerSpy).toHaveBeenCalledWith({
                traceId: 'trace-me',
                env: {stage: 'test'},
            });

            expect(ctxFresh.requestId).toBe('trace-me');
            expect(ctxFresh.logger.traceId).toBe('trace-me');
        });

        it('Stores provided config and request config correctly', () => {
            const ctxFresh = new TestContext(mockLogger as any, baseConfig as any, baseRequest);

            /* @ts-expect-error Should be good */
            expect(ctxFresh.ctx_config).toBe(baseConfig);

            /* @ts-expect-error Should be good */
            expect(ctxFresh.req_config).toBe(baseRequest);
        });
    });

    describe('State management', () => {
        it('Sets state correctly', () => {
            ctx.setState({foo: 'bar'});
            expect(ctx.state).toEqual({foo: 'bar'});
        });

        it('Deletes state keys', () => {
            ctx.setState({foo: 'bar', bar: 1}).delState(['foo']);
            expect(ctx.state).toEqual({bar: 1});
        });
    });

    describe('Header management', () => {
        it('Sets a header', () => {
            ctx.setHeader('X-Test', '123');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers).toEqual({'x-test': '123'});
        });

        it('Sets multiple headers', () => {
            ctx.setHeaders({'X-A': 'a', 'X-B': 'b'});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers).toEqual({'x-a': 'a', 'x-b': 'b'});
        });

        it('Overwrites header when set multiple times', () => {
            ctx.setHeader('X-Foo', '1');
            ctx.setHeader('X-Foo', '2');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['x-foo']).toBe('2');
        });

        it('Deletes a header', () => {
            ctx.setHeader('X-Delete', 'delete');
            ctx.delHeader('X-Delete');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers).toEqual({});
        });
    });

    describe('delHeaders', () => {
        it('Deletes multiple headers at once', () => {
            ctx.setHeader('X-Foo', 'bar');
            ctx.setHeader('X-Bar', 'baz');
            ctx.setHeader('X-Baz', 'qux');

            ctx.delHeaders(['X-Foo', 'X-Baz']);

            expect(ctx.resHeaders).toEqual({'x-bar': 'baz'});
        });

        it('Silently ignores non-existent keys', () => {
            ctx.setHeader('Content-Type', 'application/json');
            ctx.delHeaders(['X-Not-Set', 'Also-Missing']);

            expect(ctx.resHeaders).toEqual({'content-type': 'application/json'});
        });

        it('Handles an empty array safely', () => {
            ctx.setHeader('X-Thing', 'yes');
            ctx.delHeaders([]);

            expect(ctx.resHeaders).toEqual({'x-thing': 'yes'});
        });

        it('Is a noop when called before any headers are set', () => {
            ctx.delHeaders(['X-Foo', 'X-Bar']);
            expect(ctx.resHeaders).toEqual({});
        });

        it('Is case-sensitive (matches delHeader behavior)', () => {
            ctx.setHeader('X-Test', 'abc');
            ctx.delHeaders(['x-test']);

            expect(ctx.resHeaders).toEqual({});
        });
    });

    describe('Status handling', () => {
        it('Sets HTTP status code from code', () => {
            ctx.setStatus(404);
            expect(ctx.statusCode).toBe(404);
        });
    });

    describe('Response body', () => {
        it('Sets string body', () => {
            ctx.setBody('Hello');
            ctx.end();
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe('Hello');
        });
    });

    describe('Lifecycle', () => {
        it('Marks as done on end()', () => {
            ctx.end();
            expect(ctx.isDone).toBe(true);
        });

        it('Calling end() multiple times is safe', () => {
            ctx.end();
            expect(() => ctx.end()).not.toThrow();
            expect(ctx.isDone).toBe(true);
        });

        it('Aborts context', () => {
            ctx.abort(503);
            expect(ctx.isAborted).toBe(true);
            expect(ctx.statusCode).toBe(503);
        });

        it('Does not double abort', () => {
            ctx.abort(503);
            ctx.abort(404);
            expect(ctx.statusCode).toBe(503);
        });
    });

    describe('Timeouts', () => {
        it('Sets and clears timeout', () => {
            ctx.setTimeout(100);
            expect(ctx.timeout).toBe(100);
            ctx.clearTimeout();
            expect(ctx.timeout).toBe(null);
        });

        it('Logs error on invalid timeout value', () => {
            const spy = vi.spyOn(ctx.logger, 'error');
            ctx.setTimeout(-5);
            expect(spy).toHaveBeenCalledWith('Context@setTimeout: Expects a value above 0 or null', {val: -5});
        });

        it('Aborts with 408 if timeout triggers and context not locked', async () => {
            vi.useFakeTimers();
            ctx.logger.error = vi.fn();

            ctx.setTimeout(10);
            vi.advanceTimersByTime(10);

            expect(ctx.statusCode).toBe(408);
            expect(ctx.logger.error).toHaveBeenCalledWith('Request timed out');
            vi.useRealTimers();
        });

        it('Skips timeout abort if context is already locked', () => {
            vi.useFakeTimers();
            ctx.logger.error = vi.fn();

            ctx.setTimeout(50);
            ctx.end();

            vi.advanceTimersByTime(50);

            expect(ctx.logger.error).not.toHaveBeenCalledWith('Request timed out');
            expect(ctx.statusCode).toBe(200);
            vi.useRealTimers();
        });

        it('Clears timeout when setTimeout(null) is called', () => {
            ctx.setTimeout(100);
            expect(ctx.timeout).toBe(100);
            ctx.setTimeout(null);
            expect(ctx.timeout).toBe(null);
        });
    });

    describe('After hooks', () => {
        it('Adds and runs after hook', () => {
            const spy = vi.fn();
            ctx.addAfter(spy);
            ctx.runAfter();
            expect(spy).toHaveBeenCalled();
            expect(ctx.afterHooks).toEqual([spy]);
        });

        it('Runs async after hooks sequentially', async () => {
            const calls: string[] = [];
            ctx.addAfter(async () => {
                await new Promise(res => setTimeout(res, 10));
                calls.push('one');
            });
            ctx.addAfter(async () => {
                await new Promise(res => setTimeout(res, 10));
                calls.push('two');
            });

            await Promise.all(ctx.afterHooks.map(fn => fn(ctx)));
            expect(calls).toEqual(['one', 'two']);
        });

        it('Does not add an after hook if not a function', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                ctx.addAfter(el as any);
                expect(ctx.afterHooks).toEqual([]);
            }
        });
    });

    describe('IP and query', () => {
        it('Gets IP from getIP()', () => {
            expect(ctx.ip).toBe('127.0.0.1');
        });

        it('Parses query', () => {
            const c2 = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                query: 'foo=bar&baz=1',
            });
            expect(c2.query.get('foo')).toBe('bar');
            expect(c2.query.get('baz')).toBe('1');
        });
    });

    describe('isInitialized', () => {
        it('Returns false by default', () => {
            expect(ctx.isInitialized).toBe(false);
        });

        it('Returns true after init()', async () => {
            await ctx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'test', kind: 'std', bodyParser: null},
                    params: {},
                },
                async () => ({}),
            );
            expect(ctx.isInitialized).toBe(true);
        });
    });

    describe('isDone', () => {
        it('Returns false initially', () => {
            expect(ctx.isDone).toBe(false);
        });

        it('Returns true after end()', () => {
            ctx.end();
            expect(ctx.isDone).toBe(true);
        });
    });

    describe('isAborted', () => {
        it('Returns false initially', () => {
            expect(ctx.isAborted).toBe(false);
        });

        it('Returns true after abort()', () => {
            ctx.abort(500);
            expect(ctx.isAborted).toBe(true);
        });
    });

    describe('isLocked', () => {
        it('Is false by default', () => {
            expect(ctx.isLocked).toBe(false);
        });

        it('Is true if aborted', () => {
            ctx.abort();
            expect(ctx.isLocked).toBe(true);
        });

        it('Is true if done', () => {
            ctx.end();
            expect(ctx.isLocked).toBe(true);
        });
    });

    describe('env', () => {
        it('Returns the config environment', () => {
            expect(ctx.env).toBe(baseEnv);
        });
    });

    describe('ip', () => {
        it('Uses getIPFromHeaders when available and valid', () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {
                    'x-forwarded-for': '8.8.8.8',
                },
            });

            expect(ctx2.ip).toBe('8.8.8.8');
        });

        it('Falls back to getIP() if headers do not provide valid IP', () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {
                    'x-forwarded-for': 'invalid-ip',
                },
            });

            expect(ctx2.ip).toBe('127.0.0.1');
        });

        it('Returns null if no valid IP found', () => {
            /* @ts-expect-error Should be good */
            TestContext.prototype.getIP = vi.fn().mockReturnValue(null);

            const ctx2 = new TestContext(
                mockLogger as any,
                /* @ts-expect-error Should be good */
                {
                    ...baseConfig,
                    trustProxy: false,
                },
                {
                    ...baseRequest,
                    headers: {},
                },
            );

            expect(ctx2.ip).toBe(null);
        });

        it('Caches computed IP after first access with trustProxy=false', () => {
            /* @ts-expect-error Should be good */
            TestContext.prototype.getIP = vi.fn().mockReturnValue('127.12.12.12');
            /* @ts-expect-error Should be good */
            const spy = vi.spyOn(ctx, 'getIPFromHeaders');
            const val1 = ctx.ip;
            const val2 = ctx.ip;
            expect(val1).toBe('127.12.12.12');
            expect(val1).toBe(val2);
            expect(spy).toHaveBeenCalledTimes(1);

            /* @ts-expect-error Should be good */
            expect(TestContext.prototype.getIP).toHaveBeenCalledTimes(1);
        });

        it('Caches computed IP after first access with trustProxy=true', () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                trustProxy: true,
                headers: {
                    'x-forwarded-for': '8.8.8.8',
                },
            });

            /* @ts-expect-error Should be good */
            TestContext.prototype.getIP = vi.fn().mockReturnValue('127.12.12.12');
            const val1 = ctx2.ip;
            const val2 = ctx2.ip;
            expect(val1).toBe('8.8.8.8');
            expect(val1).toBe(val2);

            /* @ts-expect-error Should be good */
            expect(TestContext.prototype.getIP).not.toHaveBeenCalled();
        });

        it('Falls back to getIP() and nullifies invalid format', () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {},
            });

            vi.spyOn(ctx2 as any, 'getIP').mockReturnValue('not-an-ip');

            const result = ctx2.ip;
            expect(result).toBe(null);
        });
    });

    describe('resHeaders', () => {
        it('Returns an immutable copy of internal response headers', () => {
            ctx.setHeader('x-test', '123');
            const headers = ctx.resHeaders;

            expect(headers).toEqual({'x-test': '123'});
            expect(headers).not.toBe((ctx as any).res_headers);
        });

        it('Does not allow mutation of internal state', () => {
            ctx.setHeader('x-test', '123');
            const headers = ctx.resHeaders;

            /* @ts-expect-error this is what we're testing */
            headers['x-test'] = '456';
            /* @ts-expect-error this is what we're testing */
            headers['new-header'] = 'oops';

            expect(ctx.resHeaders).toEqual({'x-test': '123'});
        });

        it('Reflects new headers set after access', () => {
            const first = ctx.resHeaders;
            expect(first).toEqual({});

            ctx.setHeader('Content-Type', 'text/html');
            const second = ctx.resHeaders;
            expect(second).toEqual({'content-type': 'text/html'});
        });

        it('Ignores deleted headers from previous snapshot', () => {
            ctx.setHeader('X-Test', '123');
            const snap1 = ctx.resHeaders;
            ctx.delHeader('X-Test');
            const snap2 = ctx.resHeaders;

            expect(snap1).toEqual({'x-test': '123'});
            expect(snap2).toEqual({});
        });
    });

    describe('cache', () => {
        it('Returns the same instance on repeat access', () => {
            const c1 = ctx.cache;
            const c2 = ctx.cache;
            expect(c1).toBe(c2);
        });

        it('Spawns cache from ctx_config if available', () => {
            const spawnMock = vi.fn().mockReturnValue({
                get: vi.fn(),
                set: vi.fn(),
                del: vi.fn(),
            });

            const cfg = {
                ...baseConfig,
                cache: new Lazy(() => ({spawn: spawnMock})),
            };

            const ctx2 = new TestContext(mockLogger as any, cfg as any, baseRequest);
            const result = ctx2.cache;
            expect(spawnMock).toHaveBeenCalledWith(ctx2);
            expect(result).toBeDefined();
        });
    });

    describe('cookies', () => {
        it('Returns same Cookies instance across calls', () => {
            const first = ctx.cookies;
            const second = ctx.cookies;
            expect(first).toBe(second);
        });

        it('Initializes Cookies with ctx and config', () => {
            const cookiesInstance = ctx.cookies;
            expect(cookiesInstance).toBeInstanceOf(Cookies);
        });

        it('Parses incoming cookies from headers', () => {
            const c = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {
                    ...baseRequest.headers,
                    cookie: 'foo=bar; session=abc123',
                },
            });

            expect(c.cookies.all()).toEqual({
                foo: 'bar',
                session: 'abc123',
            });
            expect(c.cookies.get('foo')).toBe('bar');
            expect(c.cookies.get('session')).toBe('abc123');
            expect(c.cookies.get('nonexistent')).toBeNull();
        });

        it('Returns the same Cookies instance across calls', () => {
            expect(ctx.cookies).toBe(ctx.cookies);
        });

        it('Reflects newly set cookies in .all()', () => {
            ctx.cookies.set('newkey', 'newval');
            expect(ctx.cookies.all()).toMatchObject({newkey: 'newval'});
        });

        it('Adds a new Set-Cookie string on set()', () => {
            ctx.cookies.set('token', 'xyz', {
                path: '/',
                maxage: 3600,
                samesite: 'Lax',
                secure: true,
            });

            const out = ctx.cookies.outgoing;
            expect(Array.isArray(out)).toBe(true);
            expect(out[0]).toMatch(/^token=xyz;/);
            expect(out[0]).toContain('Secure');
            expect(out[0]).toContain('SameSite=Lax');
        });

        it('Enforces secure when SameSite=None', () => {
            const warn = vi.fn();
            ctx.logger.warn = warn;

            ctx.cookies.set('x', '1', {
                path: '/',
                samesite: 'None',
                secure: false,
            });

            const out = ctx.cookies.outgoing;
            expect(out[0]).toContain('Secure');
            expect(warn).toHaveBeenCalledWith('TriFrostCookies@set: SameSite=None requires Secure=true; overriding to ensure security');
        });

        it('Does not set cookie on invalid name or value', () => {
            const err = vi.fn();
            ctx.logger.error = err;

            ctx.cookies.set('foo;', 'bar');
            ctx.cookies.set('foo', 'bar\n');

            expect(err).toHaveBeenCalledTimes(2);
            expect(ctx.cookies.outgoing).toHaveLength(0);
        });
    });

    describe('method', () => {
        it('Returns the request method', () => {
            expect(ctx.method).toBe(baseRequest.method);
        });
    });

    describe('name', () => {
        it('Defaults to "unknown"', () => {
            expect(ctx.name).toBe('unknown');
        });

        it('Reflects value set in init()', async () => {
            await ctx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'cool', kind: 'std', bodyParser: null},
                    params: {},
                },
                async () => ({}),
            );
            expect(ctx.name).toBe('cool');
        });
    });

    describe('kind', () => {
        it('Defaults to "std"', () => {
            expect(ctx.kind).toBe('std');
        });

        it('Reflects kind set in init()', async () => {
            await ctx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'x', kind: 'health', bodyParser: null},
                    params: {},
                },
                async () => ({}),
            );
            expect(ctx.kind).toBe('health');
        });
    });

    describe('path', () => {
        it('Returns the request path', () => {
            expect(ctx.path).toBe(baseRequest.path);
        });
    });

    describe('nonce', () => {
        it('Returns nonce from state if defined', () => {
            ctx.setState({nonce: 'state-level-nonce'});
            expect(ctx.nonce).toBe('state-level-nonce');
        });

        it('Falls back to requestId-based btoa encoding', () => {
            ctx.setState({});
            const expected = btoa(ctx.requestId);
            expect(ctx.nonce).toBe(expected);
        });

        it('Encodes requestId as base64 fallback nonce', () => {
            ctx.setState({});
            const nonce = ctx.nonce;
            expect(() => atob(nonce)).not.toThrow();
        });

        it('Caches fallback nonce after computing', () => {
            ctx.setState({});
            const nonce1 = ctx.nonce;
            const nonce2 = ctx.nonce;
            expect(nonce2).toBe(nonce1);
        });
    });

    describe('host', () => {
        it('Uses getHostFromHeaders() result if available', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {'x-forwarded-host': 'proxy.example.com'},
            });

            /* @ts-expect-error should be good */
            const spy = vi.spyOn(ctx, 'getHostFromHeaders');
            const spyDetermine = vi.spyOn(Generic, 'determineHost');

            expect(ctx.host).toBe('proxy.example.com');

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spyDetermine).not.toHaveBeenCalled();
        });

        it('Uses getHostFromHeaders() result only once if available', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {'x-forwarded-host': 'proxy.example.com'},
            });

            /* @ts-expect-error should be good */
            const spy = vi.spyOn(ctx, 'getHostFromHeaders');
            const spyDetermine = vi.spyOn(Generic, 'determineHost');

            expect(ctx.host).toBe('proxy.example.com');
            expect(ctx.host).toBe('proxy.example.com');
            expect(ctx.host).toBe('proxy.example.com');

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spyDetermine).not.toHaveBeenCalled();
        });

        it('Falls back to determineHost() if headers returns null with trustProxy true', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {},
            });

            /* @ts-expect-error should be good */
            const spy = vi.spyOn(ctx, 'getHostFromHeaders');
            const spyDetermine = vi.spyOn(Generic, 'determineHost');

            expect(ctx.host).toBe('0.0.0.0');
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spyDetermine).toHaveBeenCalledTimes(1);
        });

        it('Falls back to determineHost() if headers returns null with trustProxy true and caches result', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {},
            });

            /* @ts-expect-error should be good */
            const spy = vi.spyOn(ctx, 'getHostFromHeaders');
            const spyDetermine = vi.spyOn(Generic, 'determineHost');

            expect(ctx.host).toBe('0.0.0.0');
            expect(ctx.host).toBe('0.0.0.0');
            expect(ctx.host).toBe('0.0.0.0');
            expect(ctx.host).toBe('0.0.0.0');
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spyDetermine).toHaveBeenCalledTimes(1);
        });

        it('Falls back to determineHost() if trustProxy is false', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: false} as any, {
                ...baseRequest,
                headers: {},
            });

            /* @ts-expect-error should be good */
            const spy = vi.spyOn(ctx, 'getHostFromHeaders');
            const spyDetermine = vi.spyOn(Generic, 'determineHost');

            expect(ctx.host).toBe('0.0.0.0');
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spyDetermine).toHaveBeenCalledTimes(1);
        });

        it('Caches result after first access', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: false} as any, {
                ...baseRequest,
                headers: {},
            });

            /* @ts-expect-error should be good */
            const spy = vi.spyOn(ctx, 'getHostFromHeaders');
            const spyDetermine = vi.spyOn(Generic, 'determineHost');

            const host1 = ctx.host;
            const host2 = ctx.host;

            expect(host1).toBe('0.0.0.0');
            expect(host1).toBe(host2);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spyDetermine).toHaveBeenCalledTimes(1);
        });
    });

    describe('domain', () => {
        it('Extracts effective domain from resolved host', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {host: 'subdomain.example.co.uk'},
            });

            expect(ctx.domain).toBe('example.co.uk');
        });

        it('Returns null for invalid or known non-domain hosts', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {host: 'localhost'},
            });

            expect(ctx.domain).toBeNull();
        });

        it('Returns null for IP-based hosts', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {host: '192.168.1.1'},
            });

            expect(ctx.domain).toBeNull();
        });

        it('Caches domain after first computation', () => {
            const ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {host: 'api.dev.example.com'},
            });

            const d1 = ctx.domain;
            const d2 = ctx.domain;
            expect(d1).toBe('example.com');
            expect(d1).toBe(d2);
        });
    });

    describe('body', () => {
        it('Returns empty object if body was not parsed', () => {
            expect(ctx.body).toEqual({});
        });

        it('Returns body if body was parsed', async () => {
            const parsed = {foo: 'bar'};
            const postCtx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                method: HttpMethods.POST,
            });

            await postCtx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'test', kind: 'std', bodyParser: null},
                    params: {},
                },
                async () => parsed,
            );

            expect(postCtx.body).toEqual(parsed);
        });
    });

    describe('init()', () => {
        it('Sets isInitialized to true', async () => {
            await ctx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'foo', kind: 'std', bodyParser: null},
                    params: {id: '123'},
                },
                async () => ({}),
            );
            expect(ctx.isInitialized).toBe(true);
        });

        it('Sets name, kind and initial state', async () => {
            await ctx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'foo', kind: 'health', bodyParser: null},
                    params: {x: '1', y: '2'},
                },
                async () => ({}),
            );

            expect(ctx.name).toBe('foo');
            expect(ctx.kind).toBe('health');
            expect(ctx.state).toEqual({x: '1', y: '2'});
        });

        it('Parses body if method allows it and handler is provided', async () => {
            const postCtx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                method: HttpMethods.POST,
            });

            const bodyHandler = vi.fn().mockResolvedValue({a: 'b'});

            await postCtx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'test', kind: 'std', bodyParser: null},
                    params: {},
                },
                bodyHandler,
            );

            expect(bodyHandler).toHaveBeenCalled();
            expect(postCtx.body).toEqual({a: 'b'});
        });

        it('Sets status to 413 if body parser returns null', async () => {
            const putCtx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                method: HttpMethods.PUT,
            });

            const logSpy = vi.spyOn(putCtx.logger, 'error');

            await putCtx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'fail', kind: 'std', bodyParser: null},
                    params: {},
                },
                async () => null,
            );

            expect(putCtx.statusCode).toBe(413);
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('Catches and logs unexpected errors', async () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {...baseRequest, method: 'POST'});
            const err = new Error('explode');
            const loggerSpy = vi.spyOn(ctx2.logger, 'error');

            await ctx2.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'explode', kind: 'std', bodyParser: null, method: 'POST'},
                    params: {},
                },
                async () => {
                    throw err;
                },
            );

            expect(ctx2.statusCode).toBe(400);
            expect(loggerSpy).toHaveBeenCalledWith(err);
        });

        it('Is a no-op if already initialized', async () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {...baseRequest, method: 'POST'});
            const spy = vi.fn().mockResolvedValue({});
            await ctx2.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'once', kind: 'std', bodyParser: null},
                    params: {},
                },
                spy,
            );

            await ctx2.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'twice', kind: 'health', bodyParser: null},
                    params: {x: '2'},
                },
                spy,
            );

            expect(ctx2.name).toBe('once');
            expect(ctx2.kind).toBe('std');
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('Is a no-op if a GET', async () => {
            const spy = vi.fn().mockResolvedValue({});
            await ctx.init(
                {
                    /* @ts-expect-error Should be good */
                    route: {name: 'once', kind: 'std', bodyParser: null},
                    params: {},
                },
                spy,
            );

            expect(ctx.name).toBe('once');
            expect(ctx.kind).toBe('std');
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('fetch()', () => {
        const originalFetch = globalThis.fetch;

        beforeEach(() => {
            /* @ts-expect-error should be good */
            globalThis.fetch = vi.fn();
            ctx.logger.setAttributes = vi.fn();
            ctx.logger.span = vi.fn((_, fn) => fn());
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        it('Performs a basic fetch with default method', async () => {
            const mockResponse = new Response('ok', {status: 200});
            (globalThis.fetch as any).mockResolvedValue(mockResponse);

            const res = await ctx.fetch('https://api.example.com/data');

            expect(globalThis.fetch).toHaveBeenCalledWith('https://api.example.com/data', expect.any(Object));
            expect(res.status).toBe(200);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(
                expect.objectContaining({
                    'http.method': 'GET',
                    'http.url': 'https://api.example.com/data',
                    'http.status_code': 200,
                    'otel.status_code': 'OK',
                    'span.kind': 'client',
                }),
            );
        });

        it('Injects logger trace id into outbound headers if configured', async () => {
            const configWithOutbound = {
                ...baseConfig,
                requestId: {
                    inbound: ['x-request-id'],
                    outbound: 'x-request-id',
                },
            };

            const ctx2 = new TestContext(mockLogger as any, configWithOutbound as any, baseRequest);
            const mockRes = new Response('yo', {status: 201});
            (globalThis.fetch as any).mockResolvedValue(mockRes);

            const res = await ctx2.fetch('https://test.io/data');
            const [url, init] = (globalThis.fetch as any).mock.calls[0];

            expect(url).toBe('https://test.io/data');
            expect((init.headers as Headers).get('x-request-id')).toBe(ctx2.logger.traceId);
            expect(res.status).toBe(201);
        });

        it('Supports custom method and payload', async () => {
            const resMock = new Response('ok', {status: 202});
            (globalThis.fetch as any).mockResolvedValue(resMock);

            await ctx.fetch('https://api.example.com/post', {
                method: 'POST',
                body: JSON.stringify({a: 1}),
            });

            const [, init] = (globalThis.fetch as any).mock.calls[0];
            expect(init.method).toBe('POST');
            expect(init.body).toBe(JSON.stringify({a: 1}));
        });

        it('Logs and rethrows fetch errors', async () => {
            const err = new Error('network fail');
            (globalThis.fetch as any).mockRejectedValue(err);
            ctx.logger.error = vi.fn();

            await expect(ctx.fetch('https://broken')).rejects.toThrow('network fail');

            expect(ctx.logger.error).toHaveBeenCalledWith(err);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(
                expect.objectContaining({
                    'http.method': 'GET',
                    'http.url': 'https://broken',
                    'otel.status_code': 'ERROR',
                }),
            );
        });

        it('Uses logger.span to wrap fetch', async () => {
            const mockResponse = new Response('span-ok', {status: 200});
            (globalThis.fetch as any).mockResolvedValue(mockResponse);

            ctx.logger.span = vi.fn((label, fn) => {
                expect(label).toMatch(/fetch GET https:\/\/api.example.com/);
                return fn();
            });

            const res = await ctx.fetch('https://api.example.com/data');
            expect(res.status).toBe(200);
        });

        it('Handles non-string Request inputs via toString()', async () => {
            const mockRes = new Response('done', {status: 201});
            (globalThis.fetch as any).mockResolvedValue(mockRes);

            const url = new URL('https://api.example.com/alt');
            const res = await ctx.fetch(url, {method: 'PUT'});

            expect(globalThis.fetch).toHaveBeenCalledWith(url, {
                method: 'PUT',
            });
            expect(res.status).toBe(201);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(
                expect.objectContaining({
                    'http.url': 'https://api.example.com/alt',
                    'http.method': 'PUT',
                    'http.status_code': 201,
                    'otel.status_code': 'OK',
                    'span.kind': 'client',
                }),
            );
        });

        it('Sets otel.status_code to ERROR for 500+ responses', async () => {
            const mockRes = new Response('fail', {status: 503});
            (globalThis.fetch as any).mockResolvedValue(mockRes);

            await ctx.fetch('https://api.example.com/fail');

            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(
                expect.objectContaining({
                    'http.status_code': 503,
                    'otel.status_code': 'ERROR',
                }),
            );
        });
    });

    describe('json()', () => {
        it('Responds with JSON object', () => {
            ctx.json({foo: 'bar'});
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(JSON.stringify({foo: 'bar'}));
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('application/json');
            expect(ctx.isDone).toBe(true);
        });

        it('Responds with JSON array', () => {
            ctx.json([1, 2, 3]);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(JSON.stringify([1, 2, 3]));
            expect(ctx.isDone).toBe(true);
        });

        it('Respects pre-existing Content-Type', () => {
            ctx.setHeader('content-type', 'application/vnd.custom+json');
            ctx.json({hello: 'world'});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('application/vnd.custom+json');
        });

        it('Applies cacheControl headers', () => {
            ctx.json({msg: 'hello'}, {cacheControl: {type: 'public', maxage: 3600}});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBe('public, max-age=3600');
        });

        it('Overwrites previously set Cache-Control', () => {
            ctx.setHeader('cache-control', 'manual');
            ctx.json({override: true}, {cacheControl: {type: 'no-store'}});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBe('no-store');
        });

        it('Does not set Cache-Control when not passed', () => {
            ctx.json({silent: true});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBeUndefined();
        });

        it('Preserves previously set status', () => {
            ctx.setStatus(201);
            ctx.json({msg: 'ok'});
            expect(ctx.statusCode).toBe(201);
        });

        it('Throws on invalid body type', () => {
            for (const el of [...CONSTANTS.NOT_OBJECT, ...CONSTANTS.NOT_ARRAY]) {
                if (el === undefined || Object.prototype.toString.call(el) === '[object Object]' || Array.isArray(el)) continue;
                ctx.logger.error = vi.fn();
                ctx.json(el as any);
                expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@json: Invalid Payload'), {body: el, opts: undefined});
            }
        });

        it('Throws if context is locked', () => {
            ctx.abort();
            ctx.json({fail: true});
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@json: Cannot modify a finalized response'), {
                body: {fail: true},
                opts: undefined,
            });
        });
    });

    describe('text()', () => {
        it('Responds with plain text', () => {
            ctx.text('hello world');
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe('hello world');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('text/plain');
            expect(ctx.isDone).toBe(true);
        });

        it('Respects existing Content-Type', () => {
            ctx.setHeader('content-type', 'text/markdown');
            ctx.text('## Hello');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('text/markdown');
        });

        it('Applies cacheControl headers', () => {
            ctx.text('static text', {
                cacheControl: {
                    type: 'private',
                    maxage: 86400,
                    immutable: true,
                },
            });
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBe('private, max-age=86400, immutable');
        });

        it('Overwrites existing Cache-Control', () => {
            ctx.setHeader('cache-control', 'set-by-hand');
            ctx.text('overwrite me', {cacheControl: {type: 'no-cache'}});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBe('no-cache');
        });

        it('Skips if cacheControl is not passed', () => {
            ctx.text('no headers here');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBeUndefined();
        });

        it('Preserves previously set status', () => {
            ctx.setStatus(202);
            ctx.text('accepted');
            expect(ctx.statusCode).toBe(202);
        });

        it('Throws on non-string payload', () => {
            ctx.text(42 as any);
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@text: Invalid Payload'), {body: 42, opts: undefined});
        });

        it('Throws if context is locked', () => {
            ctx.end();
            ctx.text('locked');
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@text: Cannot modify a finalized response'), {
                body: 'locked',
                opts: undefined,
            });
        });
    });

    describe('html()', () => {
        it('Responds with HTML string', async () => {
            await ctx.html('<html><body>Hello</body></html>');
            /* @ts-expect-error Should be good */
            expect(ctx.res_body?.startsWith('<!DOCTYPE html><html>')).toBe(true);
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('text/html');
            expect(ctx.isDone).toBe(true);
        });

        it('Renders JSXElement using rootRender', async () => {
            const jsxElement = {type: 'div', props: {children: 'World'}};
            await ctx.html(jsxElement as any);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toContain('<div>World</div>');
        });

        it('Respects Content-Type if already set', async () => {
            ctx.setHeader('content-type', 'application/xhtml+xml');
            await ctx.html('<html><body>Hi</body></html>');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('application/xhtml+xml');
        });

        it('Sets Cache-Control from options', async () => {
            await ctx.html('<div>HTML</div>', {
                cacheControl: {
                    type: 'public',
                    maxage: 600,
                    proxyRevalidate: true,
                },
            });
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBe('public, max-age=600, proxy-revalidate');
        });

        it('Overwrites manually-set Cache-Control', async () => {
            ctx.setHeader('cache-control', 'fixed');
            await ctx.html('<span>Should change</span>', {
                cacheControl: {
                    type: 'no-store',
                },
            });
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBe('no-store');
        });

        it('Skips if cacheControl is not passed', async () => {
            await ctx.html('<em>Simple</em>');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBeUndefined();
        });

        it('Adds doctype if HTML starts with <html', async () => {
            await ctx.html('<html><head></head><body></body></html>');
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe('<!DOCTYPE html><html><head></head><body></body></html>');
        });

        it('Preserves previously set status', async () => {
            ctx.setStatus(418);
            await ctx.html('<html><body></body></html>');
            expect(ctx.statusCode).toBe(418);
        });

        it('Injects nonce script and cookie on full-page HTML with CSP', async () => {
            const html = '<!DOCTYPE html><html><head></head><body><h1>Hello</h1></body></html>';
            const spySetCookie = vi.spyOn(ctx.cookies, 'set');

            ctx.setHeader('content-security-policy', "script-src 'self' 'nonce-abc123'");
            await ctx.html(html);

            const expectedNonce = ctx.nonce;
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(
                [
                    '<!DOCTYPE html>',
                    '<html>',
                    '<head>',
                    NONCE_WIN_SCRIPT(expectedNonce),
                    '</head>',
                    '<body><h1>Hello</h1></body>',
                    '</html>',
                ].join(''),
            );
            expect(spySetCookie).toHaveBeenCalledWith(
                'tfnonce',
                expectedNonce,
                expect.objectContaining({
                    httponly: true,
                    secure: true,
                    maxage: 86400,
                }),
            );
        });

        it('Rewrites nonce attributes and CSP on fragment HTML', async () => {
            const fragment = '<div><style nonce="xyz">.test{}</style></div>';
            ctx.cookies.set('tfnonce', 'noncified');
            ctx.setHeader('content-security-policy', "style-src 'self' 'nonce-xyz'");

            await ctx.html(fragment);

            const expectedNonce = ctx.nonce;
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(['<div>', '<style nonce="noncified">.test{}</style></div>'].join(''));
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-security-policy']).toBe("style-src 'self' 'nonce-noncified'");
        });

        it('Does not rewrite nonce attributes if no tfnonce is set for fragment HTML', async () => {
            const fragment = '<div><style nonce="xyz">.test{}</style></div>';
            ctx.setState({nonce: 'xyz'});
            ctx.setHeader('content-security-policy', "style-src 'self' 'nonce-xyz'");

            await ctx.html(fragment);

            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(['<div>', '<style nonce="xyz">.test{}</style></div>'].join(''));
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-security-policy']).toBe("style-src 'self' 'nonce-xyz'");
        });

        it('Skips nonce injection if CSP is missing', async () => {
            const html = '<!DOCTYPE html><html><body>OK</body></html>';
            await ctx.html(html);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).not.toContain('window.$tfnonce');
        });

        it('Throws if context is locked', async () => {
            ctx.end();
            await ctx.html('<p>Too late</p>');
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@html: Cannot modify a finalized response'), {
                body: '<p>Too late</p>',
                opts: undefined,
            });
        });
    });

    describe('redirect()', () => {
        it('Redirects to absolute URL with default status', () => {
            ctx.redirect('https://example.com');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers.location).toBe('https://example.com');
            expect(ctx.statusCode).toBe(303);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Redirects to relative path with query merge', () => {
            const withQuery = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                query: 'a=1',
            });
            withQuery.redirect('/next');
            /* @ts-expect-error Should be good */
            expect(withQuery.res_headers.location).toContain('?a=1');
            expect(withQuery.statusCode).toBe(303);
            /* @ts-expect-error Should be good */
            expect(withQuery.res_body).toBe(null);
            expect(withQuery.isDone).toBe(true);
        });

        it('Redirects with custom status and without query', () => {
            const clean = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                query: 'q=123',
            });
            clean.redirect('/path', {status: 301, keep_query: false});
            /* @ts-expect-error Should be good */
            expect(clean.res_headers.location).not.toContain('q=123');
            expect(clean.statusCode).toBe(301);
            /* @ts-expect-error Should be good */
            expect(clean.res_body).toBe(null);
            expect(clean.isDone).toBe(true);
        });

        it('Preserves "/"-prefixed paths without adding host', () => {
            const rel = new TestContext(mockLogger as any, baseConfig as any, baseRequest);
            rel.redirect('/dashboard');
            /* @ts-expect-error Should be good */
            expect(rel.res_headers.location).toBe('/dashboard');
            expect(rel.statusCode).toBe(303);
            /* @ts-expect-error Should be good */
            expect(rel.res_body).toBe(null);
            expect(rel.isDone).toBe(true);
        });

        it('Appends query to URLs that already contain one', () => {
            const withQuery = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                query: 'b=2',
            });

            withQuery.redirect('/next?page=1');
            /* @ts-expect-error Should be good */
            expect(withQuery.res_headers.location).toBe('/next?page=1&b=2');
            expect(withQuery.statusCode).toBe(303);
            /* @ts-expect-error Should be good */
            expect(withQuery.res_body).toBe(null);
            expect(withQuery.isDone).toBe(true);
        });

        it('Respects protocol-relative URLs and skips prefixing', () => {
            ctx.redirect('//cdn.example.com/image.jpg');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers.location).toBe('//cdn.example.com/image.jpg');
            expect(ctx.statusCode).toBe(303);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Prefixes host for non-slash-prefixed relative paths', () => {
            const rel = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    trustProxy: true,
                } as any,
                {
                    ...baseRequest,
                    headers: {host: 'example.org'},
                },
            );

            rel.redirect('dashboard');
            /* @ts-expect-error Should be good */
            expect(rel.res_headers.location).toBe('https://example.org/dashboard');
            expect(rel.statusCode).toBe(303);
            /* @ts-expect-error Should be good */
            expect(rel.res_body).toBe(null);
            expect(rel.isDone).toBe(true);
        });

        it('Upgrades http:// host to https:// if needed', () => {
            const rel = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    trustProxy: true,
                } as any,
                {
                    ...baseRequest,
                    headers: {
                        'x-forwarded-host': 'http://plain.org',
                    },
                },
            );

            rel.redirect('secure', {status: 307});
            /* @ts-expect-error Should be good */
            expect(rel.res_headers.location).toBe('https://plain.org/secure');
            expect(rel.statusCode).toBe(307);
            /* @ts-expect-error Should be good */
            expect(rel.res_body).toBe(null);
            expect(rel.isDone).toBe(true);
        });

        it('Redirects using host that already starts with https://', () => {
            const ctxWithHttpsHost = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    env: {TRIFROST_HOST: 'https://example.com'},
                } as any,
                {
                    ...baseRequest,
                    headers: {},
                    query: '',
                },
            );

            ctxWithHttpsHost.redirect('dashboard');
            /* @ts-expect-error Should be good */
            expect(ctxWithHttpsHost.res_headers.location).toBe('https://example.com/dashboard');
        });

        it('Redirects using host that starts with http:// (normalizes to https)', () => {
            const ctxWithHttpHost = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    trustProxy: true,
                } as any,
                {
                    ...baseRequest,
                    headers: {host: 'http://example.com'},
                    query: '',
                },
            );

            ctxWithHttpHost.redirect('foo');
            /* @ts-expect-error Should be good */
            expect(ctxWithHttpHost.res_headers.location).toBe('https://example.com/foo');
        });

        it('Throws if payload is invalid', () => {
            ctx.redirect(123 as any);
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@redirect: Invalid Payload'), {to: 123, opts: undefined});
        });

        it('Throws on unknown status code', () => {
            ctx.redirect('/test', {status: 999 as any});
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@redirect: Invalid Payload'), {
                to: '/test',
                opts: {status: 999},
            });
        });

        it('Throws if already ended', () => {
            ctx.end();
            ctx.redirect('/fail');
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@redirect: Cannot modify a finalized response'), {
                to: '/fail',
                opts: undefined,
            });
        });

        it('Throws if host is missing and redirect path requires prefixing', () => {
            const noHostCtx = new TestContext(
                mockLogger as any,
                {
                    ...baseConfig,
                    /* @ts-expect-error Should be good */
                    host: undefined /* explicitly no host in config */,
                },
                {
                    ...baseRequest,
                    headers: {} /* and no host in headers */,
                },
            );

            noHostCtx.redirect('dashboard');

            expect(noHostCtx.logger.error).toHaveBeenCalledWith(new Error('Context@redirect: Unable to determine host'), {
                to: 'dashboard',
                opts: undefined,
            });
        });
    });

    describe('status()', () => {
        it('Sets the response status code and ends the context', () => {
            ctx.status(204);
            expect(ctx.statusCode).toBe(204);
            expect(ctx.isDone).toBe(true);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
        });

        it('Overwrites previously set status code', () => {
            ctx.setStatus(200);
            ctx.status(404);
            expect(ctx.statusCode).toBe(404);
            expect(ctx.isDone).toBe(true);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
        });

        it('Does not update otel.status_code if same as start (200)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(200);
            expect(ctx.logger.setAttributes).not.toHaveBeenCalled();
            expect(ctx.statusCode).toBe(200);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Updates otel.status_code based on range (201)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(201);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 201,
                'otel.status_code': 'OK',
            });
            expect(ctx.statusCode).toBe(201);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Updates otel.status_code based on range (404)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(404);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 404,
                'otel.status_code': 'OK',
            });
            expect(ctx.statusCode).toBe(404);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Updates otel.status_code based on range (500)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(500);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 500,
                'otel.status_code': 'ERROR',
            });
            expect(ctx.statusCode).toBe(500);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Does not set a response body', () => {
            ctx.status(204);
            expect(ctx.statusCode).toBe(204);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Clears a set response body', () => {
            ctx.setBody('Howdie');
            ctx.status(204);
            expect(ctx.statusCode).toBe(204);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
            expect(ctx.isDone).toBe(true);
        });

        it('Throws if called after end()', () => {
            ctx.end();
            ctx.status(403);
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@status: Cannot modify a finalized response'), {status: 403});
        });

        it('Throws if called after abort()', () => {
            ctx.abort();
            ctx.status(410);
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@status: Cannot modify a finalized response'), {status: 410});
        });

        it('Throws if called with invalid code', () => {
            ctx.status(999 as any);
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@setStatus: Invalid status code 999'), {status: 999});
        });
    });

    describe('file()', () => {
        let streamSpy: any;
        let getStreamMock: any;

        beforeEach(() => {
            streamSpy = vi.fn();
            getStreamMock = vi.fn();

            ctx.stream = streamSpy;
            ctx.getStream = getStreamMock;
        });

        it('Throws if path is not a string', async () => {
            await ctx.file(123 as any);
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@file: Invalid Payload'), {input: 123, opts: undefined});
        });

        it('Skips if context is locked', async () => {
            ctx.end();
            await ctx.file('/some/file.txt');
            expect(ctx.logger.error).toHaveBeenCalledWith(new Error('Context@file: Cannot modify a finalized response'), {
                input: '/some/file.txt',
                opts: undefined,
            });
        });

        it('Applies cache control headers when passed', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 100});
            await ctx.file('/a.png', {
                cacheControl: {type: 'private', maxage: 123},
            });

            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['cache-control']).toBe('private, max-age=123');
        });

        it('Infers Content-Type from extension if not already set', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 100});
            await ctx.file('/cool.json');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('application/json');
        });

        it('Skips mime detection if Content-Type already exists', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 100});
            ctx.setHeader('content-type', 'custom/type');
            await ctx.file('/anything.unknown');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('custom/type');
        });

        it('Applies content-disposition for download=true', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 100});
            await ctx.file('/data.zip', {download: true});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-disposition']).toBe('attachment; filename="data.zip"; filename*=UTF-8\'\'data.zip');
        });

        it('Applies content-disposition for download=filename', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 100});
            await ctx.file('/data.zip', {download: 'résumé.pdf'});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-disposition']).toMatch(/filename/i);
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-disposition']).toContain('UTF-8');
        });

        it('Skips content-disposition if download option not passed', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 1});
            await ctx.file('/no-disposition.pdf');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-disposition']).toBeUndefined();
        });

        it('Sets content-disposition correctly when download is true', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 1});
            await ctx.file('/yes.txt', {download: true});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-disposition']).toBe('attachment; filename="yes.txt"; filename*=UTF-8\'\'yes.txt');
        });

        it('Handles download with ASCII-only filename', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 1});
            await ctx.file('/file.zip', {download: 'report.csv'});
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-disposition']).toBe('attachment; filename="report.csv"; filename*=UTF-8\'\'report.csv');
        });

        it('Handles download with UTF-8 filename needing encoding', async () => {
            getStreamMock.mockResolvedValue({stream: 'x', size: 1});
            await ctx.file('/résumé.zip', {download: 'rêsumé.zip'});
            /* @ts-expect-error Should be good */
            const header = ctx.res_headers['content-disposition'];
            expect(header).toContain('attachment;');
            expect(header).toContain('filename*=');
            expect(header).toMatch(/UTF-8''r%C3%AAsum%C3%A9\.zip/);
        });

        it('Handles download with filename that has only UTF-8 chars (no ASCII fallback)', async () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, baseRequest);
            ctx.getStream = vi.fn().mockResolvedValue({stream: 'x', size: 1});

            await ctx.file('/utf', {download: '📄.pdf'});

            /* @ts-expect-error Should be good */
            expect(ctx.res_headers).toEqual({
                'content-disposition': 'attachment; filename=".pdf"; filename*=UTF-8\'\'%EF%BF%BD%EF%BF%BD.pdf',
                'content-length': '1',
            });
        });

        it('Handles download with filename that has only UTF-8 chars (no ASCII fallback, part 2)', async () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, baseRequest);
            ctx.getStream = vi.fn().mockResolvedValue({stream: 'x', size: 1});

            await ctx.file('/utf', {download: '📄'});

            /* @ts-expect-error Should be good */
            expect(ctx.res_headers).toEqual({
                'content-disposition': 'attachment; filename="download"; filename*=UTF-8\'\'%EF%BF%BD%EF%BF%BD',
                'content-length': '1',
            });
        });

        it('Streams file if getStream() returns value', async () => {
            const fakeStream = {stream: 'stream-data', size: 420};
            getStreamMock.mockResolvedValue(fakeStream);
            await ctx.file('/serve.txt');
            expect(streamSpy).toHaveBeenCalledWith('stream-data', 420);
        });

        it('Skips setting Content-Type if already set', async () => {
            ctx.setHeader('content-type', 'application/custom');
            ctx.getStream = vi.fn().mockResolvedValue({stream: 'x', size: 1});
            await ctx.file('/file.png');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers).toEqual({
                'content-type': 'application/custom',
            });
        });

        it('Returns 404 if getStream() returns null', async () => {
            getStreamMock.mockResolvedValue(null);
            const statusSpy = vi.spyOn(ctx, 'status');
            await ctx.file('/not-found.txt');
            expect(statusSpy).toHaveBeenCalledWith(404);
        });

        it('Catches and logs thrown errors', async () => {
            const err = new Error('fail');
            getStreamMock.mockRejectedValue(err);
            await ctx.file('/crash.png', {});
            expect(ctx.logger.error).toHaveBeenCalledWith(err, {
                input: '/crash.png',
                opts: {},
            });
        });

        describe('custom stream input', () => {
            it('Streams from a valid stream object with name', async () => {
                const stream = {pipe: vi.fn()};
                ctx.stream = vi.fn();
                await ctx.file({stream, name: 'custom.txt'});
                expect(ctx.stream).toHaveBeenCalledWith(stream, null);
            });

            it('Uses provided size when present', async () => {
                const stream = {pipe: vi.fn()};
                ctx.stream = vi.fn();
                await ctx.file({stream, name: 'sized.txt', size: 456});
                expect(ctx.stream).toHaveBeenCalledWith(stream, 456);
            });

            it('Infers MIME from file name when not already set', async () => {
                const stream = {pipe: vi.fn()};
                ctx.stream = vi.fn();
                await ctx.file({stream, name: 'file.json'});
                /* @ts-expect-error Should be good */
                expect(ctx.res_headers).toEqual({
                    'content-type': 'application/json',
                });
            });

            it('Applies content-disposition from string `download`', async () => {
                const stream = {pipe: vi.fn()};
                ctx.stream = vi.fn();
                await ctx.file({stream, name: 'resume.pdf'}, {download: 'resume.pdf'});
                /* @ts-expect-error Should be good */
                expect(ctx.res_headers).toEqual({
                    'content-disposition': 'attachment; filename="resume.pdf"; filename*=UTF-8\'\'resume.pdf',
                    'content-type': 'application/pdf',
                });
            });

            it('Throws if name is missing', async () => {
                for (const el of [...CONSTANTS.NOT_STRING, '']) {
                    const errorSpy = vi.spyOn(ctx.logger, 'error');
                    await ctx.file({stream: {} as any, name: el} as any);
                    expect(errorSpy).toHaveBeenCalledWith(
                        new Error('Context@file: name is required when passing a stream'),
                        expect.anything(),
                    );
                }
            });

            it('Throws on completely invalid stream input', async () => {
                const errorSpy = vi.spyOn(ctx.logger, 'error');
                await ctx.file({notAStream: true} as any);
                expect(errorSpy).toHaveBeenCalledWith(new Error('Context@file: Invalid Payload'), expect.anything());
            });
        });
    });

    describe('stream()', () => {
        class StreamTestContext extends TestContext {
            public stream(stream: unknown, size: number | null) {
                super.stream(stream, size);
            }
        }

        let streamCtx: StreamTestContext;

        beforeEach(() => {
            streamCtx = new StreamTestContext(mockLogger as any, baseConfig as any, baseRequest);
        });

        it('Marks context as done', () => {
            streamCtx.stream('my-stream', null);
            expect(streamCtx.isDone).toBe(true);
        });

        it('Sets content-length if valid size provided', () => {
            streamCtx.stream('streamy', 512);
            /* @ts-expect-error Should be good */
            expect(streamCtx.res_headers).toEqual({
                'content-length': '512',
            });
        });

        it('Does not set content-length if size is null', () => {
            streamCtx.stream('data', null);
            /* @ts-expect-error Should be good */
            expect(streamCtx.res_headers).toEqual({});
        });

        it('Clears timeout on stream', () => {
            const clearSpy = vi.spyOn(streamCtx, 'clearTimeout');
            streamCtx.stream('blob', 123);
            expect(clearSpy).toHaveBeenCalled();
        });

        it('Skips if context is already locked', () => {
            streamCtx.end();
            /* @ts-expect-error Should be good */
            const before = {...streamCtx.res_headers};
            streamCtx.stream('ignored', 42);
            /* @ts-expect-error Should be good */
            expect(streamCtx.res_headers).toEqual(before);
        });
    });

    describe('render()', () => {
        it('Passes the override config if provided', async () => {
            const configOverride = {env: {}, cookies: {}, cache: null, trustProxy: false};
            const jsx = {type: 'span', props: {children: 'Custom'}};
            const spy = vi.spyOn(await import('../../lib/modules/JSX/render'), 'rootRender').mockReturnValue('<span>Custom</span>');

            const result = await ctx.render(jsx as any, configOverride as any);
            expect(result).toBe('<span>Custom</span>');
            expect(spy).toHaveBeenCalledWith(ctx, jsx, configOverride);

            spy.mockRestore();
        });

        it('Returns result even when JSX is empty', async () => {
            const jsx = {} as any;
            const spy = vi.spyOn(await import('../../lib/modules/JSX/render'), 'rootRender').mockReturnValue('<!empty>');
            const result = await ctx.render(jsx);
            expect(result).toBe('<!empty>');
            spy.mockRestore();
        });

        it('Passes css/script to render override', async () => {
            const dummyCss = {inject: vi.fn()};
            const dummyScript = vi.fn();

            const overrideOpts = {
                css: dummyCss,
                script: dummyScript,
            };

            const jsx = {type: 'style-test', props: {children: 'test'}};
            const rootRender = vi
                .spyOn(await import('../../lib/modules/JSX/render'), 'rootRender')
                .mockReturnValue('<style-test>test</style-test>');

            await ctx.render(jsx as any, overrideOpts as any);
            expect(rootRender).toHaveBeenCalledWith(ctx, jsx, expect.objectContaining(overrideOpts));

            rootRender.mockRestore();
        });

        it('Prepends with DOCTYPE if full page html', async () => {
            const configOverride = {env: {}, cookies: {}, cache: null, trustProxy: false};
            const jsx = {type: 'html', props: {children: {type: 'span', props: {children: 'Custom'}}}};
            const result = await ctx.render(jsx as any, configOverride as any);
            expect(result).toBe(
                `<!DOCTYPE html><html><span>Custom</span><script nonce="${ctx.nonce}">${ARC_GLOBAL(false)}${ARC_GLOBAL_OBSERVER}</script></html>`,
            );
        });

        it('Merges user-passed options on top of default ctx_config', async () => {
            const jsx = {type: 'span', props: {children: 'Merged'}};

            const baseConfig = {
                env: {FOO: 'default'},
                cookies: {secure: true},
                cache: null,
                trustProxy: false,
                foo: 'bar',
            };

            const ctxWithConfig = Object.create(ctx);
            ctxWithConfig.ctx_config = baseConfig;

            const override = {
                env: {FOO: 'override'},
                custom: 'value',
            };

            const merged = {...baseConfig, ...override};

            const rootRender = vi.spyOn(await import('../../lib/modules/JSX/render'), 'rootRender').mockReturnValue('<span>Merged</span>');

            const result = await ctxWithConfig.render(jsx as any, override as any);

            expect(result).toBe('<span>Merged</span>');
            expect(rootRender).toHaveBeenCalledWith(ctxWithConfig, jsx, merged);

            rootRender.mockRestore();
        });
    });

    describe('setStatus()', () => {
        it('Sets a known numeric status code', () => {
            ctx.setStatus(404);
            expect(ctx.statusCode).toBe(404);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 404,
                'otel.status_code': 'OK',
            });
        });

        it('Sets a known status from HttpCodeToStatus mapping', () => {
            ctx.setStatus(503);
            expect(ctx.statusCode).toBe(503);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 503,
                'otel.status_code': 'ERROR',
            });
        });

        it('Does not re-set attributes if status hasn’t changed', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.setStatus(200); // no change
            expect(ctx.logger.setAttributes).not.toHaveBeenCalled();
        });

        it('Throws on unknown numeric status code', () => {
            expect(() => ctx.setStatus(999 as any)).toThrow('Context@setStatus: Invalid status code 999');
        });

        it('Throws on completely invalid type', () => {
            expect(() => ctx.setStatus('not-a-code' as any)).toThrow('Context@setStatus: Invalid status code not-a-code');
        });

        it('Updates otel.status_code properly', () => {
            const cases = [
                [201, 'OK'],
                [404, 'OK'],
                [500, 'ERROR'],
                [503, 'ERROR'],
            ];

            for (const [code, otelStatus] of cases) {
                ctx.logger.setAttributes = vi.fn();
                ctx.setStatus(code as any);
                expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                    'http.status_code': code,
                    'otel.status_code': otelStatus,
                });
            }
        });
    });

    describe('setType()', () => {
        it('Sets a valid MIME type', () => {
            ctx.setType('application/json');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('application/json');
        });

        it('Ignores unknown MIME types', () => {
            ctx.setType('application/unknown' as any);
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBeUndefined();
        });

        it('Overwrites existing Content-Type', () => {
            ctx.setHeader('content-type', 'text/plain');
            ctx.setType('text/html');
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers['content-type']).toBe('text/html');
        });

        it('Is a no-op if MIME type is not in MimeTypesSet', () => {
            /* @ts-expect-error Should be good */
            const before = {...ctx.res_headers};
            ctx.setType('invalid/type' as any);
            /* @ts-expect-error Should be good */
            expect(ctx.res_headers).toEqual(before);
        });
    });

    describe('setBody()', () => {
        it('Sets a string body', () => {
            ctx.setBody('hello world');
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe('hello world');
        });

        it('Sets body to null when passed null', () => {
            ctx.setBody(null);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
        });

        it('Ignores non-string and non-null values', () => {
            /* @ts-expect-error Should be good */
            ctx.setBody(42);
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe(null);
        });

        it('Can overwrite previous value', () => {
            ctx.setBody('first');
            ctx.setBody('second');
            /* @ts-expect-error Should be good */
            expect(ctx.res_body).toBe('second');
        });
    });

    describe('getIPFromHeaders()', () => {
        it('Returns null if trustProxy is false', () => {
            const ctxNoProxy = new TestContext(
                mockLogger as any,
                /* @ts-expect-error Should be good */
                {
                    ...baseConfig,
                    trustProxy: false,
                },
                {
                    ...baseRequest,
                    headers: {'x-forwarded-for': '1.2.3.4'},
                },
            );

            /* @ts-expect-error Should be good */
            expect(ctxNoProxy.getIPFromHeaders()).toBe(null);
        });

        it('Returns valid IP from x-forwarded-for', () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {'x-forwarded-for': '8.8.8.8, 4.4.4.4'},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getIPFromHeaders()).toBe('8.8.8.8');
        });

        it('Returns IP from next available candidate', () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {
                    forwarded: 'for=9.9.9.9',
                    'x-real-ip': '5.5.5.5',
                },
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getIPFromHeaders()).toBe('5.5.5.5');
        });

        it('Returns null if no valid header is found', () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers: {
                    'x-forwarded-for': 'invalid-ip',
                    'x-real-ip': '',
                },
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getIPFromHeaders()).toBe(null);
        });

        it('Promotes matched header to front of list', () => {
            const headers = {
                'cf-connecting-ip': '6.6.6.6',
            };

            const originalOrder = [...(IP_HEADER_CANDIDATES as string[])];
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                headers,
            });

            /* @ts-expect-error Should be good */
            ctx.getIPFromHeaders();
            expect(IP_HEADER_CANDIDATES[0]).toBe('cf-connecting-ip');
            IP_HEADER_CANDIDATES.length = 0;
            IP_HEADER_CANDIDATES.push(...originalOrder);
        });
    });

    describe('getHostFromHeaders', () => {
        it('Returns null if trustProxy is not true', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: false} as any, {
                ...baseRequest,
                headers: {'x-forwarded-host': 'foo.com'},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBeNull();
        });

        it('Returns x-forwarded-host if present and valid', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {'x-forwarded-host': ' example.com '},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBe('example.com');
        });

        it('Returns host from Forwarded header if x-forwarded-host is missing', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {forwarded: 'for=123.123.123.123;host=api.example.com;proto=https'},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBe('api.example.com');
        });

        it('Parses forwarded case-insensitively', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {forwarded: 'Host=api.example.com'},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBe('api.example.com');
        });

        it('Returns host header if no forwarded variants exist', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {host: '  my.site.org '},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBe('my.site.org');
        });

        it('Returns null when all candidate headers are missing or empty', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBeNull();
        });

        it('Skips empty x-forwarded-host and falls back properly', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {'x-forwarded-host': '   ', host: 'my.com'},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBe('my.com');
        });

        it('Skips invalid forwarded and falls back to host', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {forwarded: 'garbage-string', host: 'example.org'},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBe('example.org');
        });

        it('Handles malformed forwarded header gracefully', () => {
            const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                ...baseRequest,
                headers: {forwarded: ';;;;;', host: 'fallback.org'},
            });
            /* @ts-expect-error Should be good */
            expect(ctx.getHostFromHeaders()).toBe('fallback.org');
        });

        it('Rejects non-string values in headers', () => {
            for (const badVal of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                const ctx = new TestContext(mockLogger as any, {...baseConfig, trustProxy: true} as any, {
                    ...baseRequest,
                    headers: {'x-forwarded-host': badVal as any, host: 'fallback.com'},
                });
                /* @ts-expect-error Should be good */
                expect(ctx.getHostFromHeaders()).toBe('fallback.com');
            }
        });
    });
});
