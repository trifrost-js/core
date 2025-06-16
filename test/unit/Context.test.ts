/* eslint-disable max-statements */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-useless-constructor */
/* eslint-disable class-methods-use-this */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {HttpMethods} from '../../lib/types/constants';
import {hexId} from '../../lib/utils/Generic';
import {Context, IP_HEADER_CANDIDATES} from '../../lib/Context';
import {type TriFrostRootLogger} from '../../lib/modules/Logger/RootLogger';
import {type TriFrostContextConfig} from '../../lib/types/context';
import CONSTANTS from '../constants';
import {Cookies} from '../../lib/modules';

class TestContext extends Context {

    constructor (logger: TriFrostRootLogger, cfg: TriFrostContextConfig, req: any) {
        super(logger, cfg, req);
    }

    protected getIP (): string | null {
        return '127.0.0.1';
    }

    async getStream (path: string) {
        return {stream: new ReadableStream(), size: 123};
    }

    stream (stream: unknown, size: number | null): void {
      /* stub */
    }

    runAfter (): void {
        const hooks = this.afterHooks;
        for (let i = 0; i < hooks.length; i++) {
            try {
                hooks[i]();
            } catch {
                /* No-Op */
            }
        }
    }

    public call_getIPFromHeaders () {
        /* @ts-ignore */
        return this.getIPFromHeaders();
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
        cache: null,
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

    describe('State management', () => {
        it('Sets state correctly', () => {
            ctx.setState({foo: 'bar'});
            expect(ctx.state).toEqual({foo: 'bar'});
        });

        it('Deletes state keys', () => {
            ctx
                .setState({foo: 'bar', bar: 1})
                .delState(['foo']);
            expect(ctx.state).toEqual({bar: 1});
        });
    });

    describe('Header management', () => {
        it('Sets a header', () => {
            ctx.setHeader('X-Test', '123');
            /* @ts-ignore */
            expect(ctx.res_headers).toEqual({'X-Test': '123'});
        });

        it('Sets multiple headers', () => {
            ctx.setHeaders({'X-A': 'a', 'X-B': 'b'});
            /* @ts-ignore */
            expect(ctx.res_headers).toEqual({'X-A': 'a', 'X-B': 'b'});
        });

        it('Deletes a header', () => {
            ctx.setHeader('X-Delete', 'delete');
            ctx.delHeader('X-Delete');
            /* @ts-ignore */
            expect(ctx.res_headers).toEqual({});
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
            /* @ts-ignore */
            expect(ctx.res_body).toBe('Hello');
        });
    });

    describe('Lifecycle', () => {
        it('Marks as done on end()', () => {
            ctx.end();
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
    });

    describe('After hooks', () => {
        it('Adds and runs after hook', () => {
            const spy = vi.fn();
            ctx.addAfter(spy);
            ctx.runAfter();
            expect(spy).toHaveBeenCalled();
            expect(ctx.afterHooks).toEqual([spy]);
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
            await ctx.init({
                /* @ts-ignore */
                route: {name: 'test', kind: 'std', bodyParser: null},
                params: {},
            }, async () => ({}));
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
            /* @ts-ignore */
            TestContext.prototype.getIP = vi.fn().mockReturnValue(null);

            /* @ts-ignore */
            const ctx2 = new TestContext(mockLogger as any, {
                ...baseConfig,
                trustProxy: false,
            }, {
                ...baseRequest,
                headers: {},
            });

            expect(ctx2.ip).toBe(null);
        });

        it('Caches computed IP after first access with trustProxy=false', () => {
            /* @ts-ignore */
            TestContext.prototype.getIP = vi.fn().mockReturnValue('127.12.12.12');
            const spy = vi.spyOn(ctx, 'call_getIPFromHeaders');
            const val1 = ctx.ip;
            const val2 = ctx.ip;
            expect(val1).toBe('127.12.12.12');
            expect(val1).toBe(val2);
            expect(spy).not.toHaveBeenCalled();

            /* @ts-ignore */
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

            /* @ts-ignore */
            TestContext.prototype.getIP = vi.fn().mockReturnValue('127.12.12.12');
            const val1 = ctx2.ip;
            const val2 = ctx2.ip;
            expect(val1).toBe('8.8.8.8');
            expect(val1).toBe(val2);

            /* @ts-ignore */
            expect(TestContext.prototype.getIP).not.toHaveBeenCalled();
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
                cache: {spawn: spawnMock},
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
            expect(warn).toHaveBeenCalledWith(
                'TriFrostCookies@set: SameSite=None requires Secure=true; overriding to ensure security'
            );
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
            await ctx.init({
                /* @ts-ignore */
                route: {name: 'cool', kind: 'std', bodyParser: null},
                params: {},
            }, async () => ({}));
            expect(ctx.name).toBe('cool');
        });
    });

    describe('kind', () => {
        it('Defaults to "std"', () => {
            expect(ctx.kind).toBe('std');
        });

        it('Reflects kind set in init()', async () => {
            await ctx.init({
                /* @ts-ignore */
                route: {name: 'x', kind: 'health', bodyParser: null},
                params: {},
            }, async () => ({}));
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

        it('Caches fallback nonce after computing', () => {
            ctx.setState({});
            const nonce1 = ctx.nonce;
            const nonce2 = ctx.nonce;
            expect(nonce2).toBe(nonce1);
        });
    });

    describe('host', () => {
        it('Prefers request.headers.host', () => {
            expect(ctx.host).toBe('localhost');
        });

        it('Falls back to config host if missing in headers', () => {
            const cfgWithFallbackHost = {...baseConfig, host: 'fallback.example'};
            const reqWithoutHost = {...baseRequest, headers: {}};
            const ctx2 = new TestContext(mockLogger as any, cfgWithFallbackHost as any, reqWithoutHost);
            expect(ctx2.host).toBe('fallback.example');
        });

        it('Returns null if both header and config host are missing', () => {
            const ctx3 = new TestContext(mockLogger as any, {...baseConfig, host: undefined} as any, {
                ...baseRequest,
                headers: {},
            });
            expect(ctx3.host).toBe(null);
        });
    });

    describe('init()', () => {
        it('Sets isInitialized to true', async () => {
            await ctx.init({
                /* @ts-ignore */
                route: {name: 'foo', kind: 'std', bodyParser: null},
                params: {id: '123'},
            }, async () => ({}));
            expect(ctx.isInitialized).toBe(true);
        });

        it('Sets name, kind and initial state', async () => {
            await ctx.init({
                /* @ts-ignore */
                route: {name: 'foo', kind: 'health', bodyParser: null},
                params: {x: '1', y: '2'},
            }, async () => ({}));

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

            await postCtx.init({
                /* @ts-ignore */
                route: {name: 'test', kind: 'std', bodyParser: null},
                params: {},
            }, bodyHandler);

            expect(bodyHandler).toHaveBeenCalled();
            expect(postCtx.body).toEqual({a: 'b'});
        });

        it('Sets status to 413 if body parser returns null', async () => {
            const putCtx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                method: HttpMethods.PUT,
            });

            const logSpy = vi.spyOn(putCtx.logger, 'error');

            await putCtx.init({
                /* @ts-ignore */
                route: {name: 'fail', kind: 'std', bodyParser: null},
                params: {},
            }, async () => null);

            expect(putCtx.statusCode).toBe(413);
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('Catches and logs unexpected errors', async () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {...baseRequest, method: 'POST'});
            const err = new Error('explode');
            const loggerSpy = vi.spyOn(ctx2.logger, 'error');

            await ctx2.init({
                /* @ts-ignore */
                route: {name: 'explode', kind: 'std', bodyParser: null, method: 'POST'},
                params: {},
            }, async () => {
                throw err;
            });

            expect(ctx2.statusCode).toBe(400);
            expect(loggerSpy).toHaveBeenCalledWith(err);
        });

        it('Is a no-op if already initialized', async () => {
            const ctx2 = new TestContext(mockLogger as any, baseConfig as any, {...baseRequest, method: 'POST'});
            const spy = vi.fn().mockResolvedValue({});
            await ctx2.init({
                /* @ts-ignore */
                route: {name: 'once', kind: 'std', bodyParser: null},
                params: {},
            }, spy);

            await ctx2.init({
                /* @ts-ignore */
                route: {name: 'twice', kind: 'health', bodyParser: null},
                params: {x: '2'},
            }, spy);

            expect(ctx2.name).toBe('once');
            expect(ctx2.kind).toBe('std');
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('Is a no-op if a GET', async () => {
            const spy = vi.fn().mockResolvedValue({});
            await ctx.init({
                /* @ts-ignore */
                route: {name: 'once', kind: 'std', bodyParser: null},
                params: {},
            }, spy);

            expect(ctx.name).toBe('once');
            expect(ctx.kind).toBe('std');
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('fetch()', () => {
        const originalFetch = globalThis.fetch;

        beforeEach(() => {
            /* @ts-ignore */
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
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(expect.objectContaining({
                'http.method': 'GET',
                'http.url': 'https://api.example.com/data',
                'http.status_code': 200,
                'otel.status_code': 'OK',
                'span.kind': 'client',
            }));
        });

        it('Injects requestId into outbound headers if configured', async () => {
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
            expect((init.headers as Headers).get('x-request-id')).toBe(ctx2.requestId);
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
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(expect.objectContaining({
                'http.method': 'GET',
                'http.url': 'https://broken',
                'otel.status_code': 'ERROR',
            }));
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
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(expect.objectContaining({
                'http.url': 'https://api.example.com/alt',
                'http.method': 'PUT',
                'http.status_code': 201,
                'otel.status_code': 'OK',
                'span.kind': 'client',
            }));
        });

        it('Sets otel.status_code to ERROR for 500+ responses', async () => {
            const mockRes = new Response('fail', {status: 503});
            (globalThis.fetch as any).mockResolvedValue(mockRes);

            await ctx.fetch('https://api.example.com/fail');

            expect(ctx.logger.setAttributes).toHaveBeenCalledWith(expect.objectContaining({
                'http.status_code': 503,
                'otel.status_code': 'ERROR',
            }));
        });
    });

    describe('json()', () => {
        it('Responds with JSON object', () => {
            ctx.json({foo: 'bar'});
            /* @ts-ignore */
            expect(ctx.res_body).toBe(JSON.stringify({foo: 'bar'}));
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('application/json');
            expect(ctx.isDone).toBe(true);
        });

        it('Responds with JSON array', () => {
            ctx.json([1, 2, 3]);
            /* @ts-ignore */
            expect(ctx.res_body).toBe(JSON.stringify([1, 2, 3]));
            expect(ctx.isDone).toBe(true);
        });

        it('Respects pre-existing Content-Type', () => {
            ctx.setHeader('Content-Type', 'application/vnd.custom+json');
            ctx.json({hello: 'world'});
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('application/vnd.custom+json');
        });

        it('Applies cacheControl headers', () => {
            ctx.json({msg: 'hello'}, {cacheControl: {type: 'public', maxage: 3600}});
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBe('public, max-age=3600');
        });

        it('Overwrites previously set Cache-Control', () => {
            ctx.setHeader('Cache-Control', 'manual');
            ctx.json({override: true}, {cacheControl: {type: 'no-store'}});
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBe('no-store');
        });

        it('Does not set Cache-Control when not passed', () => {
            ctx.json({silent: true});
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBeUndefined();
        });

        it('Throws on invalid body type', () => {
            for (const el of [...CONSTANTS.NOT_OBJECT, ...CONSTANTS.NOT_ARRAY]) {
                if (el === undefined || Object.prototype.toString.call(el) === '[object Object]' || Array.isArray(el)) continue;
                ctx.logger.error = vi.fn();
                ctx.json(el as any);
                expect(ctx.logger.error).toHaveBeenCalledWith(
                    new Error('Context@json: Invalid Payload'),
                    {body: el, opts: undefined}
                );
            }
        });

        it('Throws if context is locked', () => {
            ctx.abort();
            ctx.json({fail: true});
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@json: Cannot modify a finalized response'),
                {body: {fail: true}, opts: undefined}
            );
        });
    });

    describe('text()', () => {
        it('Responds with plain text', () => {
            ctx.text('hello world');
            /* @ts-ignore */
            expect(ctx.res_body).toBe('hello world');
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('text/plain');
            expect(ctx.isDone).toBe(true);
        });

        it('Respects existing Content-Type', () => {
            ctx.setHeader('Content-Type', 'text/markdown');
            ctx.text('## Hello');
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('text/markdown');
        });

        it('Applies cacheControl headers', () => {
            ctx.text('static text', {
                cacheControl: {
                    type: 'private',
                    maxage: 86400,
                    immutable: true,
                },
            });
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBe('private, max-age=86400, immutable');
        });

        it('Overwrites existing Cache-Control', () => {
            ctx.setHeader('Cache-Control', 'set-by-hand');
            ctx.text('overwrite me', {cacheControl: {type: 'no-cache'}});
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBe('no-cache');
        });

        it('Skips if cacheControl is not passed', () => {
            ctx.text('no headers here');
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBeUndefined();
        });

        it('Throws on non-string payload', () => {
            ctx.text(42 as any);
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@text: Invalid Payload'),
                {body: 42, opts: undefined}
            );
        });

        it('Throws if context is locked', () => {
            ctx.end();
            ctx.text('locked');
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@text: Cannot modify a finalized response'),
                {body: 'locked', opts: undefined}
            );
        });
    });

    describe('html()', () => {
        it('Responds with HTML string', () => {
            ctx.html('<html><body>Hello</body></html>');
            /* @ts-ignore */
            expect(ctx.res_body?.startsWith('<!DOCTYPE html><html>')).toBe(true);
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('text/html');
            expect(ctx.isDone).toBe(true);
        });

        it('Renders JSXElement using rootRender', () => {
            const jsxElement = {type: 'div', props: {children: 'World'}};
            ctx.html(jsxElement as any);
            /* @ts-ignore */
            expect(ctx.res_body).toContain('<div>World</div>');
        });

        it('Respects Content-Type if already set', () => {
            ctx.setHeader('Content-Type', 'application/xhtml+xml');
            ctx.html('<html><body>Hi</body></html>');
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('application/xhtml+xml');
        });

        it('Sets Cache-Control from options', () => {
            ctx.html('<div>HTML</div>', {
                cacheControl: {
                    type: 'public',
                    maxage: 600,
                    proxyRevalidate: true,
                },
            });
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBe('public, max-age=600, proxy-revalidate');
        });

        it('Overwrites manually-set Cache-Control', () => {
            ctx.setHeader('Cache-Control', 'fixed');
            ctx.html('<span>Should change</span>', {
                cacheControl: {
                    type: 'no-store',
                },
            });
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBe('no-store');
        });

        it('Skips if cacheControl is not passed', () => {
            ctx.html('<em>Simple</em>');
            /* @ts-ignore */
            expect(ctx.res_headers['Cache-Control']).toBeUndefined();
        });

        it('Throws if context is locked', () => {
            ctx.end();
            ctx.html('<p>Too late</p>');
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@html: Cannot modify a finalized response'),
                {body: '<p>Too late</p>', opts: undefined}
            );
        });
    });

    describe('redirect()', () => {
        it('Redirects to absolute URL with default status', () => {
            ctx.redirect('https://example.com');
            /* @ts-ignore */
            expect(ctx.res_headers.Location).toBe('https://example.com');
            expect(ctx.statusCode).toBe(307);
            expect(ctx.isDone).toBe(true);
        });

        it('Redirects to relative path with query merge', () => {
            const withQuery = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                query: 'a=1',
            });
            withQuery.redirect('/next');
            /* @ts-ignore */
            expect(withQuery.res_headers.Location).toContain('?a=1');
        });

        it('Redirects with custom status and without query', () => {
            const clean = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                query: 'q=123',
            });
            clean.redirect('/path', {status: 301, keep_query: false});
            /* @ts-ignore */
            expect(clean.res_headers.Location).not.toContain('q=123');
            expect(clean.statusCode).toBe(301);
        });

        it('Upgrades http:// host to https:// correctly', () => {
            /* @ts-ignore */
            const httpHostCtx = new TestContext(mockLogger as any, {
                ...baseConfig,
                host: 'http://plain.example',
            }, {
                ...baseRequest,
                headers: {},
            });

            httpHostCtx.redirect('/secure');
            // @ts-ignore
            expect(httpHostCtx.res_headers.Location).toBe('https://plain.example/secure');
        });

        it('Throws if payload is invalid', () => {
            ctx.redirect(123 as any);
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@redirect: Invalid Payload'),
                {to: 123, opts: undefined}
            );
        });

        it('Throws on unknown status code', () => {
            ctx.redirect('/test', {status: 999 as any});
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@redirect: Invalid Payload'),
                {to: '/test', opts: {status: 999}}
            );
        });

        it('Throws if host is missing and URL is relative', () => {
            const noHost = new TestContext(mockLogger as any, {
                ...baseConfig,
                /* @ts-ignore */
                host: undefined,
            }, {
                ...baseRequest,
                headers: {},
            });
            noHost.redirect('/fail');
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@redirect: Not able to determine host for redirect'),
                {to: '/fail', opts: undefined}
            );
        });

