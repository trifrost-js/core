import {describe, it, expect} from 'vitest';
import {Router} from '../../../lib/routing/Router';
import {RouteTree} from '../../../lib/routing/Tree';
import {TriFrostRateLimit} from '../../../lib/modules/RateLimit/_RateLimit';
import {TriFrostMiddleware} from '../../../lib/types/routing';
import CONSTANTS from '../../constants';

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
});
