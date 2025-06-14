/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-useless-constructor */
/* eslint-disable class-methods-use-this */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {HttpMethods} from '../../lib/types/constants';
import {hexId} from '../../lib/utils/Generic';
import {Context, IP_HEADER_CANDIDATES} from '../../lib/Context';
import {type TriFrostRootLogger} from '../../lib/modules/Logger/RootLogger';
import {type TriFrostContextConfig} from '../../lib/types/context';
import CONSTANTS from '../constants';

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
