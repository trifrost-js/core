/* eslint-disable max-lines */
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {Router} from '../../../lib/routing/Router';
import {RouteTree} from '../../../lib/routing/Tree';
import {TriFrostRateLimit} from '../../../lib/modules/RateLimit/_RateLimit';
import {TriFrostMiddleware} from '../../../lib/types/routing';
import CONSTANTS from '../../constants';
import {normalizeMiddleware} from '../../../lib/routing/util';
import {Sym_TriFrostName} from '../../../lib';

describe('routing - Router', () => {
    const EXAMPLE_CONFIG = {
        path: '/',
        timeout: null,
        tree: new RouteTree(),
        middleware: [],
        rateLimit: null,
        bodyParser: null,
    };

    describe('constructor', () => {
        it('Throws on invalid path', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                if (el === undefined) continue;
                expect(() => new Router({
                    ...EXAMPLE_CONFIG,
                    path: el as string,
                })).toThrowError(/TriFrostRouter@ctor: Path is invalid/);
            }
        });

        it('Throws on invalid timeout', () => {
            for (const el of [...CONSTANTS.NOT_INTEGER, 0, -10, -999, 1.5]) {
                if (el === undefined || el === null) continue;
                expect(() => new Router({
                    ...EXAMPLE_CONFIG,
                    timeout: el as number,
                })).toThrowError(/TriFrostRouter@ctor: Timeout is invalid/);
            }
        });

        it('Throws on invalid ratelimit', () => {
            for (const el of [
                ...CONSTANTS.NOT_OBJECT,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({limit: val})),
            ]) {
                if (el === undefined || el === null) continue;
                expect(() => new Router({
                    ...EXAMPLE_CONFIG,
                    rateLimit: el as TriFrostRateLimit,
                })).toThrowError(/TriFrostRouter@ctor: RateLimit is invalid/);
            }
        });

        it('Throws on invalid tree', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                expect(() => new Router({
                    ...EXAMPLE_CONFIG,
                    tree: el as RouteTree,
                })).toThrowError(/TriFrostRouter@ctor: Tree is invalid/);
            }
        });

        it('Throws on invalid bodyparser', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === null) continue;
                expect(() => new Router({
                    ...EXAMPLE_CONFIG,
                    bodyParser: el as any,
                })).toThrowError(/TriFrostRouter@ctor: BodyParser is invalid/);
            }
        });

        it('Throws on invalid middleware array', () => {
            for (const el of CONSTANTS.NOT_ARRAY) {
                if (el === undefined) continue;
                expect(() => new Router({
                    ...EXAMPLE_CONFIG,
                    middleware: el as TriFrostMiddleware[],
                })).toThrowError(/TriFrostRouter@ctor: Middleware is invalid/);
            }
        });

        it('Creates properly with minimal config', () => {
            const r = new Router(EXAMPLE_CONFIG);
            expect(r.path).toBe('/');
            expect(r.timeout).toBe(null);
        });

        it('Creates properly with config containing timeout', () => {
            const r = new Router({...EXAMPLE_CONFIG, timeout: 60});
            expect(r.path).toBe('/');
            expect(r.timeout).toBe(60);
        });
    });

    describe('GET path', () => {
        it('Returns the configured path', () => {
            const r = new Router(EXAMPLE_CONFIG);
            expect(r.path).toBe(EXAMPLE_CONFIG.path);

            const r2 = new Router({...EXAMPLE_CONFIG, path: '/helloWorld'});
            expect(r2.path).toBe('/helloWorld');
        });

        it('Is a getter', () => {
            const r2 = new Router({...EXAMPLE_CONFIG, path: '/helloWorld'});
            expect(r2.path).toBe('/helloWorld');
            expect(() => {
                /* @ts-ignore This is what we're testing */
                r2.path = '/hacked';
            }).toThrow();
            expect(r2.path).toBe('/helloWorld');
        });
    });

    describe('GET timeout', () => {
        it('Returns the configured timeout', () => {
            const r = new Router(EXAMPLE_CONFIG);
            expect(r.timeout).toBe(EXAMPLE_CONFIG.timeout);

            const r2 = new Router({...EXAMPLE_CONFIG, timeout: 9999});
            expect(r2.timeout).toBe(9999);
        });

        it('Is a getter', () => {
            const r2 = new Router({...EXAMPLE_CONFIG, timeout: 9999});
            expect(r2.timeout).toBe(9999);
            expect(() => {
                /* @ts-ignore This is what we're testing */
                r2.timeout = -1000;
            }).toThrow();
            expect(r2.timeout).toBe(9999);
        });
    });

    describe('limit', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;
        const dummyMiddleware = vi.fn();

        beforeEach(() => {
            tree = new RouteTree();
        });

        it('Throws if no rateLimit instance is configured', () => {
            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            expect(() => {
                router.limit(10);
            }).toThrow(/TriFrostRouter@limit: RateLimit is not configured/);
        });

        it('Throws if invalid limit value is provided', () => {
            const rateLimitMock = {limit: vi.fn(() => dummyMiddleware)};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit<any>,
                bodyParser: null,
            });

            for (const el of [
                ...CONSTANTS.NOT_FUNCTION,
                ...CONSTANTS.NOT_INTEGER,
                0,
                -5,
                1.2,
            ]) {
                if (typeof el === 'function' || (Number.isInteger(el) && (el as number) > 0)) continue;
                expect(() => router.limit(el as any)).toThrow(/TriFrostRouter@limit: Invalid limit/);
            }
        });

        it('Adds rateLimit middleware to router stack', () => {
            const rateLimitMock = {limit: vi.fn(() => dummyMiddleware)};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit<any>,
                bodyParser: null,
            });

            router.limit(5).get('/protected', vi.fn());

            const route = tree.stack.find(r => r.path === '/api/protected' && r.method === 'GET');
            expect(route?.middleware).toEqual([
                {
                    name: 'spy',
                    description: null,
                    fingerprint: null,
                    handler: dummyMiddleware,
                },
            ]);
            expect(rateLimitMock.limit).toHaveBeenCalledWith(5);
        });

        it('Chains correctly with use() and verbs', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();
            const rateLimitMock = {limit: vi.fn(() => dummyMiddleware)};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit<any>,
                bodyParser: null,
            });

            router.use(m1).limit(10).use(m2).post('/chained', handler);

            const route = tree.stack.find(r => r.path === '/api/chained' && r.method === 'POST');
            expect(route?.middleware).toEqual([
                {
                    name: 'spy',
                    description: null,
                    fingerprint: null,
                    handler: m1,
                }, {
                    name: 'spy',
                    description: null,
                    fingerprint: null,
                    handler: dummyMiddleware,
                }, {
                    name: 'spy',
                    description: null,
                    fingerprint: null,
                    handler: m2,
                },
            ]);
            expect(rateLimitMock.limit).toHaveBeenCalledWith(10);
        });

        it('Attaches middleware on multiple verbs under same router', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const rateLimitMock = {limit: vi.fn(() => dummyMiddleware)};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit<any>,
                bodyParser: null,
            });

            router.limit(5).get('/multi', handler1).post('/multi', handler2);

            const getRoute = tree.stack.find(r => r.path === '/api/multi' && r.method === 'GET');
            const postRoute = tree.stack.find(r => r.path === '/api/multi' && r.method === 'POST');

            expect(getRoute?.middleware).toEqual([{
                name: 'spy',
                description: null,
                fingerprint: null,
                handler: dummyMiddleware,
            }]);
            expect(postRoute?.middleware).toEqual([{
                name: 'spy',
                description: null,
                fingerprint: null,
                handler: dummyMiddleware,
            }]);
        });
    });

    describe('bodyParser', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
        });

        it('Throws if not passed a valid body parser in ctor', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === null) continue;
                expect(() => router = new Router({
                    path: '/api',
                    timeout: null,
                    tree,
                    middleware: [],
                    rateLimit: null,
                    bodyParser: el as any,
                })).toThrowError(/TriFrostRouter@ctor: BodyParser is invalid/);
            }
        });

        it('Throws if not passed a valid body parser', () => {
            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === null) continue;
                expect(() => router.bodyParser(el as any)).toThrowError(/TriFrostRouter@bodyParser: Invalid bodyparser/);
            }
        });

        it('Registers bodyParser from constructor', () => {
            const bodyParserConfig = {limit: 100_000};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: bodyParserConfig,
            });

            router.get('/test', vi.fn());

            const route = tree.stack.find(r => r.path === '/api/test' && r.method === 'GET');
            expect(route?.bodyParser).toBe(bodyParserConfig);
        });

        it('Updates bodyParser via .bodyParser()', () => {
            const updated = {limit: 100_000};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            router.bodyParser(updated).post('/upload', vi.fn());

            const route = tree.stack.find(r => r.path === '/api/upload' && r.method === 'POST');
            expect(route?.bodyParser).toBe(updated);
        });

        it('Overrides router bodyParser with route-scoped config', () => {
            const routerLevel = {limit: 666_666};
            const routeLevel = {limit: 666_666, json: {limit: 999_999}};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: routerLevel,
            });

            router.route('/override', r => {
                r.get({
                    fn: vi.fn(),
                    bodyParser: routeLevel,
                });
            });

            const route = tree.stack.find(r => r.path === '/api/override' && r.method === 'GET');
            expect(route?.bodyParser).toBe(routeLevel);
        });

        it('Propagates bodyParser to group() subrouters', () => {
            const config = {limit: 999_999};

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            router.bodyParser(config).group('/v1', sub => {
                sub.put('/ping', vi.fn());
            });

            const route = tree.stack.find(r => r.path === '/api/v1/ping' && r.method === 'PUT');
            expect(route?.bodyParser).toBe(config);
        });

        it('Propagates bodyParser to .route() usage', () => {
            const config = {limit: 999_999};
            const handler = vi.fn();

            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            router.bodyParser(config).route('/items', r => {
                r.post(handler);
            });

            const route = tree.stack.find(r => r.path === '/api/items' && r.method === 'POST');
            expect(route?.bodyParser).toBe(config);
        });
    });

    describe('group', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers subroutes under the group path', () => {
            const userHandler = vi.fn();
            const postHandler = vi.fn();

            router.group('/v1', sub => {
                sub.get('/users', userHandler);
                sub.post('/posts', postHandler);
            });

            const stack = tree.stack;
            expect(stack.length).toBe(5); // GET, HEAD, POST + OPTIONS + HEAD

            const userGet = stack.find(r => r.path === '/api/v1/users' && r.method === 'GET');
            const userHead = stack.find(r => r.path === '/api/v1/users' && r.method === 'HEAD');
            const post = stack.find(r => r.path === '/api/v1/posts' && r.method === 'POST');

            expect(userGet?.fn).toBe(userHandler);
            expect(userHead?.fn).toBe(userHandler);
            expect(post?.fn).toBe(postHandler);
        });

        it('Applies parent middleware on grouped routes', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/api',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();

            router_with_mware.group('/v2', sub => {
                sub.get('/secure', handler);
            });

            const secureGet = tree_with_mware.stack.find(r => r.path === '/api/v2/secure' && r.method === 'GET');
            expect(secureGet?.middleware).toEqual([
                {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
            ]);
        });

        it('Supports nested groups', () => {
            const deepHandler = vi.fn();

            router.group('/v1', v1 => {
                v1.group('/nested', nested => {
                    nested.get('/deep', deepHandler);
                });
            });

            const deepRoute = tree.stack.find(r => r.path === '/api/v1/nested/deep' && r.method === 'GET');
            expect(deepRoute).toBeDefined();
            expect(deepRoute?.fn).toBe(deepHandler);
        });

        it('Throws on invalid group path', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => {
                    router.group(el as any, () => {});
                }).toThrow(/TriFrostRouter@group: Invalid path/);
            }
        });

        it('Throws on invalid group handler', () => {
            for (const el of [
                ...CONSTANTS.NOT_FUNCTION,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({fn: val})),
            ]) {
                expect(() => {
                    router.group('/bad', el as any);
                }).toThrow(/TriFrostRouter@group: Invalid handler/);
            }
        });

        it('Passes timeout correctly to nested groups', () => {
            const timedRouter = new Router({
                path: '/api',
                timeout: 9999,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            timedRouter.group('/v3', sub => {
                sub.get('/check', vi.fn());
            });

            const checkRoute = tree.stack.find(r => r.path === '/api/v3/check' && r.method === 'GET');
            expect(checkRoute?.timeout).toBe(9999);
        });

        it('Handles group() with config object and timeout', () => {
            const groupHandler = vi.fn((r:Router) => {
                r.get('/inside', vi.fn());
            });

            router.group('/admin', {
                /* @ts-ignore */
                fn: groupHandler,
                timeout: 3000,
            });

            const insideRoute = tree.stack.find(r => r.path === '/api/admin/inside' && r.method === 'GET');
            expect(insideRoute).toBeDefined();
            expect(insideRoute?.timeout).toBe(3000);
        });
    });

    describe('onNotFound', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers a general notfound handler on the tree', () => {
            const handler = vi.fn();

            router.onNotFound(handler);

            const stack = tree.stack;
            expect(stack.length).toBe(1);
            expect(stack).toEqual([{
                path: '/api/*',
                kind: 'notfound',
                fn: handler,
                timeout: null,
                middleware: [],
                method: 'GET', /* This is a stub */
                bodyParser: null,
                name: 'notfound',
                description: '404 Not Found Handler',
                meta: {name: 'notfound', kind: 'notfound'},
            }]);
        });

        it('Applies router-level middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/api',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();
            router_with_mware.onNotFound(handler);
            expect(tree_with_mware.stack).toEqual([{
                path: '/api/*',
                kind: 'notfound',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                method: 'GET', /* This is a stub */
                bodyParser: null,
                name: 'notfound',
                description: '404 Not Found Handler',
                meta: {name: 'notfound', kind: 'notfound'},
            }]);
        });

        it('Throws on non-function handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                expect(() => {
                    router.onNotFound(el as any);
                }).toThrow(/TriFrostRoute@onNotFound: Invalid handler/);
            }
        });
    });

    describe('onError', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers a general error handler on the tree', () => {
            const handler = vi.fn();

            router.onError(handler);

            const stack = tree.stack;
            expect(stack.length).toBe(1);
            expect(stack).toEqual([{
                path: '/api/*',
                kind: 'error',
                fn: handler,
                timeout: null,
                middleware: [],
                method: 'GET', /* This is a stub */
                bodyParser: null,
                name: 'error',
                description: 'Error Handler',
                meta: {name: 'error', kind: 'error'},
            }]);
        });

        it('Applies router-level middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/api',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();
            router_with_mware.onError(handler);
            expect(tree_with_mware.stack).toEqual([{
                path: '/api/*',
                kind: 'error',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                method: 'GET', /* This is a stub */
                bodyParser: null,
                name: 'error',
                description: 'Error Handler',
                meta: {name: 'error', kind: 'error'},
            }]);
        });

        it('Throws on non-function handler', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                expect(() => {
                    router.onError(el as any);
                }).toThrow(/TriFrostRoute@onError: Invalid handler/);
            }
        });
    });

    describe('route', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers multiple methods from the route builder', () => {
            const getHandler = vi.fn();
            const postHandler = vi.fn();

            router.route('/users', r => {
                r.get(getHandler);
                r.post(postHandler);
            });

            const stack = tree.stack;
            expect(stack.length).toBe(4);
            expect(stack[0]).toEqual({
                path: '/api/users',
                method: 'GET',
                kind: 'std',
                fn: getHandler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'GET_/api/users',
                description: null,
                meta: {name: 'GET_/api/users', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/api/users',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/api/users',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
            expect(stack[2]).toEqual({
                path: '/api/users',
                method: 'HEAD',
                kind: 'std',
                fn: getHandler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'HEAD_/api/users',
                description: null,
                meta: {name: 'HEAD_/api/users', kind: 'std'},
            });
            expect(stack[3]).toEqual({
                path: '/api/users',
                method: 'POST',
                kind: 'std',
                fn: postHandler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'POST_/api/users',
                description: null,
                meta: {name: 'POST_/api/users', kind: 'std'},
            });
        });

        it('Applies router-level middleware to all routes', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const m3 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/api',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const getHandler = vi.fn();
            const postHandler = vi.fn();

            router_with_mware.route('/secure', r => {
                r.get(getHandler);
                r.use(m3).post(postHandler);
            });

            const stack = tree_with_mware.stack;
            expect(stack.length).toBe(4);
            expect(stack[0]).toEqual({
                path: '/api/secure',
                method: 'GET',
                kind: 'std',
                fn: getHandler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'GET_/api/secure',
                description: null,
                meta: {name: 'GET_/api/secure', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/api/secure',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/api/secure',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
            expect(stack[2]).toEqual({
                path: '/api/secure',
                method: 'HEAD',
                kind: 'std',
                fn: getHandler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'HEAD_/api/secure',
                description: null,
                meta: {name: 'HEAD_/api/secure', kind: 'std'},
            });
            expect(stack[3]).toEqual({
                path: '/api/secure',
                method: 'POST',
                kind: 'std',
                fn: postHandler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m3},
                ],
                bodyParser: null,
                name: 'POST_/api/secure',
                description: null,
                meta: {name: 'POST_/api/secure', kind: 'std'},
            });
        });

        it('Handles chained use() inside route builder', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            router.route('/nested', r => {
                r.use(m1).use(m2).get(handler);
            });

            const getRoute = tree.stack.find(s => s.method === 'GET');
            expect(getRoute?.middleware).toEqual([
                {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
            ]);
        });

        it('Throws on non-function route handler', () => {
            for (const val of CONSTANTS.NOT_FUNCTION) {
                expect(() => {
                    router.route('/bad', val as any);
                }).toThrowError(/TriFrostRouter@route: No handler provided/);
            }
        });

        it('Supports handler configs with metadata + timeout', () => {
            const handler = vi.fn();

            router.route('/meta', r => {
                r.get({
                    fn: handler,
                    name: 'metaRoute',
                    description: 'With meta',
                    timeout: 5000,
                    meta: {tag: 'test'},
                });
            });

            const stack = tree.stack;
            expect(stack.length).toBe(3);
            expect(stack[0]).toEqual({
                path: '/api/meta',
                method: 'GET',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'metaRoute',
                description: 'With meta',
                meta: {name: 'metaRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/api/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/api/meta',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
            expect(stack[2]).toEqual({
                path: '/api/meta',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'HEAD_metaRoute',
                description: 'With meta',
                meta: {name: 'HEAD_metaRoute', kind: 'std', tag: 'test'},
            });
        });
    });

    describe('verb:get', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/hello',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers a GET and HEAD route on the tree', () => {
            const handler = vi.fn();
            router.get('/test', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(3);
            expect(stack[0]).toEqual({
                path: '/hello/test',
                method: 'GET',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'GET_/hello/test',
                description: null,
                meta: {name: 'GET_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/test',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
            expect(stack[2]).toEqual({
                path: '/hello/test',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'HEAD_/hello/test',
                description: null,
                meta: {name: 'HEAD_/hello/test', kind: 'std'},
            });
        });

        it('Applies router-level middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();
            router_with_mware.get('/with-mware', handler);

            const stack = tree_with_mware.stack;
            expect(stack.length).toBe(3);
            expect(stack[0]).toEqual({
                path: '/with-mware',
                method: 'GET',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'GET_/with-mware',
                description: null,
                meta: {name: 'GET_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/with-mware',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
            expect(stack[2]).toEqual({
                path: '/with-mware',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'HEAD_/with-mware',
                description: null,
                meta: {name: 'HEAD_/with-mware', kind: 'std'},
            });
        });

        it('Throws on invalid path', () => {
            const handler = vi.fn();
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => router.get(el as any, handler)).toThrow(/TriFrostRouter@get: Invalid path/);
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of [
                ...CONSTANTS.NOT_FUNCTION,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({fn: val})),
            ]) {
                expect(() => router.get('/bad', el as any)).toThrow(/TriFrostRouter@get: Invalid handler/);
            }
        });

        it('Properly attaches metadata and timeout when provided', () => {
            const handler = vi.fn();
            router.get('/meta', {
                fn: handler,
                name: 'namedRoute',
                description: 'A test GET route',
                kind: 'std',
                timeout: 5000,
                meta: {tag: 'test'},
            });

            const stack = tree.stack;
            expect(stack.length).toBe(3);
            expect(stack[0]).toEqual({
                path: '/hello/meta',
                method: 'GET',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'namedRoute',
                description: 'A test GET route',
                meta: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/meta',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
            expect(stack[2]).toEqual({
                path: '/hello/meta',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'HEAD_namedRoute',
                description: 'A test GET route',
                meta: {name: 'HEAD_namedRoute', kind: 'std', tag: 'test'},
            });
        });

        it('Handles chained use() + get()', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            router.use(m1).use(m2).get('/chained', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(3);
            expect(stack[0]).toEqual({
                path: '/hello/chained',
                method: 'GET',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'spy', description: null, fingerprint: null, handler: m1},
                    {name: 'spy', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'GET_/hello/chained',
                description: null,
                meta: {name: 'GET_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/chained',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
            expect(stack[2]).toEqual({
                path: '/hello/chained',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'spy', description: null, fingerprint: null, handler: m1},
                    {name: 'spy', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'HEAD_/hello/chained',
                description: null,
                meta: {name: 'HEAD_/hello/chained', kind: 'std'},
            });
        });

        it('Applies router-level bodyParser to GET route', () => {
            const handler = vi.fn();
            router.bodyParser({form: {files: {types: ['application/json']}}}).get('/json', handler);

            const route = tree.stack.find(r => r.path === '/hello/json' && r.method === 'GET');
            expect(route?.bodyParser).toEqual({form: {files: {types: ['application/json']}}});
        });
    });

    describe('verb:post', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/hello',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers a POST route on the tree', () => {
            const handler = vi.fn();
            router.post('/test', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/test',
                method: 'POST',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'POST_/hello/test',
                description: null,
                meta: {name: 'POST_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/test',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();
            router_with_mware.post('/with-mware', handler);

            const stack = tree_with_mware.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/with-mware',
                method: 'POST',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'POST_/with-mware',
                description: null,
                meta: {name: 'POST_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/with-mware',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Throws on invalid path', () => {
            const handler = vi.fn();
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => router.post(el as any, handler)).toThrow(/TriFrostRouter@post: Invalid path/);
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of [
                ...CONSTANTS.NOT_FUNCTION,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({fn: val})),
            ]) {
                expect(() => router.post('/bad', el as any)).toThrow(/TriFrostRouter@post: Invalid handler/);
            }
        });

        it('Properly attaches metadata and timeout when provided', () => {
            const handler = vi.fn();
            router.post('/meta', {
                fn: handler,
                name: 'namedRoute',
                description: 'A test POST route',
                kind: 'std',
                timeout: 5000,
                meta: {tag: 'test'},
            });

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/meta',
                method: 'POST',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'namedRoute',
                description: 'A test POST route',
                meta: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/meta',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Handles chained use() + post()', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            router.use(m1).use(m2).post('/chained', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/chained',
                method: 'POST',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'spy', description: null, fingerprint: null, handler: m1},
                    {name: 'spy', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'POST_/hello/chained',
                description: null,
                meta: {name: 'POST_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/chained',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level bodyParser to POST route', () => {
            const bp = {limit: 999_999};
            const handler = vi.fn();
            router.bodyParser(bp).post('/submit', handler);

            const route = tree.stack.find(r => r.path === '/hello/submit' && r.method === 'POST');
            expect(route?.bodyParser).toBe(bp);
        });
    });

    describe('verb:put', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/hello',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers a PUT route on the tree', () => {
            const handler = vi.fn();
            router.put('/test', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/test',
                method: 'PUT',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'PUT_/hello/test',
                description: null,
                meta: {name: 'PUT_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/test',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();
            router_with_mware.put('/with-mware', handler);

            const stack = tree_with_mware.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/with-mware',
                method: 'PUT',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'PUT_/with-mware',
                description: null,
                meta: {name: 'PUT_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/with-mware',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Throws on invalid path', () => {
            const handler = vi.fn();
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => router.put(el as any, handler)).toThrow(/TriFrostRouter@put: Invalid path/);
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of [
                ...CONSTANTS.NOT_FUNCTION,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({fn: val})),
            ]) {
                expect(() => router.put('/bad', el as any)).toThrow(/TriFrostRouter@put: Invalid handler/);
            }
        });

        it('Properly attaches metadata and timeout when provided', () => {
            const handler = vi.fn();
            router.put('/meta', {
                fn: handler,
                name: 'namedRoute',
                description: 'A test PUT route',
                kind: 'std',
                timeout: 5000,
                meta: {tag: 'test'},
            });

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/meta',
                method: 'PUT',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'namedRoute',
                description: 'A test PUT route',
                meta: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/meta',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Handles chained use() + put()', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            router.use(m1).use(m2).put('/chained', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/chained',
                method: 'PUT',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'spy', description: null, fingerprint: null, handler: m1},
                    {name: 'spy', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'PUT_/hello/chained',
                description: null,
                meta: {name: 'PUT_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/chained',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level bodyParser to PUT route', () => {
            const bp = {limit: 999_999};
            const handler = vi.fn();
            router.bodyParser(bp).put('/update', handler);

            const route = tree.stack.find(r => r.path === '/hello/update' && r.method === 'PUT');
            expect(route?.bodyParser).toBe(bp);
        });
    });

    describe('verb:patch', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/hello',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers a PATCH route on the tree', () => {
            const handler = vi.fn();
            router.patch('/test', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/test',
                method: 'PATCH',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'PATCH_/hello/test',
                description: null,
                meta: {name: 'PATCH_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/test',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();
            router_with_mware.patch('/with-mware', handler);

            const stack = tree_with_mware.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/with-mware',
                method: 'PATCH',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'PATCH_/with-mware',
                description: null,
                meta: {name: 'PATCH_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/with-mware',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Throws on invalid path', () => {
            const handler = vi.fn();
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => router.patch(el as any, handler)).toThrow(/TriFrostRouter@patch: Invalid path/);
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of [
                ...CONSTANTS.NOT_FUNCTION,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({fn: val})),
            ]) {
                expect(() => router.patch('/bad', el as any)).toThrow(/TriFrostRouter@patch: Invalid handler/);
            }
        });

        it('Properly attaches metadata and timeout when provided', () => {
            const handler = vi.fn();
            router.patch('/meta', {
                fn: handler,
                name: 'namedRoute',
                description: 'A test PATCH route',
                kind: 'std',
                timeout: 5000,
                meta: {tag: 'test'},
            });

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/meta',
                method: 'PATCH',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'namedRoute',
                description: 'A test PATCH route',
                meta: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/meta',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Handles chained use() + patch()', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            router.use(m1).use(m2).patch('/chained', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/chained',
                method: 'PATCH',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'spy', description: null, fingerprint: null, handler: m1},
                    {name: 'spy', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'PATCH_/hello/chained',
                description: null,
                meta: {name: 'PATCH_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/chained',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level bodyParser to PATCH route', () => {
            const bp = {limit: 999_999};
            const handler = vi.fn();
            router.bodyParser(bp).patch('/partial', handler);

            const route = tree.stack.find(r => r.path === '/hello/partial' && r.method === 'PATCH');
            expect(route?.bodyParser).toBe(bp);
        });
    });

    describe('verb:del', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/hello',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });
        });

        it('Registers a DELETE route on the tree', () => {
            const handler = vi.fn();
            router.del('/test', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/test',
                method: 'DELETE',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'DELETE_/hello/test',
                description: null,
                meta: {name: 'DELETE_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/test',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();

            const tree_with_mware = new RouteTree();
            const router_with_mware = new Router({
                path: '/',
                timeout: null,
                tree: tree_with_mware,
                middleware: [m1, m2],
                rateLimit: null,
                bodyParser: null,
            });

            const handler = vi.fn();
            router_with_mware.del('/with-mware', handler);

            const stack = tree_with_mware.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/with-mware',
                method: 'DELETE',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m1},
                    {name: 'anonymous_mware', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'DELETE_/with-mware',
                description: null,
                meta: {name: 'DELETE_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/with-mware',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Throws on invalid path', () => {
            const handler = vi.fn();
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => router.del(el as any, handler)).toThrow(/TriFrostRouter@del: Invalid path/);
            }
        });

        it('Throws on invalid handler', () => {
            for (const el of [
                ...CONSTANTS.NOT_FUNCTION,
                ...[...CONSTANTS.NOT_FUNCTION].map(val => ({fn: val})),
            ]) {
                expect(() => router.del('/bad', el as any)).toThrow(/TriFrostRouter@del: Invalid handler/);
            }
        });

        it('Properly attaches metadata and timeout when provided', () => {
            const handler = vi.fn();
            router.del('/meta', {
                fn: handler,
                name: 'namedRoute',
                description: 'A test DELETE route',
                kind: 'std',
                timeout: 5000,
                meta: {tag: 'test'},
            });

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/meta',
                method: 'DELETE',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                bodyParser: null,
                name: 'namedRoute',
                description: 'A test DELETE route',
                meta: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/meta',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Handles chained use() + del()', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler = vi.fn();

            router.use(m1).use(m2).del('/chained', handler);

            const stack = tree.stack;
            expect(stack.length).toBe(2);
            expect(stack[0]).toEqual({
                path: '/hello/chained',
                method: 'DELETE',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [
                    {name: 'spy', description: null, fingerprint: null, handler: m1},
                    {name: 'spy', description: null, fingerprint: null, handler: m2},
                ],
                bodyParser: null,
                name: 'DELETE_/hello/chained',
                description: null,
                meta: {name: 'DELETE_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                bodyParser: null,
                name: 'OPTIONS_/hello/chained',
                description: 'Auto-generated OPTIONS handler',
                meta: {},
            }));
        });

        it('Applies router-level bodyParser to DELETE route', () => {
            const bp = {limit: 999_999};
            const handler = vi.fn();
            router.bodyParser(bp).del('/remove', handler);

            const route = tree.stack.find(r => r.path === '/hello/remove' && r.method === 'DELETE');
            expect(route?.bodyParser).toBe(bp);
        });
    });

    describe('complex integration', () => {
        let router: Router<any, any>;
        let tree: RouteTree<any>;
        const dummyMiddleware = vi.fn();
        const m1 = vi.fn();
        const m2 = vi.fn();
        const m3 = vi.fn();
        const handlerMain = vi.fn();
        const handlerGroup = vi.fn();
        const handlerRouteGet = vi.fn();
        const handlerRoutePost = vi.fn();
        const rateLimitMock = {limit: vi.fn(() => dummyMiddleware)};

        beforeEach(() => {
            tree = new RouteTree();
            router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit<any>,
                bodyParser: null,
            });
        });

        it('Throws if use() receives invalid middleware', () => {
            for (const invalid of CONSTANTS.NOT_FUNCTION) {
                expect(() => router.use(invalid as any)).toThrow(/TriFrostRouter@use: Handler is expected/);
            }
        });

        it('Builds a full stack with get/post/put/group/route/use/limit', () => {
            router.use(m1).limit(10);
            router.get('/users', handlerMain);
            router.post('/users', handlerMain);
            router.put('/users/:id', handlerMain);
            router.group('/admin', admin => {
                admin.use(m2);
                admin.get('/dashboard', handlerGroup);
            });
            router.route('/products', r => {
                r.use(m3);
                r.get(handlerRouteGet);
                r.post(handlerRoutePost);
            });

            const stack = tree.stack;
            const summary = stack.map(r => `${r.method} ${r.path}`);
            expect(summary).toEqual(expect.arrayContaining([
                'GET /api/users',
                'HEAD /api/users',
                'POST /api/users',
                'PUT /api/users/:id',
                'GET /api/admin/dashboard',
                'HEAD /api/admin/dashboard',
                'GET /api/products',
                'HEAD /api/products',
                'POST /api/products',
            ]));

            /* Check middleware chains */
            const getUsers = stack.find(r => r.path === '/api/users' && r.method === 'GET');
            const postUsers = stack.find(r => r.path === '/api/users' && r.method === 'POST');
            const putUsers = stack.find(r => r.path === '/api/users/:id' && r.method === 'PUT');
            const adminDashboard = stack.find(r => r.path === '/api/admin/dashboard' && r.method === 'GET');
            const productsGet = stack.find(r => r.path === '/api/products' && r.method === 'GET');
            const productsPost = stack.find(r => r.path === '/api/products' && r.method === 'POST');

            expect(getUsers?.middleware).toEqual([
                {name: 'spy', description: null, fingerprint: null, handler: m1},
                {name: 'spy', description: null, fingerprint: null, handler: dummyMiddleware},
            ]);
            expect(postUsers?.middleware).toEqual([
                {name: 'spy', description: null, fingerprint: null, handler: m1},
                {name: 'spy', description: null, fingerprint: null, handler: dummyMiddleware},
            ]);
            expect(putUsers?.middleware).toEqual([
                {name: 'spy', description: null, fingerprint: null, handler: m1},
                {name: 'spy', description: null, fingerprint: null, handler: dummyMiddleware},
            ]);
            expect(adminDashboard?.middleware).toEqual([
                {name: 'spy', description: null, fingerprint: null, handler: m1},
                {name: 'spy', description: null, fingerprint: null, handler: dummyMiddleware},
                {name: 'spy', description: null, fingerprint: null, handler: m2},
            ]);
            expect(productsGet?.middleware).toEqual([
                {name: 'spy', description: null, fingerprint: null, handler: m1},
                {name: 'spy', description: null, fingerprint: null, handler: dummyMiddleware},
                {name: 'anonymous_mware', description: null, fingerprint: null, handler: m3},
            ]);
            expect(productsPost?.middleware).toEqual([
                {name: 'spy', description: null, fingerprint: null, handler: m1},
                {name: 'spy', description: null, fingerprint: null, handler: dummyMiddleware},
                {name: 'anonymous_mware', description: null, fingerprint: null, handler: m3},
            ]);

            /* Check handlers attached */
            expect(getUsers?.fn).toBe(handlerMain);
            expect(postUsers?.fn).toBe(handlerMain);
            expect(putUsers?.fn).toBe(handlerMain);
            expect(adminDashboard?.fn).toBe(handlerGroup);
            expect(productsGet?.fn).toBe(handlerRouteGet);
            expect(productsPost?.fn).toBe(handlerRoutePost);
        });
    });

    describe('middleware symbols', () => {
        it('Applies Sym_TriFrostName on middleware in use()', () => {
            const named = vi.fn();
            Reflect.set(named, Sym_TriFrostName, 'custom_named');

            const tree = new RouteTree();
            const router = new Router({
                path: '/api',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            router.use(named).get('/with-name', vi.fn());

            const route = tree.stack.find(r => r.path === '/api/with-name' && r.method === 'GET');
            expect(route?.middleware?.[0]?.name).toBe('custom_named');
        });

        it('Falls back to "anonymous" if fn.name and Sym_TriFrostName are missing', () => {
            const tree = new RouteTree();
            const router = new Router({
                path: '/x',
                timeout: null,
                tree,
                middleware: [],
                rateLimit: null,
                bodyParser: null,
            });

            router.use(() => {}).get('/ping', vi.fn());

            const route = tree.stack.find(r => r.path === '/x/ping' && r.method === 'GET');
            expect(route?.middleware[0].name).toBe('anonymous');
        });

        it('normalizeMiddleware uses symbolic name if available', () => {
            const fn = vi.fn();
            Reflect.set(fn, Sym_TriFrostName, 'mySymbolicName');

            const out = normalizeMiddleware([fn]);
            expect(out[0].name).toBe('mySymbolicName');
        });

        it('normalizeMiddleware defaults to anonymous_mware', () => {
            const fn = vi.fn();
            const out = normalizeMiddleware([fn]);
            expect(out[0].name).toBe('anonymous_mware');
        });
    });
});