        it('Throws if already ended', () => {
            ctx.end();
            ctx.redirect('/fail');
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@redirect: Cannot modify a finalized response'),
                {to: '/fail', opts: undefined}
            );
        });
    });

    describe('status()', () => {
        it('Sets the response status code and ends the context', () => {
            ctx.status(204);
            expect(ctx.statusCode).toBe(204);
            expect(ctx.isDone).toBe(true);
        });

        it('Overwrites previously set status code', () => {
            ctx.setStatus(200);
            ctx.status(404);
            expect(ctx.statusCode).toBe(404);
        });

        it('Does not update otel.status_code if same as start (200)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(200);
            expect(ctx.logger.setAttributes).not.toHaveBeenCalled();
        });

        it('Updates otel.status_code based on range (201)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(201);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 201,
                'otel.status_code': 'OK',
            });
        });

        it('Updates otel.status_code based on range (404)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(404);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 404,
                'otel.status_code': 'OK',
            });
        });

        it('Updates otel.status_code based on range (500)', () => {
            ctx.logger.setAttributes = vi.fn();
            ctx.status(500);
            expect(ctx.logger.setAttributes).toHaveBeenCalledWith({
                'http.status_code': 500,
                'otel.status_code': 'ERROR',
            });
        });

        it('Does not set a response body', () => {
            ctx.status(204);
            /* @ts-ignore */
            expect(ctx.res_body).toBe(null);
        });

        it('Throws if called after end()', () => {
            ctx.end();
            ctx.status(403);
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@status: Cannot modify a finalized response'),
                {status: 403}
            );
        });

        it('Throws if called after abort()', () => {
            ctx.abort();
            ctx.status(410);
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@status: Cannot modify a finalized response'),
                {status: 410}
            );
        });

        it('Throws if called with invalid code', () => {
            ctx.status(999 as any);
            expect(ctx.logger.error).toHaveBeenCalledWith(
                new Error('Context@setStatus: Invalid status code 999'),
                {status: 999}
            );
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
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('application/json');
        });

        it('Ignores unknown MIME types', () => {
            ctx.setType('application/unknown' as any);
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBeUndefined();
        });

        it('Overwrites existing Content-Type', () => {
            ctx.setHeader('Content-Type', 'text/plain');
            ctx.setType('text/html');
            /* @ts-ignore */
            expect(ctx.res_headers['Content-Type']).toBe('text/html');
        });

        it('Is a no-op if MIME type is not in MimeTypesSet', () => {
            /* @ts-ignore */
            const before = {...ctx.res_headers};
            ctx.setType('invalid/type' as any);
            /* @ts-ignore */
            expect(ctx.res_headers).toEqual(before);
        });
    });

    describe('setBody()', () => {
        it('Sets a string body', () => {
            ctx.setBody('hello world');
            /* @ts-ignore */
            expect(ctx.res_body).toBe('hello world');
        });

        it('Sets body to null when passed null', () => {
            ctx.setBody(null);
            /* @ts-ignore */
            expect(ctx.res_body).toBe(null);
        });

        it('Ignores non-string and non-null values', () => {
            /* @ts-ignore */
            ctx.setBody(42);
            /* @ts-ignore */
            expect(ctx.res_body).toBe(null);
        });

        it('Can overwrite previous value', () => {
            ctx.setBody('first');
            ctx.setBody('second');
            /* @ts-ignore */
            expect(ctx.res_body).toBe('second');
        });
    });

    describe('getIPFromHeaders()', () => {
        it('Returns null if trustProxy is false', () => {
            /* @ts-ignore */
            const ctxNoProxy = new TestContext(mockLogger as any, {
                ...baseConfig,
                trustProxy: false,
            }, {
                ...baseRequest,
                headers: {'x-forwarded-for': '1.2.3.4'},
            });

            expect(ctxNoProxy.call_getIPFromHeaders()).toBe(null);
        });

        it('Returns valid IP from x-forwarded-for', () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                trustProxy: true,
                headers: {'x-forwarded-for': '8.8.8.8, 4.4.4.4'},
            });
            expect(ctx.call_getIPFromHeaders()).toBe('8.8.8.8');
        });

        it('Returns IP from next available candidate', () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                trustProxy: true,
                headers: {
                    forwarded: 'for=9.9.9.9',
                    'x-real-ip': '5.5.5.5',
                },
            });
            expect(ctx.call_getIPFromHeaders()).toBe('5.5.5.5');
        });

        it('Returns null if no valid header is found', () => {
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                trustProxy: true,
                headers: {
                    'x-forwarded-for': 'invalid-ip',
                    'x-real-ip': '',
                },
            });
            expect(ctx.call_getIPFromHeaders()).toBe(null);
        });

        it('Promotes matched header to front of list', () => {
            const headers = {
                'cf-connecting-ip': '6.6.6.6',
            };

            const originalOrder = [...(IP_HEADER_CANDIDATES as string[])];
            ctx = new TestContext(mockLogger as any, baseConfig as any, {
                ...baseRequest,
                trustProxy: true,
                headers,
            });

            ctx.call_getIPFromHeaders();
            expect(IP_HEADER_CANDIDATES[0]).toBe('cf-connecting-ip');
            IP_HEADER_CANDIDATES.length = 0;
            IP_HEADER_CANDIDATES.push(...originalOrder);
        });
    });
});
