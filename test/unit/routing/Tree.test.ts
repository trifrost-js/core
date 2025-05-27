import {describe, it, expect, beforeEach} from 'vitest';
import {RouteTree} from '../../../lib/routing/Tree';
import {HttpMethods} from '../../../lib/types/constants';
import CONSTANTS from '../../constants';

describe('routing - Tree', () => {
    let tree: RouteTree;

    beforeEach(() => {
        tree = new RouteTree();
    });

    describe('static', () => {
        it('Adds and matches static route', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/static',
                handler: () => {},
                middleware: [],
            });

            const match = tree.match(HttpMethods.GET, '/static');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({});
        });

        it('Returns null when static route not found', () => {
            const match = tree.match(HttpMethods.GET, '/missing');
            expect(match).toBe(null);
        });

        it('Handles trailing slash as distinct static route', () => {
            const with_slash_route = {
                method: HttpMethods.GET,
                path: '/trail/',
                handler: () => {},
                middleware: [],
            };
            tree.add(with_slash_route);

            const no_slash_route = {
                method: HttpMethods.GET,
                path: '/trail',
                handler: () => {},
                middleware: [],
            };
            tree.add(no_slash_route);

            const no_slash = tree.match(HttpMethods.GET, '/trail');
            const with_slash = tree.match(HttpMethods.GET, '/trail/');

            expect(no_slash?.handler).toEqual(no_slash_route.handler);
            expect(no_slash?.middleware).toEqual(no_slash_route.middleware);

            expect(with_slash?.handler).toEqual(with_slash_route.handler);
            expect(with_slash?.middleware).toEqual(with_slash_route.middleware);
        });

        it('Matches root path', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/',
                handler: () => {},
                middleware: [],
            });

            const match = tree.match(HttpMethods.GET, '/');
            expect(match).not.toBe(null);
        });
    });

    describe('dynamic', () => {
        it('Adds and matches dynamic param route', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/user/:id',
                handler: () => {},
                middleware: [],
            });

            const match = tree.match(HttpMethods.GET, '/user/42');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({id: '42'});
        });

        it('Adds and matches wildcard route', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/wild/*',
                handler: () => {},
                middleware: [],
            });

            const match = tree.match(HttpMethods.GET, '/wild/anything/here');
            expect(match).not.toBe(null);
            expect(match?.params).toEqual({});
        });

        it('Matches multiple param route', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/team/:teamId/user/:userId',
                handler: () => {},
                middleware: [],
            });

            tree.add({
                method: HttpMethods.GET,
                path: '/files/:folder/:year/:file',
                handler: () => {},
                middleware: [],
            });

            const match = tree.match(HttpMethods.GET, '/team/7/user/88');
            expect(match?.params).toEqual({teamId: '7', userId: '88'});

            const file_match = tree.match(HttpMethods.GET, '/files/photos/2024/pic.jpg');
            expect(file_match?.params).toEqual({folder: 'photos', year: '2024', file: 'pic.jpg'});
        });

        it('Matches param + wildcard combo', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/files/:folder/:year/*',
                handler: () => {},
                middleware: [],
            });

            const match = tree.match(HttpMethods.GET, '/files/photos/2024/pic.jpg');
            expect(match?.params).toEqual({folder: 'photos', year: '2024'});
        });

        it('Matches deep wildcard chains', () => {
            const route = {
                method: HttpMethods.GET,
                path: '/wild/*',
                handler: () => {},
                middleware: [],
            };
            tree.add(route);

            const match = tree.match(HttpMethods.GET, '/wild/a/b/c/d');
            expect(match?.handler).toEqual(route.handler);
            expect(match?.middleware).toEqual(route.middleware);
        });

        it('Does not match wildcard chain on other methods', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/wild/*',
                handler: () => {},
                middleware: [],
            });

            expect(tree.match(HttpMethods.POST, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.PUT, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.PATCH, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.DELETE, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.HEAD, '/wild/a/b/c/d')).toBe(null);
            expect(tree.match(HttpMethods.OPTIONS, '/wild/a/b/c/d')).toBe(null);
        });

        it('Does not leak params across routes', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/first/:id',
                handler: () => {},
                middleware: [],
            });

            tree.add({
                method: HttpMethods.GET,
                path: '/second/:name',
                handler: () => {},
                middleware: [],
            });

            const first = tree.match(HttpMethods.GET, '/first/1');
            const second = tree.match(HttpMethods.GET, '/second/abc');

            expect(first?.params).toEqual({id: '1'});
            expect(second?.params).toEqual({name: 'abc'});
        });

        it('Correctly matches across methods', () => {
            const get_route = {
                method: HttpMethods.GET,
                path: '/first/:id',
                handler: () => {},
                middleware: [],
            };
            
            const post_route = {
                method: HttpMethods.POST,
                path: '/first/:id',
                handler: () => {},
                middleware: [],
            };
            tree.add(get_route);
            tree.add(post_route);

            const get = tree.match(HttpMethods.GET, '/first/1');
            const post = tree.match(HttpMethods.POST, '/first/abc');

            expect(get?.handler).toEqual(get_route.handler);
            expect(get?.middleware).toEqual(get_route.middleware);
            expect(get?.params).toEqual({id: '1'});
            expect(post?.handler).toEqual(post_route.handler);
            expect(post?.middleware).toEqual(post_route.middleware);
            expect(post?.params).toEqual({id: 'abc'});
        });

        it('Returns null when dynamic route not found', () => {
            const match = tree.match(HttpMethods.GET, '/user');
            expect(match).toBe(null);
        });
    });

    describe('notfound', () => {
        it('Adds and matches notfound wildcard handler', () => {
            tree.addNotFound({
                path: '/api/*',
                handler: () => {},
                middleware: [],
            });

            const match = tree.matchNotFound('/api/missing/endpoint');
            expect(match).not.toBe(null);
        });

        it('Matches nested notfound fallback', () => {
            tree.addNotFound({
                path: '/nested/*',
                handler: () => {},
                middleware: [],
            });

            const match = tree.matchNotFound('/nested/deeper/path');
            expect(match).not.toBe(null);
        });

        it('Returns null when no notfound handler matches', () => {
            const match = tree.matchNotFound('/random/path');
            expect(match).toBe(null);
        });
    });

    describe('error', () => {
        it('Adds and matches error wildcard handler', () => {
            tree.addError({
                path: '/server/*',
                handler: () => {},
                middleware: [],
            });

            const match = tree.matchError('/server/boom');
            expect(match).not.toBe(null);
        });

        it('Matches specific error fallback', () => {
            tree.addError({
                path: '/failures/*',
                handler: () => {},
                middleware: [],
            });

            const match = tree.matchError('/failures/deep/error');
            expect(match).not.toBe(null);
        });

        it('Returns null when no error handler matches', () => {
            const match = tree.matchError('/ok/path');
            expect(match).toBe(null);
        });
    });

    describe('reset()', () => {
        it('Resets all registered routes', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/wipe',
                handler: () => {},
                middleware: [],
            });

            tree.addNotFound({
                path: '/wipe/*',
                handler: () => {},
                middleware: [],
            });

            tree.addError({
                path: '/wipe/*',
                handler: () => {},
                middleware: [],
            });

            expect(tree.match(HttpMethods.GET, '/wipe')).not.toBe(null);
            expect(tree.matchNotFound('/wipe/abc')).not.toBe(null);
            expect(tree.matchError('/wipe/abc')).not.toBe(null);

            tree.reset();

            expect(tree.match(HttpMethods.GET, '/wipe')).toBe(null);
            expect(tree.matchNotFound('/wipe/abc')).toBe(null);
            expect(tree.matchError('/wipe/abc')).toBe(null);
        });
    });

    describe('edge cases', () => {
        it('Matches empty path "" as root', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/',
                handler: () => {},
                middleware: [],
            });
    
            const match = tree.match(HttpMethods.GET, '');
            expect(match).not.toBe(null);
        });
    
        it('Handles multiple consecutive slashes', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/multi/slash',
                handler: () => {},
                middleware: [],
            });
    
            const match = tree.match(HttpMethods.GET, '/multi//slash///');
            expect(match).toBe(null);
        });
    
        it('Matches percent-encoded segments', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/file/space%20here',
                handler: () => {},
                middleware: [],
            });
    
            const match = tree.match(HttpMethods.GET, '/file/space%20here');
            expect(match).not.toBe(null);
        });
    
        it('Handles non-ASCII segments', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/emoji/💥/🔥',
                handler: () => {},
                middleware: [],
            });
    
            const match = tree.match(HttpMethods.GET, '/emoji/💥/🔥');
            expect(match).not.toBe(null);
        });
    
        it('Captures many params correctly', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/a/:p1/b/:p2/c/:p3/d/:p4/e/:p5',
                handler: () => {},
                middleware: [],
            });
    
            const match = tree.match(HttpMethods.GET, '/a/1/b/2/c/3/d/4/e/5');
            expect(match?.params).toEqual({
                p1: '1',
                p2: '2',
                p3: '3',
                p4: '4',
                p5: '5',
            });
        });
    
        it('Handles overlapping routes', () => {
            const staticHandler = () => {};
            const paramHandler = () => {};
            const wildcardHandler = () => {};
    
            tree.add({
                method: HttpMethods.GET,
                path: '/foo/bar',
                handler: staticHandler,
                middleware: [],
            });
    
            tree.add({
                method: HttpMethods.GET,
                path: '/foo/:param',
                handler: paramHandler,
                middleware: [],
            });
    
            tree.add({
                method: HttpMethods.GET,
                path: '/foo/*',
                handler: wildcardHandler,
                middleware: [],
            });
    
            const staticMatch = tree.match(HttpMethods.GET, '/foo/bar');
            const paramMatch = tree.match(HttpMethods.GET, '/foo/value');
            const wildcardMatch = tree.match(HttpMethods.GET, '/foo/extra/path');
    
            expect(staticMatch?.handler).toBe(staticHandler);
            expect(paramMatch?.handler).toBe(paramHandler);
            expect(wildcardMatch?.handler).toBe(wildcardHandler);
        });
    
        it('Matches deep wildcard chains', () => {
            tree.add({
                method: HttpMethods.GET,
                path: '/wild/*',
                handler: () => {},
                middleware: [],
            });
    
            const match = tree.match(HttpMethods.GET, '/wild/a/b/c/d/e/f/g/h/i');
            expect(match).not.toBe(null);
        });
    
        it('Returns correct middleware stack', () => {
            const mw1 = () => {};
            const mw2 = () => {};
    
            tree.add({
                method: HttpMethods.GET,
                path: '/with/mw',
                handler: () => {},
                middleware: [mw1, mw2],
            });
    
            const match = tree.match(HttpMethods.GET, '/with/mw');
            expect(match?.middleware).toEqual([mw1, mw2]);
        });

        it('Prioritizes static over param (param shadowing)', () => {
            const staticHandler = () => {};
            const paramHandler = () => {};
    
            tree.add({
                method: HttpMethods.GET,
                path: '/shadow/static',
                handler: staticHandler,
                middleware: [],
            });
    
            tree.add({
                method: HttpMethods.GET,
                path: '/shadow/:param',
                handler: paramHandler,
                middleware: [],
            });
    
            const staticMatch = tree.match(HttpMethods.GET, '/shadow/static');
            const paramMatch = tree.match(HttpMethods.GET, '/shadow/value');
    
            expect(staticMatch?.handler).toBe(staticHandler);
            expect(paramMatch?.handler).toBe(paramHandler);
            expect(paramMatch?.params).toEqual({param: 'value'});
        });

        it('Normalizes trailing slashes', () => {
            const handler = () => {};
            tree.add({
                method: HttpMethods.GET,
                path: '/normalize/slash',
                handler,
                middleware: [],
            });
    
            const matchWith = tree.match(HttpMethods.GET, '/normalize/slash/');
            const matchWithout = tree.match(HttpMethods.GET, '/normalize/slash');
    
            expect(matchWith).toBe(null);
            expect(matchWithout?.handler).toBe(handler);
        });
    
        it('Rejects double slashes internally', () => {
            const handler = () => {};
            tree.add({
                method: HttpMethods.GET,
                path: '/double/slash',
                handler,
                middleware: [],
            });
    
            const match = tree.match(HttpMethods.GET, '/double//slash');
            expect(match).toBe(null);
        });

        it('Matches most specific notfound wildcard', () => {
            const outerHandler = () => {};
            const innerHandler = () => {};
    
            tree.addNotFound({
                path: '/api/*',
                handler: outerHandler,
                middleware: [],
            });
    
            tree.addNotFound({
                path: '/api/v2/*',
                handler: innerHandler,
                middleware: [],
            });
    
            const matchOuter = tree.matchNotFound('/api/unknown');
            const matchInner = tree.matchNotFound('/api/v2/unknown');
    
            expect(matchOuter?.handler).toBe(outerHandler);
            expect(matchInner?.handler).toBe(innerHandler);
        });
    
        it('Handles error routes with multiple wildcards', () => {
            const generalErrorHandler = () => {};
            const specificErrorHandler = () => {};
    
            tree.addError({
                path: '/error/*',
                handler: generalErrorHandler,
                middleware: [],
            });
    
            tree.addError({
                path: '/error/critical/*',
                handler: specificErrorHandler,
                middleware: [],
            });
    
            const generalMatch = tree.matchError('/error/timeout');
            const specificMatch = tree.matchError('/error/critical/failure');
    
            expect(generalMatch?.handler).toBe(generalErrorHandler);
            expect(specificMatch?.handler).toBe(specificErrorHandler);
        });
    
        it('Returns null when no notfound or error handler matches', () => {
            const nfMatch = tree.matchNotFound('/no/match');
            const errMatch = tree.matchError('/no/match');
            expect(nfMatch).toBe(null);
            expect(errMatch).toBe(null);
        });
    });

    describe('defensive checks', () => {
        describe('add', () => {
            it('Throws on invalid path', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    expect(() => tree.add({
                        method: HttpMethods.GET,
                        path: el as string,
                        handler: () => {},
                        middleware: [],
                    })).toThrowError(/RouteTree@add: invalid path/);
                }
        
                expect(() => tree.add({
                    method: HttpMethods.GET,
                    path: 'no-slash',
                    handler: () => {},
                    middleware: [],
                })).toThrowError(/RouteTree@add: invalid path/);
            });
        
            it('Throws on invalid handler', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(() => tree.add({
                        method: HttpMethods.GET,
                        path: '/valid',
                        handler: el as any,
                        middleware: [],
                    })).toThrowError(/RouteTree@add: handler must be a function/);
                }
            });
        
            it('Throws on invalid middleware', () => {
                for (const el of CONSTANTS.NOT_ARRAY) {
                    expect(() => tree.add({
                        method: HttpMethods.GET,
                        path: '/valid',
                        handler: () => {},
                        middleware: el as any,
                    })).toThrowError(/RouteTree@add: middleware must be an array/);
                }
            });
        
            it('Throws on invalid method', () => {
                for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'GOT', 'PAT', 'PUST', ' GET ']) {
                    expect(() => tree.add({
                        method: el as any,
                        path: '/valid',
                        handler: () => {},
                        middleware: [],
                    })).toThrowError(/RouteTree@add: method is not valid/);
                }
            });
        });
    
        describe('addNotFound', () => {
            it('Throws on invalid path', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    expect(() => tree.addNotFound({
                        path: el as string,
                        handler: () => {},
                        middleware: [],
                    })).toThrowError(/RouteTree@addNotFound: invalid path/);
                }
        
                expect(() => tree.addNotFound({
                    path: 'no-slash',
                    handler: () => {},
                    middleware: [],
                })).toThrowError(/RouteTree@addNotFound: invalid path/);
            });
        
            it('Throws on invalid handler', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(() => tree.addNotFound({
                        path: '/valid',
                        handler: el as any,
                        middleware: [],
                    })).toThrowError(/RouteTree@addNotFound: handler must be a function/);
                }
            });
        
            it('Throws on invalid middleware', () => {
                for (const el of CONSTANTS.NOT_ARRAY) {
                    expect(() => tree.addNotFound({
                        path: '/valid',
                        handler: () => {},
                        middleware: el as any,
                    })).toThrowError(/RouteTree@addNotFound: middleware must be an array/);
                }
            });
        });

        describe('addError', () => {
            it('Throws on invalid path', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    expect(() => tree.addError({
                        path: el as string,
                        handler: () => {},
                        middleware: [],
                    })).toThrowError(/RouteTree@addError: invalid path/);
                }
        
                expect(() => tree.addError({
                    path: 'no-slash',
                    handler: () => {},
                    middleware: [],
                })).toThrowError(/RouteTree@addError: invalid path/);
            });
        
            it('Throws on invalid handler', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(() => tree.addError({
                        path: '/valid',
                        handler: el as any,
                        middleware: [],
                    })).toThrowError(/RouteTree@addError: handler must be a function/);
                }
            });
        
            it('Throws on invalid middleware', () => {
                for (const el of CONSTANTS.NOT_ARRAY) {
                    expect(() => tree.addError({
                        path: '/valid',
                        handler: () => {},
                        middleware: el as any,
                    })).toThrowError(/RouteTree@addError: middleware must be an array/);
                }
            });
        });
    });    
    
    describe('performance stress', () => {
        it('Matches among 100 dynamic routes', () => {
            const start = performance.now();
    
            for (let i = 0; i < 100; i++) {
                tree.add({
                    method: HttpMethods.GET,
                    path: `/bulk/${i}/:id`,
                    handler: () => {},
                    middleware: [],
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
                    method: HttpMethods.GET,
                    path: `/bulk/${i}/:id`,
                    handler: () => {},
                    middleware: [],
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
                    method: HttpMethods.GET,
                    path: `/bulk/${i}/:id`,
                    handler: () => {},
                    middleware: [],
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
});
