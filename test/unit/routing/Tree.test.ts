import {describe, it, expect, beforeEach} from 'vitest';
import {RouteTree} from '../../../lib/routing/Tree';
import {HttpMethods} from '../../../lib/types/constants';
import CONSTANTS from '../../constants';
import {type TriFrostRoute} from '../../../lib/types/routing';
import {MockContext} from '../../MockContext';
import {TriFrostContext} from '../../../lib/types';
import {Sym_TriFrostMiddlewareCors} from '../../../lib/middleware/Cors';

describe('routing - Tree', () => {
    let tree: RouteTree;

    beforeEach(() => {
        tree = new RouteTree();
    });

    describe('static', () => {
        it('Adds and matches static route', () => {
            const handler = () => {};
            tree.add({
                path: '/static',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/static');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({});
            expect(match?.route.fn).toBe(handler);
        });

        it('Returns null when static route not found', () => {
            const match = tree.match(HttpMethods.GET, '/missing');
            expect(match).toBe(null);
        });

        it('Handles trailing slash as distinct static route', () => {
            const withSlashHandler = () => {};
            const noSlashHandler = () => {};

            const with_slash_route = {
                path: '/trail/',
                fn: withSlashHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            } as TriFrostRoute<any>;
            tree.add(with_slash_route);

            const no_slash_route = {
                path: '/trail',
                fn: noSlashHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            } as TriFrostRoute<any>;
            tree.add(no_slash_route);

            const no_slash = tree.match(HttpMethods.GET, '/trail');
            const with_slash = tree.match(HttpMethods.GET, '/trail/');

            expect(no_slash?.route.fn).toBe(noSlashHandler);
            expect(no_slash?.route.middleware).toEqual([]);

            expect(with_slash?.route.fn).toBe(withSlashHandler);
            expect(with_slash?.route.middleware).toEqual([]);
        });

        it('Matches root path', () => {
            const handler = () => {};
            tree.add({
                path: '/',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });
    });

    describe('dynamic', () => {
        it('Adds and matches dynamic param route', () => {
            const handler = () => {};
            tree.add({
                path: '/user/:id',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/user/42');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({id: '42'});
            expect(match?.route.fn).toBe(handler);
        });

        it('Adds and matches wildcard route', () => {
            const handler = () => {};
            tree.add({
                path: '/wild/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/wild/anything/here');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({'*': 'anything/here'});
            expect(match?.route.fn).toBe(handler);
        });

        it('Matches multiple param route', () => {
            const teamHandler = () => {};
            const fileHandler = () => {};

            tree.add({
                path: '/team/:teamId/user/:userId',
                fn: teamHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/files/:folder/:year/:file',
                fn: fileHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match1 = tree.match(HttpMethods.GET, '/team/7/user/88');
            expect(match1?.params).toEqual({teamId: '7', userId: '88'});
            expect(match1?.route.fn).toBe(teamHandler);

            const match2 = tree.match(HttpMethods.GET, '/files/photos/2024/pic.jpg');
            expect(match2?.params).toEqual({folder: 'photos', year: '2024', file: 'pic.jpg'});
            expect(match2?.route.fn).toBe(fileHandler);
        });

        it('Matches param + wildcard combo', () => {
            const handler = () => {};
            tree.add({
                path: '/files/:folder/:year/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/files/photos/2024/pic.jpg');
            expect(match?.params).toEqual({'*': 'pic.jpg', folder: 'photos', year: '2024'});
            expect(match?.route.fn).toBe(handler);
        });

        it('Matches deep wildcard chains', () => {
            const handler = () => {};
            tree.add({
                path: '/wild/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/wild/a/b/c/d');
            expect(match?.route.fn).toBe(handler);
            expect(match?.params).toEqual({'*': 'a/b/c/d'});
        });

        it('Does not match wildcard chain on other methods', () => {
            tree.add({
                path: '/wild/*',
                fn: () => {},
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            expect(tree.match(HttpMethods.POST, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.PUT, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.PATCH, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.DELETE, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.HEAD, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.OPTIONS, '/wild/a/b/c/d')).toBe(null);
        });

        it('Does not leak params across routes', () => {
            const firstHandler = () => {};
            const secondHandler = () => {};

            tree.add({
                path: '/first/:id',
                fn: firstHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/second/:name',
                fn: secondHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const first = tree.match(HttpMethods.GET, '/first/1');
            const second = tree.match(HttpMethods.GET, '/second/abc');

            expect(first?.params).toEqual({id: '1'});
            expect(first?.route.fn).toBe(firstHandler);

            expect(second?.params).toEqual({name: 'abc'});
            expect(second?.route.fn).toBe(secondHandler);
        });

        it('Correctly matches across methods', () => {
            const getHandler = () => {};
            const postHandler = () => {};

            tree.add({
                path: '/first/:id',
                fn: getHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/first/:id',
                fn: postHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.POST,
                name: 'anonymous',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const get = tree.match(HttpMethods.GET, '/first/1');
            const post = tree.match(HttpMethods.POST, '/first/abc');

            expect(get?.route.fn).toBe(getHandler);
            expect(get?.params).toEqual({id: '1'});

            expect(post?.route.fn).toBe(postHandler);
            expect(post?.params).toEqual({id: 'abc'});
        });

        it('Returns null when dynamic route not found', () => {
            const match = tree.match(HttpMethods.GET, '/user');
            expect(match).toBe(null);
        });
    });

    describe('notfound', () => {
        it('Adds and matches notfound wildcard handler', () => {
            const handler = () => {};
            tree.addNotFound({
                path: '/api/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: '404_api',
                description: 'API notfound handler',
                meta: {},
                bodyParser: null,
            });

            const match = tree.matchNotFound('/api/missing/endpoint');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Matches nested notfound fallback', () => {
            const handler = () => {};
            tree.addNotFound({
                path: '/nested/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: '404_nested',
                description: 'Nested notfound handler',
                meta: {},
                bodyParser: null,
            });

            const match = tree.matchNotFound('/nested/deeper/path');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Returns null when no notfound handler matches', () => {
            const match = tree.matchNotFound('/random/path');
            expect(match).toBe(null);
        });

        it('Returns cached result in matchNotFound after initial lookup', () => {
            const handler = () => {};
            tree.addNotFound({
                path: '/cached/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: 'cached_nf',
                description: 'Cached notfound',
                meta: {},
                bodyParser: null,
            });

            const first = tree.matchNotFound('/cached/something');
            expect(first).not.toBe(null);

            const second = tree.matchNotFound('/cached/something');
            expect(second).not.toBe(null);
            expect(second).toBe(first);
        });
    });

    describe('error', () => {
        it('Adds and matches error wildcard handler', () => {
            const handler = () => {};
            tree.addError({
                path: '/server/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'error',
                name: '500_server',
                description: 'Server error handler',
                meta: {},
                bodyParser: null,
            });

            const match = tree.matchError('/server/boom');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Matches specific error fallback', () => {
            const handler = () => {};
            tree.addError({
                path: '/failures/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'error',
                name: '500_failures',
                description: 'Failures error handler',
                meta: {},
                bodyParser: null,
            });

            const match = tree.matchError('/failures/deep/error');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Returns null when no error handler matches', () => {
            const match = tree.matchError('/ok/path');
            expect(match).toBe(null);
        });

        it('Returns cached result in matchError after initial lookup', () => {
            const handler = () => {};
            tree.addError({
                path: '/error/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'error',
                name: 'cached_err',
                description: 'Cached error',
                meta: {},
                bodyParser: null,
            });

            const first = tree.matchError('/error/boom');
            expect(first).not.toBe(null);

            const second = tree.matchError('/error/boom');
            expect(second).not.toBe(null);
            expect(second).toBe(first);
        });
    });

    describe('reset()', () => {
        it('Resets all registered routes', () => {
            const handler = () => {};

            tree.add({
                path: '/wipe',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'wipe_route',
                description: 'wipe route',
                meta: {},
                bodyParser: null,
            });

            tree.addNotFound({
                path: '/wipe/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: 'wipe_notfound',
                description: 'wipe notfound handler',
                meta: {},
                bodyParser: null,
            });

            tree.addError({
                path: '/wipe/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'error',
                name: 'wipe_error',
                description: 'wipe error handler',
                meta: {},
                bodyParser: null,
            });

            /* Before reset: matches should succeed */
            expect(tree.match(HttpMethods.GET, '/wipe')).not.toBe(null);
            expect(tree.matchNotFound('/wipe/abc')).not.toBe(null);
            expect(tree.matchError('/wipe/abc')).not.toBe(null);

            tree.reset();

            /* After reset: everything should be gone */
            expect(tree.match(HttpMethods.GET, '/wipe')).toBe(null);
            expect(tree.matchNotFound('/wipe/abc')).toBe(null);
            expect(tree.matchError('/wipe/abc')).toBe(null);
        });
    });

    describe('GET stack', () => {
        it('collects all routes across static, dynamic, notfound, and error', () => {
            const handler = () => {};

            tree.add({
                path: '/static',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: 'GET',
                name: 'static_get',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/dynamic/:id',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: 'POST',
                name: 'dynamic_post',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.addNotFound({
                path: '/nf/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: 'notfound',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.addError({
                path: '/err/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'error',
                name: 'error',
                description: null,
                meta: {},
                bodyParser: null,
            });

            expect(tree.stack).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({path: '/static', method: 'GET'}),
                    expect.objectContaining({path: '/static', method: 'OPTIONS'}),
                    expect.objectContaining({path: '/dynamic/:id', method: 'POST'}),
                    expect.objectContaining({path: '/dynamic/:id', method: 'OPTIONS'}),
                    expect.objectContaining({path: '/nf/*', kind: 'notfound'}),
                    expect.not.objectContaining({path: '/nf/*', method: 'OPTIONS'}),
                    expect.objectContaining({path: '/err/*', kind: 'error'}),
                    expect.not.objectContaining({path: '/err/*', method: 'OPTIONS'}),
                ]),
            );
        });

        it('includes auto-generated OPTIONS routes in stack', () => {
            const handler = () => {};
            tree.add({
                path: '/options-test',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: 'GET',
                name: 'options_test',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const allRoutes = tree.stack;

            const optionRoute = allRoutes.find(r => r.method === 'OPTIONS' && r.path === '/options-test');
            expect(optionRoute).toBeDefined();
            expect(optionRoute?.kind).toBe('options');
            expect(optionRoute?.middleware).toEqual([]);
        });

        it('clears stack after reset', () => {
            const handler = () => {};
            tree.add({
                path: '/somewhere',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: 'GET',
                name: 'somewhere',
                description: null,
                meta: {},
                bodyParser: null,
            });

            expect(tree.stack.length).toBeGreaterThan(0);

            tree.reset();

            expect(tree.stack.length).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('Matches empty path "" as root', () => {
            const handler = () => {};
            tree.add({
                path: '/',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'root',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Handles multiple consecutive slashes', () => {
            const handler = () => {};
            tree.add({
                path: '/multi/slash',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'multi_slash',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/multi//slash///');
            expect(match).toBe(null);
        });

        it('Matches percent-encoded segments', () => {
            const handler = () => {};
            tree.add({
                path: '/file/space%20here',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'percent_encoded',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/file/space%20here');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Handles non-ASCII segments', () => {
            const handler = () => {};
            tree.add({
                path: '/emoji/💥/🔥',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'non_ascii',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/emoji/💥/🔥');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Captures many params correctly', () => {
            const handler = () => {};
            tree.add({
                path: '/a/:p1/b/:p2/c/:p3/d/:p4/e/:p5',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'multi_params',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/a/1/b/2/c/3/d/4/e/5');
            expect(match?.params).toEqual({
                p1: '1',
                p2: '2',
                p3: '3',
                p4: '4',
                p5: '5',
            });
            expect(match?.route.fn).toBe(handler);
        });

        it('Handles overlapping routes', () => {
            const staticHandler = () => {};
            const paramHandler = () => {};
            const wildcardHandler = () => {};

            tree.add({
                path: '/foo/bar',
                fn: staticHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'foo_bar_static',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/foo/:param',
                fn: paramHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'foo_param',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/foo/*',
                fn: wildcardHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'foo_wildcard',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const staticMatch = tree.match(HttpMethods.GET, '/foo/bar');
            const paramMatch = tree.match(HttpMethods.GET, '/foo/value');
            const wildcardMatch = tree.match(HttpMethods.GET, '/foo/extra/path');

            expect(staticMatch?.route.fn).toBe(staticHandler);
            expect(paramMatch?.route.fn).toBe(paramHandler);
            expect(wildcardMatch?.route.fn).toBe(wildcardHandler);
        });

        it('Matches deep wildcard chains', () => {
            const handler = () => {};
            tree.add({
                path: '/wild/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'wild_deep',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/wild/a/b/c/d/e/f/g/h/i');
            expect(match).not.toBe(null);
            expect(match?.route.fn).toBe(handler);
        });

        it('Returns correct middleware stack', () => {
            const mw1 = {
                name: 'mw1',
                description: null,
                fingerprint: null,
                handler: () => {},
            };
            const mw2 = {
                name: 'mw2',
                description: null,
                fingerprint: null,
                handler: () => {},
            };

            tree.add({
                path: '/with/mw',
                fn: () => {},
                middleware: [mw1, mw2],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'with_mw',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/with/mw');
            expect(match?.route.middleware).toEqual([mw1, mw2]);
        });

        it('Prioritizes static over param (param shadowing)', () => {
            const staticHandler = () => {};
            const paramHandler = () => {};

            tree.add({
                path: '/shadow/static',
                fn: staticHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'shadow_static',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/shadow/:param',
                fn: paramHandler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'shadow_param',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const staticMatch = tree.match(HttpMethods.GET, '/shadow/static');
            const paramMatch = tree.match(HttpMethods.GET, '/shadow/value');

            expect(staticMatch?.route.fn).toBe(staticHandler);
            expect(paramMatch?.route.fn).toBe(paramHandler);
            expect(paramMatch?.params).toEqual({param: 'value'});
        });

        it('Normalizes trailing slashes', () => {
            const handler = () => {};
            tree.add({
                path: '/normalize/slash',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'normalize_slash',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const matchWith = tree.match(HttpMethods.GET, '/normalize/slash/');
            const matchWithout = tree.match(HttpMethods.GET, '/normalize/slash');

            expect(matchWith).toBe(null);
            expect(matchWithout?.route.fn).toBe(handler);
        });

        it('Rejects double slashes internally', () => {
            const handler = () => {};
            tree.add({
                path: '/double/slash',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'double_slash',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.GET, '/double//slash');
            expect(match).toBe(null);
        });

        it('Matches most specific notfound wildcard', () => {
            const outerHandler = () => {};
            const innerHandler = () => {};

            tree.addNotFound({
                path: '/api/*',
                fn: outerHandler,
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: 'outer_nf',
                description: 'Outer notfound',
                meta: {},
                bodyParser: null,
            });

            tree.addNotFound({
                path: '/api/v2/*',
                fn: innerHandler,
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: 'inner_nf',
                description: 'Inner notfound',
                meta: {},
                bodyParser: null,
            });

            const matchOuter = tree.matchNotFound('/api/unknown');
            const matchInner = tree.matchNotFound('/api/v2/unknown');

            expect(matchOuter?.route.fn).toBe(outerHandler);
            expect(matchInner?.route.fn).toBe(innerHandler);
        });

        it('Handles error routes with multiple wildcards', () => {
            const generalErrorHandler = () => {};
            const specificErrorHandler = () => {};

            tree.addError({
                path: '/error/*',
                fn: generalErrorHandler,
                middleware: [],
                timeout: null,
                kind: 'error',
                name: 'general_error',
                description: 'General error handler',
                meta: {},
                bodyParser: null,
            });

            tree.addError({
                path: '/error/critical/*',
                fn: specificErrorHandler,
                middleware: [],
                timeout: null,
                kind: 'error',
                name: 'specific_error',
                description: 'Specific error handler',
                meta: {},
                bodyParser: null,
            });

            const generalMatch = tree.matchError('/error/timeout');
            const specificMatch = tree.matchError('/error/critical/failure');

            expect(generalMatch?.route.fn).toBe(generalErrorHandler);
            expect(specificMatch?.route.fn).toBe(specificErrorHandler);
        });

        it('Returns null when no notfound or error handler matches', () => {
            const nfMatch = tree.matchNotFound('/no/match');
            const errMatch = tree.matchError('/no/match');

            expect(nfMatch).toBe(null);
            expect(errMatch).toBe(null);
        });

        it('Returns null when segment length matches but no method exists', () => {
            const handler = () => {};
            const path = '/nomethod';

            tree.add({
                path,
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.POST,
                name: 'post_only',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const result = tree.match(HttpMethods.GET, path);
            expect(result).toBe(null);
        });

        it('Returns null on dynamic paths when segment length matches but no method exists', () => {
            const handler = () => {};
            const path = '/nomethod/:id';

            tree.add({
                path,
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.POST,
                name: 'post_only',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const result = tree.match(HttpMethods.GET, path);
            expect(result).toBe(null);
        });
    });

    describe('defensive checks', () => {
        describe('add', () => {
            it('Throws on invalid path', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    expect(() =>
                        tree.add({
                            path: el as string,
                            fn: () => {},
                            middleware: [],
                            timeout: null,
                            kind: 'std',
                            method: HttpMethods.GET,
                            name: 'invalid_path',
                            description: null,
                            meta: {},
                            bodyParser: null,
                        }),
                    ).toThrowError(/RouteTree@add: invalid path/);
                }

                expect(() =>
                    tree.add({
                        path: 'no-slash',
                        fn: () => {},
                        middleware: [],
                        timeout: null,
                        kind: 'std',
                        method: HttpMethods.GET,
                        name: 'no_slash',
                        description: null,
                        meta: {},
                        bodyParser: null,
                    }),
                ).toThrowError(/RouteTree@add: invalid path/);
            });

            it('Throws on invalid handler', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(() =>
                        tree.add({
                            path: '/valid',
                            fn: el as any,
                            middleware: [],
                            timeout: null,
                            kind: 'std',
                            method: HttpMethods.GET,
                            name: 'invalid_fn',
                            description: null,
                            meta: {},
                            bodyParser: null,
                        }),
                    ).toThrowError(/RouteTree@add: route\.fn must be a function/);
                }
            });

            it('Throws on invalid method', () => {
                for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'GOT', 'PAT', 'PUST', ' GET ']) {
                    expect(() =>
                        tree.add({
                            path: '/valid',
                            fn: () => {},
                            middleware: [],
                            timeout: null,
                            kind: 'std',
                            method: el as any,
                            name: 'invalid_method',
                            description: null,
                            meta: {},
                            bodyParser: null,
                        }),
                    ).toThrowError(/RouteTree@add: method is not valid/);
                }
            });
        });

        describe('addNotFound', () => {
            it('Throws on invalid path', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    expect(() =>
                        tree.addNotFound({
                            path: el as string,
                            fn: () => {},
                            middleware: [],
                            timeout: null,
                            kind: 'notfound',
                            name: 'invalid_nf_path',
                            description: null,
                            meta: {},
                            bodyParser: null,
                        }),
                    ).toThrowError(/RouteTree@addNotFound: invalid path/);
                }

                expect(() =>
                    tree.addNotFound({
                        path: 'no-slash',
                        fn: () => {},
                        middleware: [],
                        timeout: null,
                        kind: 'notfound',
                        name: 'invalid_nf_path2',
                        description: null,
                        meta: {},
                        bodyParser: null,
                    }),
                ).toThrowError(/RouteTree@addNotFound: invalid path/);
            });
        });

        describe('addError', () => {
            it('Throws on invalid path', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    expect(() =>
                        tree.addError({
                            path: el as string,
                            fn: () => {},
                            middleware: [],
                            timeout: null,
                            kind: 'error',
                            name: 'invalid_err_path',
                            description: null,
                            meta: {},
                            bodyParser: null,
                        }),
                    ).toThrowError(/RouteTree@addError: invalid path/);
                }

                expect(() =>
                    tree.addError({
                        path: 'no-slash',
                        fn: () => {},
                        middleware: [],
                        timeout: null,
                        kind: 'error',
                        name: 'invalid_err_path2',
                        description: null,
                        meta: {},
                        bodyParser: null,
                    }),
                ).toThrowError(/RouteTree@addError: invalid path/);
            });
        });
    });

    describe('performance stress', () => {
        it('Matches among 100 dynamic routes', () => {
            const start = performance.now();

            for (let i = 0; i < 100; i++) {
                tree.add({
                    path: `/bulk/${i}/:id`,
                    fn: () => {},
                    middleware: [],
                    timeout: null,
                    kind: 'std',
                    method: HttpMethods.GET,
                    name: `bulk_${i}`,
                    description: null,
                    meta: {},
                    bodyParser: null,
                });
            }

            const match = tree.match(HttpMethods.GET, '/bulk/99/abc');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({id: 'abc'});

            const end = performance.now();

            /* eslint-disable-next-line no-console */
            console.log(`Matched among 100 routes in ${(end - start).toFixed(2)}ms`);
        });

        it('Matches among 1000 dynamic routes', () => {
            const start = performance.now();

            for (let i = 0; i < 1000; i++) {
                tree.add({
                    path: `/bulk/${i}/:id`,
                    fn: () => {},
                    middleware: [],
                    timeout: null,
                    kind: 'std',
                    method: HttpMethods.GET,
                    name: `bulk_${i}`,
                    description: null,
                    meta: {},
                    bodyParser: null,
                });
            }

            const match = tree.match(HttpMethods.GET, '/bulk/999/abc');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({id: 'abc'});

            const end = performance.now();

            /* eslint-disable-next-line no-console */
            console.log(`Matched among 1000 routes in ${(end - start).toFixed(2)}ms`);
        });

        it('Matches among 10,000 dynamic routes', () => {
            const start = performance.now();

            for (let i = 0; i < 10_000; i++) {
                tree.add({
                    path: `/bulk/${i}/:id`,
                    fn: () => {},
                    middleware: [],
                    timeout: null,
                    kind: 'std',
                    method: HttpMethods.GET,
                    name: `bulk_${i}`,
                    description: null,
                    meta: {},
                    bodyParser: null,
                });
            }

            const match = tree.match(HttpMethods.GET, '/bulk/9999/abc');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({id: 'abc'});

            const end = performance.now();

            /* eslint-disable-next-line no-console */
            console.log(`Matched among 10,000 routes in ${(end - start).toFixed(2)}ms`);
        });
    });

    describe('options + cors auto-generation', () => {
        it('Auto-generates OPTIONS route with correct allow header', async () => {
            const handler = () => {};
            const corsMiddleware = (ctx: TriFrostContext) => {
                ctx.setHeader('x-cors-hit', 'true');
            };

            tree.add({
                path: '/options-test',
                fn: handler,
                middleware: [
                    {
                        name: 'Cors Middleware',
                        description: null,
                        fingerprint: Sym_TriFrostMiddlewareCors,
                        handler: corsMiddleware,
                    },
                ],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'options_test_get',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path: '/options-test',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.POST,
                name: 'options_test_post',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.OPTIONS, '/options-test');
            expect(match).not.toBe(null);
            expect(match?.route.kind).toBe('options');

            const ctx = new MockContext({method: HttpMethods.OPTIONS, path: '/options-test'});
            await match!.route.middleware[0].handler(ctx);
            await match!.route.fn(ctx);

            expect(ctx.statusCode).toBe(204);
            expect(ctx.headers.allow).toBe('OPTIONS, GET, POST');
            expect(ctx.headers.vary).toBe('Origin');
            expect(ctx.headers['x-cors-hit']).toBe('true');
        });

        it('Does not attach CORS if no underlying route has it', async () => {
            const handler = () => {};
            tree.add({
                path: '/no-cors',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'no_cors_get',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.OPTIONS, '/no-cors');
            expect(match).not.toBe(null);
            expect(match?.route.kind).toBe('options');

            const ctx = new MockContext({method: HttpMethods.OPTIONS, path: '/no-cors'});
            await match!.route.fn(ctx);

            expect(ctx.statusCode).toBe(204);
            expect(ctx.headers.allow).toBe('OPTIONS, GET');
            expect(ctx.headers['x-cors-hit']).toBeUndefined();
        });

        it('Auto-generates OPTIONS on param routes with correct methods', async () => {
            const handler = () => {};
            tree.add({
                path: '/param/:id',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'param_get',
                description: null,
                meta: {},
                bodyParser: null,
            });
            tree.add({
                path: '/param/:id',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.PUT,
                name: 'param_put',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.OPTIONS, '/param/123');
            expect(match).not.toBe(null);
            expect(match?.route.kind).toBe('options');

            const ctx = new MockContext({method: HttpMethods.OPTIONS, path: '/param/123'});
            await match!.route.fn(ctx);

            expect(ctx.statusCode).toBe(204);
            expect(ctx.headers.allow).toContain('OPTIONS');
            expect(ctx.headers.allow).toContain('GET');
            expect(ctx.headers.allow).toContain('PUT');
        });

        it('Auto-generates OPTIONS on wildcard routes', async () => {
            const handler = () => {};
            tree.add({
                path: '/wild/*',
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.POST,
                name: 'wild_post',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.OPTIONS, '/wild/anything/here');
            expect(match).not.toBe(null);
            expect(match?.route.kind).toBe('options');

            const ctx = new MockContext({method: HttpMethods.OPTIONS, path: '/wild/anything/here'});
            await match!.route.fn(ctx);

            expect(ctx.statusCode).toBe(204);
            expect(ctx.headers.allow).toContain('OPTIONS');
            expect(ctx.headers.allow).toContain('POST');
        });

        it('Does not generate OPTIONS routes in notfound trees', () => {
            tree.addNotFound({
                path: '/api/*',
                fn: () => {},
                middleware: [],
                timeout: null,
                kind: 'notfound',
                name: 'nf_api',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.matchNotFound('/api/missing');
            expect(match?.route.method).toBe('GET');

            const no_opt = tree.match(HttpMethods.OPTIONS, '/api/missing');
            expect(no_opt).toBe(null);
        });

        it('Does not generate OPTIONS routes in error trees', () => {
            tree.addError({
                path: '/error/*',
                fn: () => {},
                middleware: [],
                timeout: null,
                kind: 'error',
                name: 'err_path',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.matchError('/error/boom');
            expect(match?.route.method).toBe('GET');

            const no_opt = tree.match(HttpMethods.OPTIONS, '/error/boom');
            expect(no_opt).toBe(null);
        });

        it('Handles many methods on the same path in OPTIONS', async () => {
            const handler = () => {};
            const path = '/stress';

            const methods = [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT, HttpMethods.PATCH, HttpMethods.DELETE, HttpMethods.HEAD];

            for (const method of methods) {
                tree.add({
                    path,
                    fn: handler,
                    middleware: [],
                    timeout: null,
                    kind: 'std',
                    method,
                    name: `stress_${method}`,
                    description: null,
                    meta: {},
                    bodyParser: null,
                });
            }

            const match = tree.match(HttpMethods.OPTIONS, path);
            expect(match).not.toBe(null);
            expect(match?.route.kind).toBe('options');

            const ctx = new MockContext({method: HttpMethods.OPTIONS, path});
            await match!.route.fn(ctx);

            expect(ctx.statusCode).toBe(204);
            for (const method of methods) {
                expect(ctx.headers.allow).toContain(method);
            }
            expect(ctx.headers.allow).toContain('OPTIONS');
        });

        it('Handles duplicate methods on same path without duplicating allow header', async () => {
            const handler = () => {};
            const path = '/dup';

            /* Add GET twice (should only appear once in OPTIONS) */
            tree.add({
                path,
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'dup_get1',
                description: null,
                meta: {},
                bodyParser: null,
            });

            tree.add({
                path,
                fn: handler,
                middleware: [],
                timeout: null,
                kind: 'std',
                method: HttpMethods.GET,
                name: 'dup_get2',
                description: null,
                meta: {},
                bodyParser: null,
            });

            const match = tree.match(HttpMethods.OPTIONS, path);
            expect(match).not.toBe(null);
            expect(match?.route.kind).toBe('options');

            const ctx = new MockContext({method: HttpMethods.OPTIONS, path});
            await match!.route.fn(ctx);

            expect(ctx.statusCode).toBe(204);
            const allow = ctx.headers.allow.split(',').map(s => s.trim());
            const seen = new Set(allow);
            expect(seen.has(HttpMethods.GET)).toBe(true);
            expect(seen.has(HttpMethods.OPTIONS)).toBe(true);
            expect(allow.filter(m => m === HttpMethods.GET).length).toBe(1);
        });
    });
});
