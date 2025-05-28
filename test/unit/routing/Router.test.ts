/* eslint-disable max-lines */
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {Router} from '../../../lib/routing/Router';
import {RouteTree} from '../../../lib/routing/Tree';
import {TriFrostRateLimit} from '../../../lib/modules/RateLimit/_RateLimit';
import {TriFrostMiddleware} from '../../../lib/types/routing';
import CONSTANTS from '../../constants';
import {Sym_TriFrostDescription, Sym_TriFrostMeta, Sym_TriFrostName, Sym_TriFrostType} from '../../../lib/types';

describe('routing - Router', () => {
    const EXAMPLE_CONFIG = {
        path: '/',
        timeout: null,
        tree: new RouteTree(),
        middleware: [],
        rateLimit: null,
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

        it('Throws on invalid ratelimit', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                expect(() => new Router({
                    ...EXAMPLE_CONFIG,
                    tree: el as RouteTree,
                })).toThrowError(/TriFrostRouter@ctor: Tree is invalid/);
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
            });
    
            router.limit(5).get('/protected', vi.fn());
    
            const route = tree.stack.find(r => r.path === '/api/protected' && r.method === 'GET');
            expect(route?.middleware).toContain(dummyMiddleware);
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
            });
    
            router.use(m1).limit(10).use(m2).post('/chained', handler);
    
            const route = tree.stack.find(r => r.path === '/api/chained' && r.method === 'POST');
            expect(route?.middleware).toEqual([m1, dummyMiddleware, m2]);
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
            });
    
            router.limit(5).get('/multi', handler1).post('/multi', handler2);
    
            const getRoute = tree.stack.find(r => r.path === '/api/multi' && r.method === 'GET');
            const postRoute = tree.stack.find(r => r.path === '/api/multi' && r.method === 'POST');
    
            expect(getRoute?.middleware).toContain(dummyMiddleware);
            expect(postRoute?.middleware).toContain(dummyMiddleware);
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
            });
    
            const handler = vi.fn();
    
            router_with_mware.group('/v2', sub => {
                sub.get('/secure', handler);
            });
    
            const secureGet = tree_with_mware.stack.find(r => r.path === '/api/v2/secure' && r.method === 'GET');
            expect(secureGet?.middleware).toEqual([m1, m2]);
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'notfound',
                [Sym_TriFrostDescription]: '404 Not Found Handler',
                [Sym_TriFrostMeta]: {name: 'notfound', kind: 'notfound'},
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
            });
    
            const handler = vi.fn();
            router_with_mware.onNotFound(handler);
            expect(tree_with_mware.stack).toEqual([{
                path: '/api/*',
                kind: 'notfound',
                fn: handler,
                timeout: null,
                middleware: [m1, m2],
                method: 'GET', /* This is a stub */
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'notfound',
                [Sym_TriFrostDescription]: '404 Not Found Handler',
                [Sym_TriFrostMeta]: {name: 'notfound', kind: 'notfound'},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'error',
                [Sym_TriFrostDescription]: 'Error Handler',
                [Sym_TriFrostMeta]: {name: 'error', kind: 'error'},
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
            });
    
            const handler = vi.fn();
            router_with_mware.onError(handler);
            expect(tree_with_mware.stack).toEqual([{
                path: '/api/*',
                kind: 'error',
                fn: handler,
                timeout: null,
                middleware: [m1, m2],
                method: 'GET', /* This is a stub */
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'error',
                [Sym_TriFrostDescription]: 'Error Handler',
                [Sym_TriFrostMeta]: {name: 'error', kind: 'error'},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'GET_/api/users',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'GET_/api/users', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/api/users',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
            expect(stack[2]).toEqual({
                path: '/api/users',
                method: 'HEAD',
                kind: 'std',
                fn: getHandler,
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'HEAD_/api/users',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'HEAD_/api/users', kind: 'std'},
            });
            expect(stack[3]).toEqual({
                path: '/api/users',
                method: 'POST',
                kind: 'std',
                fn: postHandler,
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'POST_/api/users',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'POST_/api/users', kind: 'std'},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'GET_/api/secure',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'GET_/api/secure', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/api/secure',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
            expect(stack[2]).toEqual({
                path: '/api/secure',
                method: 'HEAD',
                kind: 'std',
                fn: getHandler,
                timeout: null,
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'HEAD_/api/secure',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'HEAD_/api/secure', kind: 'std'},
            });
            expect(stack[3]).toEqual({
                path: '/api/secure',
                method: 'POST',
                kind: 'std',
                fn: postHandler,
                timeout: null,
                middleware: [m1, m2, m3],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'POST_/api/secure',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'POST_/api/secure', kind: 'std'},
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
            expect(getRoute?.middleware).toEqual([m1, m2]);
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'metaRoute',
                [Sym_TriFrostDescription]: 'With meta',
                [Sym_TriFrostMeta]: {name: 'metaRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/api/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
            expect(stack[2]).toEqual({
                path: '/api/meta',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'HEAD_metaRoute',
                [Sym_TriFrostDescription]: 'With meta',
                [Sym_TriFrostMeta]: {name: 'HEAD_metaRoute', kind: 'std', tag: 'test'},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'GET_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'GET_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
            expect(stack[2]).toEqual({
                path: '/hello/test',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'HEAD_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'HEAD_/hello/test', kind: 'std'},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'GET_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'GET_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
            expect(stack[2]).toEqual({
                path: '/with-mware',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'HEAD_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'HEAD_/with-mware', kind: 'std'},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'namedRoute',
                [Sym_TriFrostDescription]: 'A test GET route',
                [Sym_TriFrostMeta]: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_namedRoute',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
            expect(stack[2]).toEqual({
                path: '/hello/meta',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: 5000,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'HEAD_namedRoute',
                [Sym_TriFrostDescription]: 'A test GET route',
                [Sym_TriFrostMeta]: {name: 'HEAD_namedRoute', kind: 'std', tag: 'test'},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'GET_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'GET_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
            expect(stack[2]).toEqual({
                path: '/hello/chained',
                method: 'HEAD',
                kind: 'std',
                fn: handler,
                timeout: null,
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'HEAD_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'HEAD_/hello/chained', kind: 'std'},
            });
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'POST_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'POST_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'POST_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'POST_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'namedRoute',
                [Sym_TriFrostDescription]: 'A test POST route',
                [Sym_TriFrostMeta]: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_namedRoute',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'POST_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'POST_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'PUT_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'PUT_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'PUT_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'PUT_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'namedRoute',
                [Sym_TriFrostDescription]: 'A test PUT route',
                [Sym_TriFrostMeta]: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_namedRoute',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'PUT_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'PUT_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'PATCH_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'PATCH_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'PATCH_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'PATCH_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'namedRoute',
                [Sym_TriFrostDescription]: 'A test PATCH route',
                [Sym_TriFrostMeta]: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_namedRoute',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'PATCH_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'PATCH_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'DELETE_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'DELETE_/hello/test', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/test',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/test',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'DELETE_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'DELETE_/with-mware', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/with-mware',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/with-mware',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'namedRoute',
                [Sym_TriFrostDescription]: 'A test DELETE route',
                [Sym_TriFrostMeta]: {name: 'namedRoute', kind: 'std', tag: 'test'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/meta',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_namedRoute',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
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
                middleware: [m1, m2],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'DELETE_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {name: 'DELETE_/hello/chained', kind: 'std'},
            });
            expect(stack[1]).toEqual(expect.objectContaining({
                path: '/hello/chained',
                method: 'OPTIONS',
                kind: 'options',
                timeout: null,
                middleware: [],
                [Sym_TriFrostType]: 'handler',
                [Sym_TriFrostName]: 'OPTIONS_/hello/chained',
                [Sym_TriFrostDescription]: null,
                [Sym_TriFrostMeta]: {},
            }));
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
    
            expect(getUsers?.middleware).toEqual([m1, dummyMiddleware]);
            expect(postUsers?.middleware).toEqual([m1, dummyMiddleware]);
            expect(putUsers?.middleware).toEqual([m1, dummyMiddleware]);
            expect(adminDashboard?.middleware).toEqual([m1, dummyMiddleware, m2]);
            expect(productsGet?.middleware).toEqual([m1, dummyMiddleware, m3]);
            expect(productsPost?.middleware).toEqual([m1, dummyMiddleware, m3]);
    
            /* Check handlers attached */
            expect(getUsers?.fn).toBe(handlerMain);
            expect(postUsers?.fn).toBe(handlerMain);
            expect(putUsers?.fn).toBe(handlerMain);
            expect(adminDashboard?.fn).toBe(handlerGroup);
            expect(productsGet?.fn).toBe(handlerRouteGet);
            expect(productsPost?.fn).toBe(handlerRoutePost);
        });
    });
});
