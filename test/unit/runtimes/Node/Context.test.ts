import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {NodeContext} from '../../../../lib/runtimes/Node/Context';

describe('Runtimes - Node - Context', () => {
    let ctx: NodeContext;
    let mockLogger: any;
    let mockReq: any;
    let mockRes: any;
    let mockNodeApis: any;

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

        mockReq = {
            method: 'POST',
            url: '/test/path?foo=bar',
            headers: {'content-type': 'application/json'},
            on: vi.fn(),
        };

        mockRes = {
            writeHead: vi.fn().mockReturnThis(),
            end: vi.fn(),
            destroy: vi.fn(),
            setHeader: vi.fn(),
        };

        mockNodeApis = {
            Readable: class {
                pipe = vi.fn();
                destroy = vi.fn();
                static from() {
                    return {pipe: vi.fn()};
                }
            },
            statSync: vi.fn(),
            createReadStream: vi.fn(),
            pipeline: vi.fn().mockResolvedValue(undefined),
        };

        ctx = new NodeContext(baseConfig as any, mockLogger, mockNodeApis, mockReq, mockRes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('Parses method, path, headers and query correctly', () => {
            expect(ctx.method).toBe('POST');
            expect(ctx.path).toBe('/test/path');
            expect(ctx.query.get('foo')).toBe('bar');
            expect(ctx.headers).toEqual({'content-type': 'application/json'});
        });
    });

    describe('init', () => {
        it('Parses body using Uint8Array loader', async () => {
            const mockBody = Buffer.from(JSON.stringify({msg: 'ok'}));
            mockReq.on = vi.fn().mockImplementation((event, cb) => {
                if (event === 'data') cb(mockBody);
                if (event === 'end') cb();
            });

            const spy = vi.spyOn(await import('../../../../lib/utils/BodyParser/Uint8Array'), 'parseBody').mockResolvedValue({msg: 'ok'});

            await ctx.init({
                route: {name: 'node-init', kind: 'std', bodyParser: null},
                params: {},
            } as any);

            expect(ctx.name).toBe('node-init');
            expect(ctx.body).toEqual({msg: 'ok'});
            spy.mockRestore();
        });

        it('Sets 400 and logs if parseBody throws', async () => {
            const err = new Error('fail');
            const spy = vi.spyOn(await import('../../../../lib/utils/BodyParser/Uint8Array'), 'parseBody').mockRejectedValue(err);

            mockReq.on = vi.fn().mockImplementation((event, cb) => {
                if (event === 'data') cb(Buffer.from(''));
                if (event === 'end') cb();
            });

            await ctx.init({
                route: {name: 'fail', kind: 'std', bodyParser: null},
                params: {},
            } as any);

            expect(ctx.statusCode).toBe(400);
            expect(ctx.logger.error).toHaveBeenCalledWith(err);
            spy.mockRestore();
        });
    });

    describe('getStream', () => {
        it('Returns stream and size if file exists', async () => {
            mockNodeApis.statSync.mockReturnValue({size: 123});
            mockNodeApis.createReadStream.mockReturnValue('stream');
            const result = await ctx.getStream('/file.txt');
            expect(result).toEqual({stream: 'stream', size: 123});
        });

        it('Returns null if file stat is invalid', async () => {
            mockNodeApis.statSync.mockReturnValue({size: 0});
            const result = await ctx.getStream('/bad.txt');
            expect(result).toBeNull();
        });

        it('Logs and returns null if statSync throws', async () => {
            const spy = vi.spyOn(ctx.logger, 'error');
            mockNodeApis.statSync.mockImplementation(() => {
                throw new Error('bad');
            });
            const result = await ctx.getStream('/err');
            expect(result).toBeNull();
            expect(spy).toHaveBeenCalledWith('NodeContext@getStream: Failed to create stream', {msg: 'bad', path: '/err'});
        });
    });

    describe('stream', () => {
        it('Pipes readable stream', async () => {
            const stream = new mockNodeApis.Readable();
            ctx.setStatus(200);
            ctx.setHeader('x-pipe', 'true');
            ctx['stream'](stream, 123);

            expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({'x-pipe': 'true'}));
            expect(mockNodeApis.pipeline).toHaveBeenCalledWith(stream, mockRes);
        });

        it('Skips stream if already locked', () => {
            vi.spyOn(ctx, 'isLocked', 'get').mockReturnValue(true);
            ctx['stream']('anything', 100);
            expect(mockRes.writeHead).not.toHaveBeenCalled();
            expect(mockNodeApis.pipeline).not.toHaveBeenCalled();
        });

        it('Destroys stream on HEAD', () => {
            mockReq.method = 'HEAD';
            ctx = new NodeContext(baseConfig as any, mockLogger, mockNodeApis, mockReq, mockRes);

            const destroy = vi.fn();
            const stream = {pipe: () => {}, destroy} as any;
            ctx['stream'](stream, 0);

            expect(mockRes.end).toHaveBeenCalled();
            expect(destroy).toHaveBeenCalled();
        });

        it('Wraps ReadableStream if needed', () => {
            global.ReadableStream = class {
                getReader() {
                    return {
                        read: vi.fn().mockResolvedValue({done: true}),
                    };
                }
            } as any;

            const stream = new global.ReadableStream();
            ctx['stream'](stream, 123);
            expect(mockRes.writeHead).toHaveBeenCalled();
        });

        it('Wraps ReadableStream using custom async reader', async () => {
            const push = vi.fn();
            const mockReadable = {
                push,
            };

            const streamData = ['hello'];
            let callCount = 0;

            const reader = {
                read: vi.fn().mockImplementation(() => {
                    if (callCount++ === 0) return Promise.resolve({value: streamData[0], done: false});
                    return Promise.resolve({done: true});
                }),
            };

            global.ReadableStream = class {
                getReader() {
                    return reader;
                }
            } as any;

            const CustomReadable = class {
                constructor(public config: any) {
                    setTimeout(async () => {
                        await config.read.call(mockReadable);
                        await config.read.call(mockReadable);
                    }, 0);
                }

                static from() {
                    return {pipe: vi.fn()};
                }

                pipe = vi.fn();
            };

            mockNodeApis.Readable = CustomReadable;

            ctx['stream'](new global.ReadableStream(), 123);

            await new Promise(res => setTimeout(res, 5));

            expect(push).toHaveBeenCalledWith('hello');
            expect(push).toHaveBeenCalledWith(null);
        });

        it('Converts string stream via Readable.from', () => {
            const stream = 'hello';
            const fromSpy = vi.spyOn(mockNodeApis.Readable, 'from');
            ctx['stream'](stream, 5);
            expect(fromSpy).toHaveBeenCalledWith('hello');
        });

        it('Converts Uint8Array stream via Readable.from', () => {
            const data = new Uint8Array([1, 2, 3]);
            const fromSpy = vi.spyOn(mockNodeApis.Readable, 'from');
            ctx['stream'](data, 3);
            expect(fromSpy).toHaveBeenCalledWith(data);
        });

        it('Converts ArrayBuffer stream via Readable.from', () => {
            const data = new Uint8Array([1, 2, 3]).buffer;
            const fromSpy = vi.spyOn(mockNodeApis.Readable, 'from');
            ctx['stream'](data, 3);
            expect(fromSpy).toHaveBeenCalledWith(data);
        });

        it('Converts Blob stream via Readable.from', () => {
            const blob = new Blob(['blobdata']);
            const fromSpy = vi.spyOn(mockNodeApis.Readable, 'from');
            ctx['stream'](blob, 8);
            expect(fromSpy).toHaveBeenCalledWith(blob);
        });

        it('Throws on invalid stream', () => {
            expect(() => ctx['stream']({} as any)).toThrow('Unsupported stream type');
        });

        it('Logs known pipeline errors', async () => {
            const debugSpy = vi.spyOn(ctx.logger, 'debug');
            const err = new Error('reset') as any;
            err.code = 'ECONNRESET';
            mockNodeApis.pipeline.mockRejectedValue(err);
            ctx['stream'](new mockNodeApis.Readable(), 10);

            await new Promise(res => setTimeout(res, 0));
            expect(debugSpy).toHaveBeenCalled();
        });

        it('Logs debug and skips error/destroy for known client stream error PREMATURE_CLOSE', async () => {
            const debugSpy = vi.spyOn(ctx.logger, 'debug');
            const errorSpy = vi.spyOn(ctx.logger, 'error');
            const destroySpy = vi.spyOn(mockRes, 'destroy');

            mockNodeApis.pipeline.mockRejectedValueOnce(
                Object.assign(new Error('ERR_STREAM_PREMATURE_CLOSE'), {code: 'ERR_STREAM_PREMATURE_CLOSE'}),
            );

            ctx['stream'](new mockNodeApis.Readable(), 123);
            await new Promise(res => setTimeout(res, 0));

            expect(debugSpy).toHaveBeenCalledWith('NodeContext@stream: Stream aborted', {msg: 'ERR_STREAM_PREMATURE_CLOSE'});
            expect(errorSpy).not.toHaveBeenCalled();
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it('Logs debug and skips error/destroy for known client stream error STREAM_DESTROYED', async () => {
            const debugSpy = vi.spyOn(ctx.logger, 'debug');
            const errorSpy = vi.spyOn(ctx.logger, 'error');
            const destroySpy = vi.spyOn(mockRes, 'destroy');

            mockNodeApis.pipeline.mockRejectedValueOnce(Object.assign(new Error('ERR_STREAM_DESTROYED'), {code: 'ERR_STREAM_DESTROYED'}));

            ctx['stream'](new mockNodeApis.Readable(), 123);
            await new Promise(res => setTimeout(res, 0));

            expect(debugSpy).toHaveBeenCalledWith('NodeContext@stream: Stream aborted', {msg: 'ERR_STREAM_DESTROYED'});
            expect(errorSpy).not.toHaveBeenCalled();
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it('Logs unknown pipeline errors', async () => {
            const errorSpy = vi.spyOn(ctx.logger, 'error');
            const err = new Error('fail') as any;
            err.code = 'OTHER';
            mockNodeApis.pipeline.mockRejectedValue(err);
            ctx['stream'](new mockNodeApis.Readable(), 10);
            await new Promise(res => setTimeout(res, 0));
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('abort', () => {
        it('Sets status and writes headers', () => {
            ctx.setHeader('X-Abort', 'true');
            ctx.abort(400);
            expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.objectContaining({'x-abort': 'true'}));
            expect(mockRes.end).toHaveBeenCalled();
        });

        it('Writes cookies if present', () => {
            ctx.cookies.set('foo', '1');
            ctx.abort(503);
            expect(mockRes.setHeader).toHaveBeenCalledWith('set-cookie', expect.arrayContaining(['foo=1; Secure']));
        });

        it('Skips abort logic if already locked', () => {
            vi.spyOn(ctx, 'isLocked', 'get').mockReturnValue(true);

            ctx.abort(503);

            expect(mockRes.writeHead).not.toHaveBeenCalled();
            expect(mockRes.end).not.toHaveBeenCalled();
            expect(mockRes.setHeader).not.toHaveBeenCalled();
        });
    });

    describe('end', () => {
        it('Sets content-length for HEAD request', () => {
            mockReq.method = 'HEAD';
            const body = 'hi';
            ctx = new NodeContext(baseConfig as any, mockLogger, mockNodeApis, mockReq, mockRes);
            ctx.setBody(body);
            ctx.end();
            expect(mockRes.writeHead).toHaveBeenCalledWith(
                expect.any(Number),
                expect.objectContaining({
                    'content-length': new TextEncoder().encode(body).length.toString(),
                }),
            );
        });

        it('Writes body for POST', () => {
            ctx.setBody('hello');
            ctx.setStatus(201);
            ctx.end();
            expect(mockRes.writeHead).toHaveBeenCalledWith(201, expect.anything());
            expect(mockRes.end).toHaveBeenCalledWith('hello');
        });

        it('Sets content-length to "0" on HEAD if body is null', () => {
            mockReq.method = 'HEAD';
            ctx = new NodeContext(baseConfig as any, mockLogger, mockNodeApis, mockReq, mockRes);

            ctx.setBody(null);
            ctx.end();

            expect(mockRes.writeHead).toHaveBeenCalledWith(
                expect.any(Number),
                expect.objectContaining({
                    'content-length': '0',
                }),
            );
        });

        it('Skips if locked', () => {
            vi.spyOn(ctx, 'isLocked', 'get').mockReturnValue(true);
            ctx.end();
            expect(mockRes.writeHead).not.toHaveBeenCalled();
        });
    });

    describe('runAfter', () => {
        it('Executes afterHooks', async () => {
            const fn = vi.fn();
            ctx.afterHooks.push(fn);
            ctx.runAfter();
            await new Promise(res => setTimeout(res, 0));
            expect(fn).toHaveBeenCalled();
        });

        it('Skips if no hooks', () => {
            expect(() => ctx.runAfter()).not.toThrow();
        });

        it('Catches errors', async () => {
            const fn = vi.fn(() => {
                throw new Error('fail');
            });
            ctx.afterHooks.push(fn);
            ctx.runAfter();
            await new Promise(res => setTimeout(res, 0));
            expect(fn).toHaveBeenCalled();
        });
    });

    describe('getIP', () => {
        it('Returns IP from connection.socket.remoteAddress', () => {
            mockReq.connection = {socket: {remoteAddress: '1.2.3.4'}};
            const result = ctx['getIP']();
            expect(result).toBe('1.2.3.4');
        });

        it('Returns IP from socket.remoteAddress if connection missing', () => {
            mockReq.connection = undefined;
            mockReq.socket = {remoteAddress: '5.6.7.8'};
            const result = ctx['getIP']();
            expect(result).toBe('5.6.7.8');
        });

        it('Returns null if no IP found', () => {
            mockReq.connection = undefined;
            mockReq.socket = undefined;
            const result = ctx['getIP']();
            expect(result).toBeNull();
        });
    });

    describe('writeCookies', () => {
        it('Sets Set-Cookie header for cookies', () => {
            ctx.cookies.set('foo', 'bar');
            ctx['writeCookies']();
            expect(mockRes.setHeader).toHaveBeenCalledWith('set-cookie', expect.arrayContaining(['foo=bar; Secure']));
        });

        it('Skips writing cookies if outgoing array is empty', () => {
            ctx.cookies.set('foo', 'bar');
            ctx.cookies.del('foo');
            ctx['writeCookies']();
            expect(mockRes.setHeader).not.toHaveBeenCalled();
        });

        it('Skips if none present', () => {
            ctx['writeCookies']();
            expect(mockRes.setHeader).not.toHaveBeenCalled();
        });
    });
});
