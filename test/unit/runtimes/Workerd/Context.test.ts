import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {WorkerdContext} from '../../../../lib/runtimes/Workerd/Context';
import {DEFAULT_BODY_PARSER_OPTIONS} from '../../../../lib/utils/BodyParser/types';

describe('Runtimes - Workerd - Context', () => {
    let ctx: WorkerdContext;
    let mockLogger: any;
    let mockRequest: Request;
    let mockExecutionCtx: ExecutionContext;

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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({test: true}),
        });

        mockExecutionCtx = {
            waitUntil: vi.fn(),
        } as any;

        ctx = new WorkerdContext(baseConfig as any, mockLogger, mockRequest, mockExecutionCtx);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('Parses method, path, and query correctly', () => {
            const req = new Request('https://domain.com/foo/bar?x=1&x=2&y=3', {
                method: 'POST',
                headers: {
                    'X-Test': '1',
                    'X-Thing': 'yes',
                },
            });

            const execCtx = {waitUntil: vi.fn()} as any;

            const context = new WorkerdContext(baseConfig as any, mockLogger, req, execCtx);

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

            const context = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx as any);
            expect(context.headers).toEqual({
                'x-a': 'A',
                'x-b': 'B',
            });
        });

        it('Stores internal request and execution context', () => {
            const req = new Request('https://example.com/resource');
            const ctx2 = {waitUntil: vi.fn()} as any;

            const context = new WorkerdContext(baseConfig as any, mockLogger, req, ctx2);

            /* @ts-expect-error Should be good */
            expect(context.workerd_req).toBe(req);

            /* @ts-expect-error Should be good */
            expect(context.workerd_ctx).toBe(ctx2);
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

            new WorkerdContext(
                {
                    ...baseConfig,
                    requestId: {
                        inbound: ['x-trace-id'],
                    },
                } as any,
                {spawn: spy} as any,
                req,
                mockExecutionCtx as any,
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

            const context = new WorkerdContext(
                {
                    ...baseConfig,
                    requestId: {
                        inbound: ['x-trace-id'],
                    },
                } as any,
                mockLogger as any,
                req,
                mockExecutionCtx as any,
            );

            expect(context.requestId).toMatch(/^[a-f0-9]{32}$/);
        });

        it('Sets initial defaults for name, kind, but not state (thats initialized afterwards)', () => {
            const req = new Request('https://example.com');
            const context = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx as any);

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

            // Patch parseBody temporarily
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

            expect(ctx.name).toBe('first'); // not second
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

            const postCtx = new WorkerdContext(
                baseConfig as any,
                mockLogger,
                new Request('https://x.com', {
                    method: 'POST',
                    body: '',
                }),
                mockExecutionCtx as any,
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

            const ctx2 = new WorkerdContext(baseConfig as any, mockLogger, mockRequest, mockExecutionCtx);

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
        const assetResponse = (body: ReadableStream | null, status = 200, headers = {}): Response =>
            new Response(body, {
                status,
                headers: new Headers(headers),
            });

        it('Returns stream and size when ASSETS is configured and response is OK', async () => {
            const stream = new ReadableStream();
            const fetchMock = vi.fn().mockResolvedValue(assetResponse(stream, 200, {'content-length': '1024'}));

            ctx = new WorkerdContext(
                {
                    ...baseConfig,
                    env: {
                        ASSETS: {fetch: fetchMock},
                    },
                } as any,
                mockLogger,
                mockRequest,
                mockExecutionCtx,
            );

            const result = await ctx.getStream('/file.txt');

            expect(fetchMock).toHaveBeenCalledWith(expect.any(Request));
            expect(result).not.toBeNull();
            expect(result?.size).toBe(1024);
            expect(result?.stream).toBeInstanceOf(ReadableStream);
        });

        it('Returns null and logs warning if response.ok is false', async () => {
            const warn = vi.spyOn(ctx.logger, 'warn');

            const fetchMock = vi.fn().mockResolvedValue(assetResponse(null, 404));

            ctx = new WorkerdContext(
                {
                    ...baseConfig,
                    env: {
                        ASSETS: {fetch: fetchMock},
                    },
                } as any,
                mockLogger,
                mockRequest,
                mockExecutionCtx,
            );

            const result = await ctx.getStream('/missing.html');
            expect(result).toBeNull();
            expect(warn).toHaveBeenCalledWith('WorkerdContext@getStream: File not found', {
                path: '/missing.html',
            });
        });

        it('Returns null and logs error if ASSETS is not in env', async () => {
            const errorSpy = vi.spyOn(ctx.logger, 'error');

            const ctx2 = new WorkerdContext(
                {
                    ...baseConfig,
                    env: {}, // no ASSETS
                } as any,
                mockLogger,
                mockRequest,
                mockExecutionCtx,
            );

            const result = await ctx2.getStream('/fail.js');

            expect(result).toBeNull();
            expect(errorSpy).toHaveBeenCalledWith(new Error('WorkerdContext@getStream: ASSETS is not configured on env'), {
                path: '/fail.js',
            });
        });

        it('Throws and logs if response body is null', async () => {
            const errorSpy = vi.spyOn(ctx.logger, 'error');

            const fetchMock = vi.fn().mockResolvedValue(assetResponse(null, 200));

            ctx = new WorkerdContext(
                {
                    ...baseConfig,
                    env: {
                        ASSETS: {fetch: fetchMock},
                    },
                } as any,
                mockLogger,
                mockRequest,
                mockExecutionCtx,
            );

            const result = await ctx.getStream('/nobody.mp4');

            expect(result).toBeNull();
            expect(errorSpy).toHaveBeenCalledWith(new Error('WorkerdContext@getStream: Can not create stream from response body'), {
                path: '/nobody.mp4',
            });
        });

        it('Parses content-length to null if missing or invalid', async () => {
            const stream = new ReadableStream();
            const fetchMock = vi.fn().mockResolvedValue(assetResponse(stream, 200, {}));

            ctx = new WorkerdContext(
                {
                    ...baseConfig,
                    env: {
                        ASSETS: {fetch: fetchMock},
                    },
                } as any,
                mockLogger,
                mockRequest,
                mockExecutionCtx,
            );

            const result = await ctx.getStream('/file.jpg');
            expect(result?.size).toBeNull();
            expect(result?.stream).toBeInstanceOf(ReadableStream);
        });

        it('Appends slash to path if missing', async () => {
            const stream = new ReadableStream();
            const fetchMock = vi.fn().mockResolvedValue(assetResponse(stream, 200, {'content-length': '5'}));

            const ctx2 = new WorkerdContext(
                {
                    ...baseConfig,
                    env: {
                        ASSETS: {fetch: fetchMock},
                    },
                } as any,
                mockLogger,
                mockRequest,
                mockExecutionCtx,
            );

            await ctx2.getStream('test.png');

            const requestArg = fetchMock.mock.calls[0][0] as Request;
            expect(requestArg.url).toMatch(/\/test\.png$/);
        });
    });

    describe('stream', () => {
        it('Sets response with stream and status/headers', () => {
            const mockStream = new ReadableStream();
            ctx.setStatus(206);
            ctx.setHeader('X-Test', 'stream');
            ctx['stream'](mockStream, 999);

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(206);
            expect(ctx.response?.headers.get('X-Test')).toBe('stream');
        });

        it('Does nothing if already locked', () => {
            const stream = new ReadableStream();

            ctx['stream'](stream, 123);
            const first = ctx.response;

            ctx['stream'](new ReadableStream(), 999);
            expect(ctx.response).toBe(first);
        });
    });

    describe('abort', () => {
        it('Sets response with custom status and current headers', () => {
            ctx.setHeader('X-Abort', 'true');
            ctx.abort(418);

            const res = ctx.response!;
            expect(res).toBeInstanceOf(Response);
            expect(res.status).toBe(418);
            expect(res.headers.get('X-Abort')).toBe('true');
        });

        it('Defaults to 503 when status is not specified', () => {
            ctx.abort();
            expect(ctx.response?.status).toBe(503);
        });

        it('Writes cookies if present', () => {
            ctx.cookies.set('err', '1', {httponly: true});
            ctx.abort(500);

            const header = ctx.response?.headers.get('Set-Cookie');
            expect(header).toContain('err=1');
        });

        it('Does nothing if already locked', () => {
            ctx.abort(500);
            const res = ctx.response;

            ctx.abort(403);
            expect(ctx.response).toBe(res);
            expect(ctx.response?.status).toBe(500);
        });
    });

    describe('end', () => {
        it('Sets correct response for HEAD method with Content-Length', () => {
            const body = 'Hello world';
            const req = new Request('https://example.com', {method: 'HEAD'});

            ctx = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx);
            ctx.setStatus(204);
            ctx.setHeader('X-Head-Test', 'yes');
            ctx.setBody(body);

            ctx.end();

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(204);
            expect(ctx.response?.headers.get('X-Head-Test')).toBe('yes');
            expect(ctx.response?.headers.get('Content-Length')).toBe(new TextEncoder().encode(body).length.toString());

            return ctx.response?.text().then(text => {
                expect(text).toBe('');
            });
        });

        it('Calls writeCookies for HEAD after setting response', () => {
            const body = 'Hello world';
            const req = new Request('https://example.com', {method: 'HEAD'});

            ctx = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx);
            const spy = vi.spyOn(ctx as any, 'writeCookies');
            ctx.setStatus(204);
            ctx.setHeader('X-Head-Test', 'yes');
            ctx.setBody(body);

            ctx.end();

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(204);
            expect(ctx.response?.headers.get('X-Head-Test')).toBe('yes');
            expect(ctx.response?.headers.get('Content-Length')).toBe(new TextEncoder().encode(body).length.toString());

            expect(spy).toHaveBeenCalled();

            return ctx.response?.text().then(text => {
                expect(text).toBe('');
            });
        });

        it('Sets Content-Length to "0" for HEAD when body is not a string', () => {
            const req = new Request('https://example.com', {method: 'HEAD'});

            ctx = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx);
            ctx.setStatus(200);
            ctx.setHeader('X-Head-Test', 'yes');
            ctx.setBody(null);

            ctx.end();

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(200);
            expect(ctx.response?.headers.get('X-Head-Test')).toBe('yes');
            expect(ctx.response?.headers.get('Content-Length')).toBe('0');
        });

        it('Sets Content-Length to "0" for HEAD when body is not set', () => {
            const req = new Request('https://example.com', {method: 'HEAD'});

            ctx = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx);
            ctx.setStatus(200);
            ctx.setHeader('X-Head-Test', 'yes');
            ctx.end();

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(200);
            expect(ctx.response?.headers.get('X-Head-Test')).toBe('yes');
            expect(ctx.response?.headers.get('Content-Length')).toBe('0');
        });

        it('Sets correct response for POST method with body and headers', async () => {
            const req = new Request('https://example.com', {method: 'POST'});

            ctx = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx);
            ctx.setStatus(200);
            ctx.setHeader('X-Test', 'abc');
            ctx.setBody('response-body');

            ctx.end();

            expect(ctx.response).toBeInstanceOf(Response);
            expect(ctx.response?.status).toBe(200);
            expect(ctx.response?.headers.get('X-Test')).toBe('abc');

            const body = await ctx.response?.text();
            expect(body).toBe('response-body');
        });

        it('Does not overwrite response if already locked', () => {
            vi.spyOn(ctx, 'isLocked', 'get').mockReturnValue(true);

            ctx.setBody('should-not-set');
            ctx.end();

            expect(ctx.response).toBe(null);
        });

        it('Calls writeCookies after setting response', () => {
            const req = new Request('https://example.com', {method: 'POST'});
            ctx = new WorkerdContext(baseConfig as any, mockLogger, req, mockExecutionCtx);
            const spy = vi.spyOn(ctx as any, 'writeCookies');
            ctx.setBody('🍪');

            ctx.end();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('runAfter', () => {
        it('Calls all afterHooks using workerd waitUntil', () => {
            const hook1 = vi.fn().mockResolvedValue('ok1');
            const hook2 = vi.fn().mockResolvedValue('ok2');

            ctx.afterHooks.push(hook1, hook2);
            ctx.runAfter();

            expect(mockExecutionCtx.waitUntil).toHaveBeenCalledTimes(2);
            expect(mockExecutionCtx.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
        });

        it('Catches and ignores hook execution errors', () => {
            const hook1 = vi.fn().mockResolvedValue('ok1');
            const hook2 = vi.fn().mockResolvedValue('ok2');
            const hook3 = vi.fn().mockResolvedValue('ok3');
            const badHook = vi.fn(() => {
                throw new Error('bad hook');
            });

            ctx.afterHooks.push(hook1);
            ctx.afterHooks.push(badHook);
            ctx.afterHooks.push(hook2);
            ctx.afterHooks.push(hook3);

            expect(() => ctx.runAfter()).not.toThrow();
            expect(mockExecutionCtx.waitUntil).toHaveBeenCalledTimes(3);
            expect(hook1).toHaveBeenCalled();
            expect(hook2).toHaveBeenCalled();
            expect(hook3).toHaveBeenCalled();
            expect(badHook).toHaveBeenCalled();
        });
    });

    describe('getIP', () => {
        it('Returns null', () => {
            /* @ts-expect-error Should be good */
            expect(ctx.getIP()).toBeNull();
        });
    });

    describe('writeCookies', () => {
        it('Appends all outgoing cookies to response headers', () => {
            const headers = new Headers();
            const res = new Response(null, {headers});
            (ctx as any).res = res;

            ctx.cookies.set('a', 1, {httponly: true});
            ctx.cookies.set('b', 2, {secure: true});

            ctx['writeCookies']();

            expect(res.headers.getAll?.('Set-Cookie') ?? res.headers.get('Set-Cookie')).toEqual('a=1; Secure; HttpOnly, b=2; Secure');
        });

        it('Does nothing if no cookies are present', () => {
            (ctx as any).res = new Response(null, {headers: new Headers()});
            expect(() => ctx['writeCookies']()).not.toThrow();
        });

        it('Skips appending if cookies.outgoing is empty', () => {
            const headers = new Headers();
            (ctx as any).res = new Response(null, {headers});

            ctx['writeCookies']();
            expect(headers.get('Set-Cookie')).toBeNull();
        });
    });
});
