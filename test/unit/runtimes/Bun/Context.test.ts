import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {BunContext} from '../../../../lib/runtimes/Bun/Context';
import {DEFAULT_BODY_PARSER_OPTIONS} from '../../../../lib/utils/BodyParser/types';

const encoder = new TextEncoder();

describe('Runtimes - Bun - Context', () => {
    let ctx: BunContext;
    let mockLogger: any;
    let mockRequest: Request;
    let mockBunApi: any;

    const baseConfig = {
        env: {},
        cookies: {},
        cache: null,
        trustProxy: true,
    };

    beforeEach(() => {
        mockLogger = {
            spawn: vi.fn().mockReturnValue({
                traceId: 'abc123',
                setAttributes: vi.fn(),
                span: vi.fn((_, fn) => fn()),
                error: vi.fn(),
                debug: vi.fn(),
                warn: vi.fn(),
            }),
        };

        mockRequest = new Request('https://example.com/path?hello=1', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({test: true}),
        });

        mockBunApi = {
            file: vi.fn(),
        };

        ctx = new BunContext(baseConfig as any, mockLogger, mockBunApi, mockRequest);
    });

    afterEach(() => vi.restoreAllMocks());

    describe('constructor', () => {
        it('Parses method, path, and query correctly', () => {
            const req = new Request('https://domain.com/foo/bar?x=1&x=2&y=3', {
                method: 'POST',
                headers: {
                    'X-Test': '1',
                    'X-Thing': 'yes',
                },
            });

            const context = new BunContext(baseConfig as any, mockLogger, mockBunApi, req);

            expect(context.method).toBe('POST');
            expect(context.path).toBe('/foo/bar');

            const query = context.query;
            expect(query.getAll('x')).toEqual(['1', '2']);
            expect(query.get('y')).toBe('3');
        });

        it('Normalizes headers into plain object', () => {
            const req = new Request('https://example.com/', {
                method: 'GET',
                headers: {
                    'x-a': 'A',
                    'x-b': 'B',
                },
            });

            const context = new BunContext(baseConfig as any, mockLogger, mockBunApi, req);
            expect(context.headers).toEqual({
                'x-a': 'A',
                'x-b': 'B',
            });
        });

        it('Stores internal request instance', () => {
            const req = new Request('https://example.com/resource');
            const context = new BunContext(baseConfig as any, mockLogger, mockBunApi, req);
            expect(context['bun_req']).toBe(req);
        });

        it('Spawns logger with correct traceId', () => {
            const spy = vi.fn().mockReturnValue({
                traceId: 'trace-abc',
                setAttributes: vi.fn(),
                span: vi.fn((_, fn) => fn()),
                error: vi.fn(),
                debug: vi.fn(),
            });

            const req = new Request('https://example.com', {
                method: 'GET',
                headers: {
                    'x-trace-id': 'trace-abc',
                },
            });

            new BunContext(
                {
                    ...baseConfig,
                    requestId: {
                        inbound: ['x-trace-id'],
                    },
                } as any,
                {spawn: spy} as any,
                mockBunApi,
                req,
            );

            expect(spy).toHaveBeenCalledWith({
                traceId: 'trace-abc',
                env: baseConfig.env,
            });
        });

        it('Falls back to hexId when requestId not present', () => {
            const req = new Request('https://example.com', {
                method: 'GET',
            });

            const context = new BunContext(
                {
                    ...baseConfig,
                    requestId: {
                        inbound: ['x-trace-id'],
                    },
                } as any,
                mockLogger as any,
                mockBunApi,
                req,
            );

            expect(context.requestId).toMatch(/^[a-f0-9]{32}$/);
        });

        it('Sets initial defaults for name, kind, but not state (thats initialized afterwards)', () => {
            const req = new Request('https://example.com');
            const context = new BunContext(baseConfig as any, mockLogger, mockBunApi, req);

            expect(context.name).toBe('unknown');
            expect(context.kind).toBe('std');
            expect(context.state).toBe(undefined);
            expect(context.isInitialized).toBe(false);
        });
    });

    describe('init', () => {
        it('Calls super.init with parsed body', async () => {
            const match = {
                route: {
                    name: 'init-test',
                    kind: 'std',
                    bodyParser: null,
                },
                params: {user: 'gizmo'},
            };

            const parseSpy = vi
                .spyOn(await import('../../../../lib/utils/BodyParser/Request'), 'parseBody')
                .mockResolvedValue({foo: 'bar'});

            await ctx.init(match as any);

            expect(ctx.name).toBe('init-test');
            expect(ctx.kind).toBe('std');
            expect(ctx.state).toEqual({user: 'gizmo'});
            expect(ctx.body).toEqual({foo: 'bar'});
            expect(ctx.isInitialized).toBe(true);

            parseSpy.mockRestore();
        });

        it('Skips re-initialization on second call', async () => {
            const spy = vi.spyOn(await import('../../../../lib/utils/BodyParser/Request'), 'parseBody').mockResolvedValue({msg: 'noop'});

            const match = {
                route: {name: 'first', kind: 'std', bodyParser: null},
                params: {},
            };

            await ctx.init(match as any);
            await ctx.init({
                route: {name: 'second', kind: 'health', bodyParser: null},
                params: {x: '2'},
            } as any);

            expect(ctx.name).toBe('first');
            expect(ctx.kind).toBe('std');
            expect(spy).toHaveBeenCalledTimes(1);

            spy.mockRestore();
        });

        it('Defaults to DEFAULT_BODY_PARSER_OPTIONS if none provided', async () => {
            const spy = vi
                .spyOn(await import('../../../../lib/utils/BodyParser/Request'), 'parseBody')
                .mockImplementation((_ctx, _req, opts) => {
                    expect(opts).toEqual(DEFAULT_BODY_PARSER_OPTIONS);
                    return Promise.resolve({fallback: true});
                });

            const match = {
                route: {
                    name: 'defaults',
                    kind: 'std',
                    bodyParser: undefined,
                },
                params: {},
            };

            await ctx.init(match as any);
            expect(ctx.body).toEqual({fallback: true});

            spy.mockRestore();
        });

        it('Sets status 413 if body returns null', async () => {
            const spy = vi.spyOn(await import('../../../../lib/utils/BodyParser/Request'), 'parseBody').mockResolvedValue(null);

            const postCtx = new BunContext(
                baseConfig as any,
                mockLogger,
                mockBunApi,
                new Request('https://x.com', {
                    method: 'POST',
                    body: '',
                }),
            );

            const match = {
                route: {name: 'fail', kind: 'std', bodyParser: null},
                params: {},
            };

            await postCtx.init(match as any);
            expect(postCtx.statusCode).toBe(413);

            spy.mockRestore();
        });

        it('Logs and sets 400 if parseBody throws', async () => {
            const err = new Error('boom');
            const spy = vi.spyOn(await import('../../../../lib/utils/BodyParser/Request'), 'parseBody').mockRejectedValue(err);

            const ctx2 = new BunContext(baseConfig as any, mockLogger, mockBunApi, mockRequest);

            await ctx2.init({
                route: {name: 'bad', kind: 'std', bodyParser: null},
                params: {},
            } as any);

            expect(ctx2.statusCode).toBe(400);
            expect(ctx2.logger.error).toHaveBeenCalledWith(err);

            spy.mockRestore();
        });
    });

    describe('getStream', () => {
        it('Returns stream and size if file exists', async () => {
            const stream = new ReadableStream();
            mockBunApi.file.mockReturnValue({stream: () => stream, size: 123});

            const result = await ctx.getStream('/file.txt');

            expect(result).not.toBeNull();
            expect(result?.stream).toBe(stream);
            expect(result?.size).toBe(123);
        });

        it('Logs warning and returns null if file is not found', async () => {
            const warnSpy = vi.spyOn(ctx.logger, 'warn');
            mockBunApi.file.mockReturnValue(null);

            const result = await ctx.getStream('/missing.txt');

            expect(result).toBeNull();
            expect(warnSpy).toHaveBeenCalledWith('BunContext@getStream: File not found', {path: '/missing.txt'});
        });

        it('Logs error if file stream fails', async () => {
            const err = new Error('fail');
            const errorSpy = vi.spyOn(ctx.logger, 'error');
            mockBunApi.file.mockImplementation(() => {
                throw err;
            });

            const result = await ctx.getStream('/bad.txt');
            expect(result).toBeNull();
            expect(errorSpy).toHaveBeenCalledWith('BunContext@getStream: Failed to create stream', {
                msg: 'fail',
                path: '/bad.txt',
            });
        });
    });

    describe('stream', () => {
        it('Sets response with stream and headers', () => {
            const stream = new ReadableStream();
            ctx.setStatus(206);
            ctx.setHeader('X-Stream', 'yes');
            ctx['stream'](stream, 999);

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(206);
            expect(ctx.response?.headers.get('X-Stream')).toBe('yes');
        });

        it('Does nothing if already locked', () => {
            ctx['stream'](new ReadableStream(), 1);
            const first = ctx.response;
            ctx['stream'](new ReadableStream(), 2);
            expect(ctx.response).toBe(first);
        });
    });

    describe('abort', () => {
        it('Sets status and headers', () => {
            ctx.setHeader('X-Abort', 'true');
            ctx.abort(418);

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(418);
            expect(ctx.response?.headers.get('X-Abort')).toBe('true');
        });

        it('Defaults to 503 when status not provided', () => {
            ctx.abort();
            expect(ctx.response?.status).toBe(503);
        });

        it('Appends cookies if present', () => {
            ctx.cookies.set('x', '1');
            ctx.abort(400);

            expect(ctx.response?.headers.get('Set-Cookie')).toContain('x=1');
        });

        it('Skips if locked', () => {
            ctx.abort();
            const initial = ctx.response;
            ctx.abort(401);
            expect(ctx.response).toBe(initial);
        });
    });

    describe('end', () => {
        it('HEAD method with body sets correct content-length', () => {
            const req = new Request('https://example.com', {method: 'HEAD'});
            ctx = new BunContext(baseConfig as any, mockLogger, mockBunApi, req);

            ctx.setStatus(204);
            ctx.setHeader('X-Foo', 'bar');
            ctx.setBody('hi world');
            ctx.end();

            expect(ctx.response?.status).toBe(204);
            expect(ctx.response?.headers.get('X-Foo')).toBe('bar');
            expect(ctx.response?.headers.get('Content-Length')).toBe(encoder.encode('hi world').length.toString());
        });

        it('HEAD with non-string body sets Content-Length 0', () => {
            const req = new Request('https://example.com', {method: 'HEAD'});
            ctx = new BunContext(baseConfig as any, mockLogger, mockBunApi, req);
            ctx.setStatus(204);
            ctx.end();
            expect(ctx.response?.headers.get('Content-Length')).toBe('0');
        });

        it('POST method sets response body', async () => {
            const req = new Request('https://example.com', {method: 'POST'});
            ctx = new BunContext(baseConfig as any, mockLogger, mockBunApi, req);
            ctx.setStatus(200);
            ctx.setBody('hello');
            ctx.end();
            expect(await ctx.response?.text()).toBe('hello');
        });

        it('Skips end if locked', () => {
            vi.spyOn(ctx, 'isLocked', 'get').mockReturnValue(true);
            ctx.setBody('nope');
            ctx.end();
            expect(ctx.response).toBe(null);
        });

        it('Calls writeCookies', () => {
            const spy = vi.spyOn(ctx as any, 'writeCookies');
            ctx.setBody('🍪');
            ctx.end();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('runAfter', () => {
        it('Invokes queued afterHooks', async () => {
            const hook1 = vi.fn();
            const hook2 = vi.fn();
            ctx.afterHooks.push(hook1, hook2);
            ctx.runAfter();
            await new Promise(res => setTimeout(res, 0));
            expect(hook1).toHaveBeenCalled();
            expect(hook2).toHaveBeenCalled();
        });

        it('Skips if no hooks present', () => {
            expect(() => ctx.runAfter()).not.toThrow();
        });

        it('Ignores hook failures', async () => {
            const good = vi.fn();
            const bad = vi.fn(() => {
                throw new Error('bad');
            });
            ctx.afterHooks.push(bad, good);
            ctx.runAfter();
            await new Promise(res => setTimeout(res, 0));
            expect(good).toHaveBeenCalled();
        });
    });

    describe('getIP', () => {
        it('Returns remoteAddress from socket', () => {
            const socketReq = new Request('https://example.com');
            const reqWithSocket = Object.assign(socketReq, {
                socket: {remoteAddress: '1.2.3.4'},
            });

            const bunCtx = new BunContext(baseConfig as any, mockLogger, mockBunApi, reqWithSocket);
            expect(bunCtx['getIP']()).toBe('1.2.3.4');
        });

        it('Returns null if no socket info', () => {
            expect(ctx['getIP']()).toBeNull();
        });
    });

    describe('writeCookies', () => {
        it('Sets Set-Cookie headers from outgoing', () => {
            (ctx as any).res = new Response(null, {});
            ctx.cookies.set('token', 'abc');
            ctx.cookies.set('mode', 'dev', {httponly: true});

            ctx['writeCookies']();

            expect(ctx.response!.headers.get?.('Set-Cookie')).toBe('token=abc; Secure, mode=dev; Secure; HttpOnly');
        });

        it('Skips if no cookies', () => {
            (ctx as any).res = new Response(null, {headers: new Headers()});
            expect(() => ctx['writeCookies']()).not.toThrow();
        });
    });
});
