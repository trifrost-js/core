import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {App} from '../../lib/App';
import {RouteTree} from '../../lib/routing/Tree';
import CONSTANTS from '../constants';
import {isObject} from '@valkyriestudios/utils/object';
import {createCss, createScript, MemoryCache, Sym_TriFrostName} from '../../lib';
import * as scriptModule from '../../lib/modules/JSX/script/mount';
import * as cssModule from '../../lib/modules/JSX/style/mount';
import * as LoggerModule from '../../lib/modules/Logger';
import * as RuntimeModule from '../../lib/runtimes/Runtime';
import {MockContext} from '../MockContext';
import {Sym_TriFrostSpan} from '../../lib/modules/Logger/util';

describe('App', () => {
    let app: App<any, any>;
    let tree: RouteTree<any>;

    beforeEach(() => {
        tree = new RouteTree();
        app = new App({});
        /* @ts-expect-error protected, but we need it */
        app.tree = tree;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('Constructs with minimal config', () => {
            const app = new App();
            expect(app).toBeInstanceOf(App);
            expect(app.isRunning).toBe(false);
        });

        it('Initializes route tree', () => {
            const app = new App();
            expect((app as any).tree).toBeInstanceOf(RouteTree);
        });

        it('Accepts valid timeout', () => {
            const app = new App({timeout: 12345});
            expect((app as any).timeout).toBe(12345);
        });

        it('Defaults to 30_000 timeout if none or invalid', () => {
            for (const el of [...CONSTANTS.NOT_INTEGER, -99, 0, 1.5]) {
                if (el === null) continue;
                const app = new App({timeout: el as any});
                expect(app.timeout).toBe(30_000);
            }
        });

        it('Allows null as timeout', () => {
            const app = new App({timeout: null});
            expect(app.timeout).toBe(null);
        });

        it('Throws on non-object options', () => {
            for (const val of CONSTANTS.NOT_OBJECT) {
                if (val === null || val === undefined) continue;
                expect(() => new App(val)).toThrow(/options should be an object/);
            }
        });

        it('Registers custom runtime if provided', () => {
            const runtime = {boot: vi.fn(), shutdown: vi.fn()};
            const app = new App({runtime: runtime as any});
            expect((app as any).runtime).toBe(runtime);
        });

        it('Applies env if passed', () => {
            const env = {foo: 'bar'};
            const app = new App({env});
            expect((app as any).env).toEqual(env);
        });

        it('Initializes memory cache if not passed', () => {
            const app = new App();
            expect((app as any).cache).toBeInstanceOf(MemoryCache);
        });

        it('Uses provided cache instance', () => {
            const cache = {get: vi.fn(), set: vi.fn()};
            const app = new App({cache: cache as any});
            expect((app as any).cache).toEqual(cache);
        });

        it('Bootstraps default requestId config', () => {
            const app = new App();
            const cfg = (app as any).requestId;
            expect(cfg?.inbound).toEqual(['x-request-id', 'cf-ray']);
            expect(cfg?.outbound).toBe('x-request-id');
            expect(cfg?.validate?.('abcd-1234')).toBe(true);
        });

        it('Uses tracing config if provided', () => {
            const exporter = () => [];
            const tracing = {
                exporters: vi.fn(() => [exporter]),
                requestId: {
                    inbound: ['x-id'],
                    outbound: 'x-id',
                    validate: vi.fn(),
                },
            } as any;

            const app = new App({tracing});
            expect((app as any).exporters).toBe(tracing.exporters);
            expect((app as any).requestId).toBe(tracing.requestId);
        });

        it('Initializes global cookie config with defaults', () => {
            const app = new App();
            const cookieCfg = (app as any).cookies.config;

            expect(cookieCfg).toEqual({
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'Strict',
            });
        });

        it('Allows override of global cookie defaults', () => {
            const app = new App({
                cookies: {
                    secure: false,
                    samesite: 'Lax',
                },
            });

            const cookieCfg = (app as any).cookies.config;
            expect(cookieCfg.secure).toBe(false);
            expect(cookieCfg.samesite).toBe('Lax');
        });

        it('Mounts client script if provided', () => {
            const {script} = createScript({});
            const app = new App({client: {script}});
            expect((app as any).script).toBe(script);
        });

        it('Mounts client CSS if provided', () => {
            const css = createCss({});
            const app = new App({client: {css}});
            expect((app as any).css).toBe(css);
        });

        it('Mounts script route with correct path', () => {
            const spy = vi.spyOn(scriptModule, 'mount');
            const {script} = createScript({});

            new App({client: {script}});
            expect(spy).toHaveBeenCalledWith(expect.anything(), '/__atomics__/client.js', script);
            spy.mockRestore();
        });

        it('Mounts css route with correct path', () => {
            const spy = vi.spyOn(cssModule, 'mount');
            const css = createCss({});
            new App({client: {css}});
            expect(spy).toHaveBeenCalledWith(expect.anything(), '/__atomics__/client.css', css);
            spy.mockRestore();
        });

        it('Sets .script and .css properties when client config provided', () => {
            const {script} = createScript({});
            const css = createCss({});
            const app = new App({client: {script, css}});
            expect((app as any).script).toBe(script);
            expect((app as any).css).toBe(css);
        });
    });

    describe('boot', () => {
        let runtime: any;
        let app: App<any, any>;

        beforeEach(() => {
            runtime = {
                boot: vi.fn(),
                shutdown: vi.fn(),
                defaultExporter: vi.fn(() => ({flush: vi.fn()})),
            };
            app = new App({runtime});
        });

        it('Boots and sets running state', async () => {
            await app.boot();
            expect((app as any).running).toBe(true);
            expect(runtime.boot).toHaveBeenCalled();
        });

        it('Attaches runtime exports', async () => {
            const exp = {fetch: vi.fn()};
            runtime.exports = exp;
            await app.boot();
            expect((app as any).fetch).toBe(exp.fetch);
        });

        it('Uses provided array of exporters if returned from tracing.exporters', async () => {
            const fakeExporter = {flush: vi.fn()};
            const tracing = {
                exporters: vi.fn(() => [fakeExporter]),
            } as any;

            const runtime = {
                boot: vi.fn(),
                shutdown: vi.fn(),
                defaultExporter: vi.fn(() => ({flush: vi.fn()})),
            } as any;

            const spy = vi.spyOn(LoggerModule, 'TriFrostRootLogger');

            const app = new App({runtime, tracing});
            await app.boot();

            const ctorArgs = spy.mock.calls[0][0];
            const result = ctorArgs.exporters({env: {}});
            expect(result).toEqual([fakeExporter]);
            expect(tracing.exporters).toHaveBeenCalledWith({env: {}});
            expect(runtime.defaultExporter).not.toHaveBeenCalled();
        });

        it('Wraps single exporter object in array if not an array', async () => {
            const fakeExporter = {flush: vi.fn()};
            const tracing = {
                exporters: vi.fn(() => fakeExporter),
            } as any;

            const spy = vi.spyOn(LoggerModule, 'TriFrostRootLogger');

            const app = new App({runtime, tracing});
            await app.boot();

            const ctorArgs = spy.mock.calls[0][0];
            const result = ctorArgs.exporters({env: {}});
            expect(result).toEqual([fakeExporter]);
            expect(tracing.exporters).toHaveBeenCalledWith({env: {}});
            expect(runtime.defaultExporter).not.toHaveBeenCalled();
        });

        it('Falls back to default exporter if tracing.exporters returns null or empty array', async () => {
            const tracing = {
                exporters: vi.fn(() => []),
            };

            const spy = vi.spyOn(LoggerModule, 'TriFrostRootLogger');

            const app = new App({runtime, tracing});
            await app.boot();

            const ctorArgs = spy.mock.calls[0][0];
            const result = ctorArgs.exporters({env: {}});
            expect(result).toEqual([runtime.defaultExporter.mock.results[0].value]);
            expect(tracing.exporters).toHaveBeenCalledWith({env: {}});
            expect(runtime.defaultExporter).toHaveBeenCalled();
        });

        it('Executes onIncoming with matched route', async () => {
            const handler = vi.fn();
            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/test',
                    fn: handler,
                    middleware: [],
                    timeout: null,
                },
            }));

            const ctx = new MockContext();
            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);
            expect(handler).toHaveBeenCalledWith(ctx);
        });

        it('Handles notFound handler if no route matches', async () => {
            const notFound = {
                route: {
                    path: '/*',
                    name: 'nf',
                    fn: vi.fn(),
                    middleware: [],
                    timeout: null,
                },
            };
            (app as any).tree.match = vi.fn(() => null);
            (app as any).tree.matchNotFound = vi.fn(() => notFound);

            const ctx = new MockContext();
            ctx.setStatus(404);

            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);
            expect(notFound.route.fn).toHaveBeenCalledWith(ctx);
        });

        it('Invokes error route if statusCode >= 400 after matched route', async () => {
            const matchedHandler = vi.fn(ctx => {
                ctx.setStatus(500); // simulate error during route
            });

            const errorHandler = vi.fn();

            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/fail',
                    fn: matchedHandler,
                    middleware: [],
                    timeout: null,
                },
            }));

            (app as any).tree.matchError = vi.fn(() => ({
                route: {
                    path: '/*',
                    name: 'error',
                    fn: errorHandler,
                    middleware: [],
                    timeout: null,
                },
            }));

            const ctx = new MockContext();
            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(matchedHandler).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith(ctx);
        });

        it('Triages with 500 if route throws unexpectedly', async () => {
            const bad = vi.fn(() => {
                throw new Error('fail');
            });
            (app as any).tree.match = vi.fn(() => ({
                route: {path: '/fail', fn: bad, middleware: []},
            }));

            const ctx = new MockContext();
            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);
            expect(ctx.$status).toBe(500);
        });

        it('Flushes logger and runs after hook', async () => {
            const handler = vi.fn();
            (app as any).tree.match = vi.fn(() => ({
                route: {path: '/test', fn: handler, middleware: []},
            }));

            const ctx = new MockContext();
            const flush = vi.fn();
            ctx.logger.flush = flush;

            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);
            expect(flush).toHaveBeenCalled();
        });

        it('Skips handler if context is locked during middleware', async () => {
            const mw = vi.fn(ctx => {
                ctx.end();
            });
            const handler = vi.fn();

            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/secure',
                    fn: handler,
                    middleware: [{name: 'mw', handler: mw}],
                    timeout: null,
                },
            }));

            const ctx = new MockContext();
            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(mw).toHaveBeenCalled();
            expect(handler).not.toHaveBeenCalled();
        });

        it('Invokes triage if middleware sets status >= 400', async () => {
            const mw = vi.fn(ctx => ctx.setStatus(403));
            const handler = vi.fn();
            const triage = vi.fn();

            const errorRoute = {
                route: {
                    name: 'triage',
                    fn: triage,
                    middleware: [],
                    timeout: null,
                },
            };

            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/admin',
                    fn: handler,
                    middleware: [{name: 'm', handler: mw}],
                    timeout: null,
                },
            }));

            (app as any).tree.matchError = vi.fn(() => errorRoute);

            const ctx = new MockContext();
            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(mw).toHaveBeenCalled();
            expect(triage).toHaveBeenCalled();
            expect(handler).not.toHaveBeenCalled();
        });

        it('Executes span-wrapped middleware and handler correctly', async () => {
            const spanHandler = vi.fn();
            Reflect.set(spanHandler, Sym_TriFrostSpan, true);

            const mw = vi.fn();
            Reflect.set(mw, Sym_TriFrostSpan, true);

            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/span',
                    fn: spanHandler,
                    middleware: [{name: 'mw', handler: mw}],
                    timeout: null,
                },
            }));

            const ctx = new MockContext();
            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(mw).toHaveBeenCalledWith(ctx);
            expect(spanHandler).toHaveBeenCalledWith(ctx);
        });

        it('Responds with 404 if status is set to 404 and no match found', async () => {
            (app as any).tree.match = vi.fn(() => null);
            (app as any).tree.matchNotFound = vi.fn(() => null);

            const ctx = new MockContext();
            ctx.setStatus(404);

            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(ctx.$status).toBe(404);
        });

        it('Skips boot logic if already running', async () => {
            (app as any).running = true;
            await app.boot();
            expect(runtime.boot).not.toHaveBeenCalled();
        });

        it('Handles runtime boot failure gracefully and logs error', async () => {
            const failingRuntime = {
                boot: vi.fn(() => {
                    throw new Error('Boom');
                }),
                shutdown: vi.fn(),
                defaultExporter: vi.fn(() => ({flush: vi.fn()})),
            } as any;

            const app = new App({runtime: failingRuntime});
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await app.boot();

            expect((app as any).running).toBe(false);
            spy.mockRestore();
        });

        it('Attaches meta to logger if present', async () => {
            const handler = vi.fn();
            const meta = {route: 'meta'};

            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/x',
                    fn: handler,
                    middleware: [],
                    timeout: null,
                    meta,
                },
            }));

            const ctx = new MockContext();
            const spy = vi.spyOn(ctx.logger, 'setAttributes');

            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(spy).toHaveBeenCalledWith(meta);
        });

        it('Sets timeout from route config', async () => {
            const handler = vi.fn();
            const timeout = 5000;

            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/t',
                    fn: handler,
                    middleware: [],
                    timeout,
                },
            }));

            const ctx = new MockContext();
            const spy = vi.spyOn(ctx, 'setTimeout');

            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(spy).toHaveBeenCalledWith(timeout);
        });

        it('Falls back to getRuntime() if no runtime is provided', async () => {
            const fakeRuntime = {
                boot: vi.fn(),
                shutdown: vi.fn(),
                defaultExporter: vi.fn(() => ({flush: vi.fn()})),
            };
            const getRuntimeSpy = vi.spyOn(RuntimeModule, 'getRuntime').mockResolvedValue(fakeRuntime as any);

            const app = new App();
            await app.boot();

            expect(getRuntimeSpy).toHaveBeenCalled();
            expect((app as any).runtime).toBe(fakeRuntime);

            getRuntimeSpy.mockRestore();
        });

        it('Executes span-wrapped notFound handler if status is 404', async () => {
            const notFoundHandler = vi.fn();
            Reflect.set(notFoundHandler, Sym_TriFrostSpan, true);

            (app as any).tree.match = vi.fn(() => null);
            (app as any).tree.matchNotFound = vi.fn(() => ({
                route: {
                    path: '/*',
                    fn: notFoundHandler,
                    middleware: [],
                    timeout: null,
                },
            }));

            const ctx = new MockContext();
            ctx.setStatus(404);

            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(notFoundHandler).toHaveBeenCalledWith(ctx);
        });

        it('Executes span-wrapped error handler if status is >= 400', async () => {
            const routeHandler = vi.fn(ctx => {
                ctx.setStatus(500); // trigger error
            });

            const errorHandler = vi.fn();
            Reflect.set(errorHandler, Sym_TriFrostSpan, true);

            (app as any).tree.match = vi.fn(() => ({
                route: {
                    path: '/fail',
                    fn: routeHandler,
                    middleware: [],
                    timeout: null,
                },
            }));
            (app as any).tree.matchError = vi.fn(() => ({
                route: {
                    path: '/*',
                    fn: errorHandler,
                    middleware: [],
                    timeout: null,
                },
            }));

            const ctx = new MockContext();
            await app.boot();
            const onIncoming = runtime.boot.mock.calls[0][0].onIncoming;
            await onIncoming(ctx);

            expect(routeHandler).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith(ctx);
        });

        it('Passes optional config props (port, css, script) to runtime.boot', async () => {
            const css = createCss({});
            const {script} = createScript({});

            const app = new App({
                runtime,
                timeout: 5000,
                client: {css, script},
            });

            await app.boot({port: 1234});

            const passedCfg = runtime.boot.mock.calls[0][0].cfg;

            expect(passedCfg.port).toBe(1234);
            expect(passedCfg.css).toBe(css);
            expect(passedCfg.script).toBe(script);
        });
    });

    describe('shutdown', () => {
        let runtime: any;
        let app: App<any, any>;

        beforeEach(() => {
            runtime = {
                boot: vi.fn(),
                shutdown: vi.fn(),
                defaultExporter: vi.fn(() => ({flush: vi.fn()})),
            };
            app = new App({runtime});
        });

        it('Returns false if server not running', () => {
            (app as any).running = false;

            const result = app.shutdown();
            expect(result).toBe(false);
        });

        it('Shuts down runtime and logs success', () => {
            const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
            (app as any).running = true;
            (app as any).logger = {info: spy};

            const result = app.shutdown();

            expect(runtime.shutdown).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith('Server closed');
            expect(result).toBe(true);
            expect((app as any).running).toBe(false);
        });

        it('Logs failure if shutdown throws', () => {
            runtime.shutdown = vi.fn(() => {
                throw new Error('fail');
            });

            const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
            (app as any).logger = {info: spy};
            (app as any).running = true;

            const result = app.shutdown();

            expect(result).toBe(false);
            expect(spy).toHaveBeenCalledWith('Failed to close server');
        });
    });

    describe('use', () => {
        it('Chains middleware onto the router', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            app.use(m1).use(m2).get('/secure', handler);

            const route = tree.stack.find(r => r.path === '/secure' && r.method === 'GET');
            expect(route?.middleware?.map(m => m.handler)).toEqual([m1, m2]);
        });

        it('Assigns symbolic name to middleware if provided', () => {
            const fn = vi.fn();
            Reflect.set(fn, Sym_TriFrostName, 'custom');
            app.use(fn).get('/x', vi.fn());

            const route = tree.stack.find(r => r.path === '/x');
            expect(route?.middleware?.[0]?.name).toBe('custom');
        });

        it('Falls back to fn.name or "anon" if no symbol/name', () => {
            const anon = () => {};
            app.use(anon).get('/anon', vi.fn());

            const route = tree.stack.find(r => r.path === '/anon');
            expect(route?.middleware?.[0]?.name).toBe('anon');
        });

        it('Throws on invalid middleware', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                /* @ts-expect-error Should be good */
                expect(() => app.use(el)).toThrow(/Handler is expected/);
            }
        });
    });

    describe('limit', () => {
        const dummyMware = vi.fn();
        const mockRateLimit = {
            limit: vi.fn(() => dummyMware),
        };

        beforeEach(() => {
            tree = new RouteTree();
            app = new App({
                rateLimit: mockRateLimit as any,
            });
            /* @ts-expect-error protected, but we need it */
            app.tree = tree;
        });

        it('Attaches rate limit middleware via number', () => {
            const handler = vi.fn();
            app.limit(5).get('/rl', handler);

            const route = tree.stack.find(r => r.path === '/rl' && r.method === 'GET');
            expect(mockRateLimit.limit).toHaveBeenCalledWith(5);
            expect(route?.middleware?.some(m => m.handler === dummyMware)).toBe(true);
        });

        it('Throws if no rateLimit is configured', () => {
            app = new App({});
            /* @ts-expect-error protected, but we need it */
            app.tree = tree;
            expect(() => app.limit(5)).toThrow(/RateLimit is not configured/);
        });

        it('Throws if invalid limit is provided', () => {
            for (const val of [
                ...CONSTANTS.IS_BOOLEAN,
                ...CONSTANTS.IS_STRING,
                ...CONSTANTS.IS_REGEXP,
                ...CONSTANTS.IS_DATE,
                ...CONSTANTS.IS_ARRAY,
                ...CONSTANTS.IS_OBJECT,
                ...CONSTANTS.IS_NULLABLE,
                ...CONSTANTS.NOT_INTEGER,
                -1,
                0,
            ]) {
                if (typeof val === 'function') continue;
                expect(() => app.limit(val as any)).toThrow(/Invalid limit/);
            }
        });
    });

    describe('bodyParser', () => {
        const bp = {limit: 100_000};

        it('Sets bodyParser globally', () => {
            const handler = vi.fn();
            app.bodyParser(bp).post('/upload', handler);

            const route = tree.stack.find(r => r.path === '/upload');
            expect(route?.bodyParser).toBe(bp);
        });

        it('Overrides router-level bodyParser with route-specific config', () => {
            const routeLevel = {limit: 666_666, json: {limit: 999_999}};
            app.bodyParser({limit: 123}).post('/upload', {
                fn: vi.fn(),
                bodyParser: routeLevel,
            });

            const route = tree.stack.find(r => r.path === '/upload');
            expect(route?.bodyParser).toBe(routeLevel);
        });

        it('Propagates bodyParser to group()', () => {
            const cfg = {limit: 500_000};
            app.bodyParser(cfg).group('/v1', r => {
                r.put('/ping', vi.fn());
            });

            const route = tree.stack.find(r => r.path === '/v1/ping');
            expect(route?.bodyParser).toBe(cfg);
        });

        it('Propagates bodyParser to route()', () => {
            const cfg = {limit: 999_999};
            app.bodyParser(cfg).route('/files', r => {
                r.post(vi.fn());
            });

            const route = tree.stack.find(r => r.path === '/files' && r.method === 'POST');
            expect(route?.bodyParser).toBe(cfg);
        });

        it('Throws if invalid config is passed', () => {
            for (const val of CONSTANTS.NOT_OBJECT) {
                if (val === null) continue;
                /* @ts-expect-error Should be good */
                expect(() => app.bodyParser(val)).toThrow(/Invalid bodyparser/);
            }
        });
    });

    describe('group', () => {
        it('Registers subroutes under the group path', () => {
            const handler = vi.fn();
            app.group('/v1', sub => {
                sub.get('/ping', handler);
            });

            const get = tree.stack.find(r => r.path === '/v1/ping' && r.method === 'GET');
            expect(get?.fn).toBe(handler);
        });

        it('Applies parent middleware to grouped routes', () => {
            const m = vi.fn();
            const handler = vi.fn();

            app.use(m).group('/nested', sub => {
                sub.get('/check', handler);
            });

            const route = tree.stack.find(r => r.path === '/nested/check');
            expect(route?.middleware?.[0]?.handler).toBe(m);
        });

        it('Throws on invalid path', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                /* @ts-expect-error Should be good */
                expect(() => app.group(el, () => {})).toThrow();
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                /* @ts-expect-error Should be good */
                expect(() => app.group('/bad', el)).toThrow();
            }
        });

        it('Accepts timeout in config object form', () => {
            const fn = vi.fn(r => r.get('/inside', vi.fn()));

            app.group('/admin', {
                fn,
                timeout: 5000,
            });

            const route = tree.stack.find(r => r.path === '/admin/inside');
            expect(route?.timeout).toBe(5000);
        });
    });

    describe('route', () => {
        it('Registers all route builder methods under given path', () => {
            const getHandler = vi.fn();
            const postHandler = vi.fn();

            app.route('/products', r => {
                r.get(getHandler);
                r.post(postHandler);
            });

            expect(tree.stack.find(r => r.path === '/products' && r.method === 'GET')?.fn).toBe(getHandler);
            expect(tree.stack.find(r => r.path === '/products' && r.method === 'POST')?.fn).toBe(postHandler);
        });

        it('Preserves middleware chaining from router and builder', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            app.use(m1).route('/secure', r => {
                r.use(m2).get(handler);
            });

            const route = tree.stack.find(r => r.path === '/secure' && r.method === 'GET');
            expect(route?.middleware?.map(m => m.handler)).toEqual([m1, m2]);
        });

        it('Throws if handler is not a function', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                /* @ts-expect-error Should be good */
                expect(() => app.route('/bad', el)).toThrow();
            }
        });

        it('Accepts config objects inside route builder', () => {
            const fn = vi.fn();

            app.route('/cfg', r => {
                r.get({
                    fn,
                    name: 'custom',
                    description: 'desc',
                    timeout: 999,
                    meta: {x: true},
                });
            });

            const route = tree.stack.find(r => r.path === '/cfg' && r.method === 'GET');
            expect(route).toMatchObject({
                name: 'custom',
                description: 'desc',
                timeout: 999,
                meta: {x: true},
                fn,
            });
        });
    });

    describe('onNotFound', () => {
        it('Registers a global notfound handler', () => {
            const handler = vi.fn();
            app.onNotFound(handler);

            const route = tree.stack.find(r => r.path === '/*' && r.kind === 'notfound');
            expect(route?.fn).toBe(handler);
        });

        it('Applies router-level middleware to notfound', () => {
            const m = vi.fn();
            const handler = vi.fn();

            app.use(m).onNotFound(handler);

            const route = tree.stack.find(r => r.kind === 'notfound');
            expect(route?.middleware?.[0]?.handler).toBe(m);
        });

        it('Throws on non-function handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                /* @ts-expect-error Should be good */
                expect(() => app.onNotFound(el)).toThrow(/Invalid handler/);
            }
        });
    });

    describe('onError', () => {
        it('Registers a global error handler', () => {
            const handler = vi.fn();
            app.onError(handler);

            const route = tree.stack.find(r => r.path === '/*' && r.kind === 'error');
            expect(route?.fn).toBe(handler);
        });

        it('Applies router-level middleware to error route', () => {
            const m = vi.fn();
            const handler = vi.fn();

            app.use(m).onError(handler);

            const route = tree.stack.find(r => r.kind === 'error');
            expect(route?.middleware?.[0]?.handler).toBe(m);
        });

        it('Throws on non-function handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                /* @ts-expect-error Should be good */
                expect(() => app.onError(el)).toThrow(/Invalid handler/);
            }
        });
    });

    describe('get', () => {
        it('Registers GET + HEAD with handler', () => {
            const handler = vi.fn();
            app.get('/x', handler);

            const get = tree.stack.find(r => r.method === 'GET');
            const head = tree.stack.find(r => r.method === 'HEAD');

            expect(get).toMatchObject({path: '/x', method: 'GET', fn: handler});
            expect(head).toMatchObject({path: '/x', method: 'HEAD', fn: handler});
        });

        it('Preserves middleware', () => {
            const m = vi.fn();
            const handler = vi.fn();
            app.use(m).get('/y', handler);

            const get = tree.stack.find(r => r.method === 'GET');
            expect(get?.middleware[0]?.handler).toBe(m);
        });

        it('Throws on invalid path', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                /* @ts-expect-error Should be good */
                expect(() => app.get(el, vi.fn())).toThrow();
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (isObject(el)) continue;
                /* @ts-expect-error Should be good */
                expect(() => app.get('/bad', el)).toThrow();
            }

            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (typeof el === 'function') continue;
                /* @ts-expect-error Should be good */
                expect(() => app.get('/bad', el)).toThrow();
            }
        });

        it('Accepts config object with metadata', () => {
            const handler = vi.fn();
            app.get('/config', {
                fn: handler,
                name: 'namedGet',
                description: 'desc',
                meta: {tag: 'x'},
                timeout: 999,
            });

            const get = tree.stack.find(r => r.method === 'GET');
            expect(get).toMatchObject({
                path: '/config',
                name: 'namedGet',
                description: 'desc',
                timeout: 999,
                meta: {tag: 'x'},
                fn: handler,
            });
        });
    });

    describe('post', () => {
        it('Registers POST with handler', () => {
            const handler = vi.fn();
            app.post('/x', handler);
            expect(tree.stack.find(r => r.method === 'POST')).toMatchObject({path: '/x', fn: handler});

            /* Should not register a head method */
            const head = tree.stack.find(r => r.method === 'HEAD');
            expect(head).toBe(undefined);
        });

        it('Preserves middleware', () => {
            const m = vi.fn();
            const handler = vi.fn();
            app.use(m).post('/x', handler);
            expect(tree.stack.find(r => r.method === 'POST')?.middleware[0].handler).toBe(m);
        });

        it('Throws on invalid path', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                /* @ts-expect-error Should be good */
                expect(() => app.post(el, vi.fn())).toThrow();
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (isObject(el)) continue;
                /* @ts-expect-error Should be good */
                expect(() => app.post('/bad', el)).toThrow();
            }

            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (typeof el === 'function') continue;
                /* @ts-expect-error Should be good */
                expect(() => app.post('/bad', el)).toThrow();
            }
        });

        it('Accepts config object with metadata', () => {
            const fn = vi.fn();
            app.post('/config', {
                fn,
                name: 'namedPost',
                description: 'desc',
                timeout: 111,
                meta: {x: true},
            });

            expect(tree.stack.find(r => r.method === 'POST')).toMatchObject({
                name: 'namedPost',
                description: 'desc',
                meta: {x: true},
                fn,
            });
        });
    });

    describe('put', () => {
        it('Registers PUT with handler', () => {
            const handler = vi.fn();
            app.put('/x', handler);
            expect(tree.stack.find(r => r.method === 'PUT')).toMatchObject({path: '/x', fn: handler});

            /* Should not register a head method */
            const head = tree.stack.find(r => r.method === 'HEAD');
            expect(head).toBe(undefined);
        });

        it('Preserves middleware', () => {
            const m = vi.fn();
            const handler = vi.fn();
            app.use(m).put('/x', handler);
            expect(tree.stack.find(r => r.method === 'PUT')?.middleware[0].handler).toBe(m);
        });

        it('Throws on invalid path', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                /* @ts-expect-error Should be good */
                expect(() => app.put(el, vi.fn())).toThrow();
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (isObject(el)) continue;
                /* @ts-expect-error Should be good */
                expect(() => app.put('/bad', el)).toThrow();
            }

            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (typeof el === 'function') continue;
                /* @ts-expect-error Should be good */
                expect(() => app.put('/bad', el)).toThrow();
            }
        });

        it('Accepts config object with metadata', () => {
            const fn = vi.fn();
            app.put('/config', {
                fn,
                name: 'namedPut',
                description: 'desc',
                timeout: 111,
                meta: {x: true},
            });

            expect(tree.stack.find(r => r.method === 'PUT')).toMatchObject({
                name: 'namedPut',
                description: 'desc',
                meta: {x: true},
                fn,
            });
        });
    });

    describe('patch', () => {
        it('Registers PATCH with handler', () => {
            const handler = vi.fn();
            app.patch('/x', handler);
            expect(tree.stack.find(r => r.method === 'PATCH')).toMatchObject({path: '/x', fn: handler});

            /* Should not register a head method */
            const head = tree.stack.find(r => r.method === 'HEAD');
            expect(head).toBe(undefined);
        });

        it('Preserves middleware', () => {
            const m = vi.fn();
            const handler = vi.fn();
            app.use(m).patch('/x', handler);
            expect(tree.stack.find(r => r.method === 'PATCH')?.middleware[0].handler).toBe(m);
        });

        it('Throws on invalid path', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                /* @ts-expect-error Should be good */
                expect(() => app.patch(el, vi.fn())).toThrow();
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (isObject(el)) continue;
                /* @ts-expect-error Should be good */
                expect(() => app.patch('/bad', el)).toThrow();
            }

            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (typeof el === 'function') continue;
                /* @ts-expect-error Should be good */
                expect(() => app.patch('/bad', el)).toThrow();
            }
        });

        it('Accepts config object with metadata', () => {
            const fn = vi.fn();
            app.patch('/config', {
                fn,
                name: 'namedPatch',
                description: 'desc',
                timeout: 111,
                meta: {x: true},
            });

            expect(tree.stack.find(r => r.method === 'PATCH')).toMatchObject({
                name: 'namedPatch',
                description: 'desc',
                meta: {x: true},
                fn,
            });
        });
    });

    describe('del', () => {
        it('Registers DELETE with handler', () => {
            const handler = vi.fn();
            app.del('/x', handler);
            expect(tree.stack.find(r => r.method === 'DELETE')).toMatchObject({path: '/x', fn: handler});

            /* Should not register a head method */
            const head = tree.stack.find(r => r.method === 'HEAD');
            expect(head).toBe(undefined);
        });

        it('Preserves middleware', () => {
            const m = vi.fn();
            const handler = vi.fn();
            app.use(m).del('/x', handler);
            expect(tree.stack.find(r => r.method === 'DELETE')?.middleware[0].handler).toBe(m);
        });

        it('Throws on invalid path', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                /* @ts-expect-error Should be good */
                expect(() => app.del(el, vi.fn())).toThrow();
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (isObject(el)) continue;
                /* @ts-expect-error Should be good */
                expect(() => app.del('/bad', el)).toThrow();
            }

            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (typeof el === 'function') continue;
                /* @ts-expect-error Should be good */
                expect(() => app.del('/bad', el)).toThrow();
            }
        });

        it('Accepts config object with metadata', () => {
            const fn = vi.fn();
            app.del('/config', {
                fn,
                name: 'namedDel',
                description: 'desc',
                timeout: 111,
                meta: {x: true},
            });

            expect(tree.stack.find(r => r.method === 'DELETE')).toMatchObject({
                name: 'namedDel',
                description: 'desc',
                meta: {x: true},
                fn,
            });
        });
    });

    describe('health', () => {
        it('Registers a GET + HEAD route with correct kind and metadata', () => {
            const handler = vi.fn();

            app.health('/ping', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(3);

            expect(stack.find(el => el.method === 'GET')).toEqual({
                bodyParser: null,
                description: 'Healthcheck Route',
                fn: handler,
                kind: 'health',
                meta: null,
                method: 'GET',
                middleware: [],
                name: 'healthcheck',
                path: '/ping',
                timeout: 30000,
            });

            expect(stack.find(el => el.method === 'HEAD')).toEqual({
                bodyParser: null,
                description: 'Healthcheck Route',
                fn: handler,
                kind: 'health',
                meta: null,
                method: 'HEAD',
                middleware: [],
                name: 'HEAD_healthcheck',
                path: '/ping',
                timeout: 30000,
            });

            expect(stack.find(el => el.method === 'OPTIONS')).toMatchObject({
                bodyParser: null,
                description: 'Auto-generated OPTIONS handler',
                kind: 'options',
                meta: null,
                method: 'OPTIONS',
                middleware: [],
                name: 'OPTIONS_/ping',
                path: '/ping',
                timeout: null,
            });
        });

        it('Preserves middleware chain when used after use()', () => {
            const m1 = vi.fn();
            const handler = vi.fn();

            app.use(m1).health('/check', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(3);

            expect(stack.find(el => el.method === 'GET')).toEqual({
                bodyParser: null,
                description: 'Healthcheck Route',
                fn: handler,
                kind: 'health',
                meta: null,
                method: 'GET',
                middleware: [
                    {
                        description: null,
                        fingerprint: null,
                        handler: m1,
                        name: 'spy',
                    },
                ],
                name: 'healthcheck',
                path: '/check',
                timeout: 30000,
            });

            expect(stack.find(el => el.method === 'HEAD')).toEqual({
                bodyParser: null,
                description: 'Healthcheck Route',
                fn: handler,
                kind: 'health',
                meta: null,
                method: 'HEAD',
                middleware: [
                    {
                        description: null,
                        fingerprint: null,
                        handler: m1,
                        name: 'spy',
                    },
                ],
                name: 'HEAD_healthcheck',
                path: '/check',
                timeout: 30000,
            });

            expect(stack.find(el => el.method === 'OPTIONS')).toMatchObject({
                bodyParser: null,
                description: 'Auto-generated OPTIONS handler',
                kind: 'options',
                meta: null,
                method: 'OPTIONS',
                middleware: [],
                name: 'OPTIONS_/check',
                path: '/check',
                timeout: null,
            });
        });

        it('Throws if path is not a string', () => {
            const handler = vi.fn();

            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                /* @ts-expect-error Should be good */
                expect(() => app.health(el, handler)).toThrow();
            }

            /* @ts-expect-error Should be good */
            expect(app.tree.stack.length).toBe(0);
        });

        it('Throws if handler is not a function', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                /* @ts-expect-error Should be good */
                expect(() => app.health('/bad', el)).toThrow(/TriFrostRouter@get: Invalid handler/);
            }

            /* @ts-expect-error Should be good */
            expect(app.tree.stack.length).toBe(0);
        });
    });
});
