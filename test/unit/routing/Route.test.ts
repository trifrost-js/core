import {describe, it, expect, vi} from 'vitest';
import {Route} from '../../../lib/routing/Route';
import {HttpMethods} from '../../../lib/types/constants';
import {TriFrostRateLimit} from '../../../lib/modules/RateLimit/_RateLimit';
import {type TriFrostRouteHandler} from '../../../lib/types/routing';
import CONSTANTS from '../../constants';

describe('routing - Route', () => {
    const dummyHandler = vi.fn();
    const dummyMiddleware = vi.fn();

    describe('.use()', () => {
        it('Attaches middleware', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            route.use(dummyMiddleware);
            route.get(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.GET],
                    middleware: [dummyMiddleware],
                },
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.HEAD],
                    middleware: [dummyMiddleware],
                },
            ]);
        });

        it('Chains multiple middleware correctly', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const route = new Route({rateLimit: null, bodyParser: null});
            route.use(m1).use(m2).get(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.GET],
                    middleware: [m1, m2],
                },
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.HEAD],
                    middleware: [m1, m2],
                },
            ]);
        });

        it('Throws if use() called with non-function', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            for (const el of CONSTANTS.NOT_FUNCTION) {
                expect(() => route.use(el as any)).toThrowError(/TriFrostRoute@use: Handler is expected/);
            }
            expect(route.stack).toEqual([]);
        });
    });

    describe('.limit()', () => {
        it('Throws if rateLimit not configured', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            expect(() => route.limit(5)).toThrow(/TriFrostRoute@limit: RateLimit is not configured on App/);
            expect(route.stack).toEqual([]);
        });

        it('Throws if invalid limit is passed', () => {
            const limitMock = vi.fn().mockReturnValue(dummyMiddleware);
            const rateLimitMock = {limit: limitMock};

            const route = new Route({
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit,
                bodyParser: null,
            });
            for (const el of [...CONSTANTS.NOT_FUNCTION, ...CONSTANTS.NOT_INTEGER, 0, -10, 10.5]) {
                if ((Number.isInteger(el) && (el as number) > 0) || typeof el === 'function') continue;
                expect(() => route.limit(el as any)).toThrow(/TriFrostRoute@limit: Invalid limit/);
            }
            expect(route.stack).toEqual([]);
        });

        it('Adds rate-limit middleware when configured', () => {
            const limitMock = vi.fn().mockReturnValue(dummyMiddleware);
            const rateLimitMock = {limit: limitMock};

            const route = new Route({
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit,
                bodyParser: null,
            });
            route.limit(10);
            route.get(dummyHandler);
            expect(limitMock).toHaveBeenCalledWith(10);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.GET],
                    middleware: [dummyMiddleware],
                },
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.HEAD],
                    middleware: [dummyMiddleware],
                },
            ]);
        });
    });

    describe('.bodyParser()', () => {
        it('Allows setting a valid body parser object', () => {
            const bodyParserMock = {limit: 10_000, form: {limit: 200_000}};
            const route = new Route({rateLimit: null, bodyParser: null});
            route.bodyParser(bodyParserMock);
            route.post(dummyHandler);

            expect(route.stack).toEqual([
                {
                    bodyParser: bodyParserMock,
                    handler: dummyHandler,
                    methods: [HttpMethods.POST],
                    middleware: [],
                },
            ]);
        });

        it('Allows explicitly setting null (disabling body parser)', () => {
            const route = new Route({rateLimit: null, bodyParser: {limit: 10_000, form: {limit: 200_000}}});
            route.bodyParser(null);
            route.post(dummyHandler);

            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.POST],
                    middleware: [],
                },
            ]);
        });

        it('Throws on invalid bodyParser input', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === null) continue;
                expect(() => route.bodyParser(el as any)).toThrowError(/TriFrostRoute@bodyParser: Invalid bodyparser/);
            }
        });

        it('Correctly maintains per-method parser config', () => {
            const bp1 = {limit: 100_000};
            const bp2 = {limit: 200_000};
            const route = new Route({rateLimit: null, bodyParser: null});
            route.bodyParser(bp1).get(dummyHandler);
            route.bodyParser(bp2).post(dummyHandler);

            expect(route.stack).toEqual([
                {
                    bodyParser: bp1,
                    handler: dummyHandler,
                    methods: [HttpMethods.GET],
                    middleware: [],
                },
                {
                    bodyParser: bp1,
                    handler: dummyHandler,
                    methods: [HttpMethods.HEAD],
                    middleware: [],
                },
                {
                    bodyParser: bp2,
                    handler: dummyHandler,
                    methods: [HttpMethods.POST],
                    middleware: [],
                },
            ]);
        });
    });

    describe('.get()', () => {
        it('Throws and does not register if passed an invalid handler', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            for (const el of [...CONSTANTS.NOT_FUNCTION, ...[...CONSTANTS.NOT_FUNCTION.map(val => ({fn: val}))]]) {
                expect(() => route.get(el as TriFrostRouteHandler<any>)).toThrowError(/TriFrostRoute@get: Invalid handler/);
            }

            expect(route.stack).toEqual([]);
        });

        it('Registers GET and HEAD', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            route.get(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.GET],
                    middleware: [],
                },
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.HEAD],
                    middleware: [],
                },
            ]);
        });
    });

    describe('.post()', () => {
        it('Throws and does not register if passed an invalid handler', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            for (const el of [...CONSTANTS.NOT_FUNCTION, ...[...CONSTANTS.NOT_FUNCTION.map(val => ({fn: val}))]]) {
                expect(() => route.post(el as TriFrostRouteHandler<any>)).toThrowError(/TriFrostRoute@post: Invalid handler/);
            }

            expect(route.stack).toEqual([]);
        });

        it('Registers POST', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            route.post(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.POST],
                    middleware: [],
                },
            ]);
        });
    });

    describe('.put()', () => {
        it('Throws and does not register if passed an invalid handler', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            for (const el of [...CONSTANTS.NOT_FUNCTION, ...[...CONSTANTS.NOT_FUNCTION.map(val => ({fn: val}))]]) {
                expect(() => route.put(el as TriFrostRouteHandler<any>)).toThrowError(/TriFrostRoute@put: Invalid handler/);
            }

            expect(route.stack).toEqual([]);
        });

        it('Registers PUT', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            route.put(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.PUT],
                    middleware: [],
                },
            ]);
        });
    });

    describe('.patch()', () => {
        it('Throws and does not register if passed an invalid handler', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            for (const el of [...CONSTANTS.NOT_FUNCTION, ...[...CONSTANTS.NOT_FUNCTION.map(val => ({fn: val}))]]) {
                expect(() => route.patch(el as TriFrostRouteHandler<any>)).toThrowError(/TriFrostRoute@patch: Invalid handler/);
            }

            expect(route.stack).toEqual([]);
        });

        it('Registers PATCH', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            route.patch(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.PATCH],
                    middleware: [],
                },
            ]);
        });
    });

    describe('.del()', () => {
        it('Throws and does not register if passed an invalid handler', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            for (const el of [...CONSTANTS.NOT_FUNCTION, ...[...CONSTANTS.NOT_FUNCTION.map(val => ({fn: val}))]]) {
                expect(() => route.del(el as TriFrostRouteHandler<any>)).toThrowError(/TriFrostRoute@del: Invalid handler/);
            }

            expect(route.stack).toEqual([]);
        });

        it('Registers DELETE', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            route.del(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.DELETE],
                    middleware: [],
                },
            ]);
        });
    });

    describe('behavioral', () => {
        it('Handles no handlers at all', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            expect(route.stack).toEqual([]);
        });

        it('Handles no handlers at all with middleware', () => {
            const route = new Route({rateLimit: null, bodyParser: null});
            route.use(dummyMiddleware);
            expect(route.stack).toEqual([]);
        });

        it('Handles multiple verbs and layered middleware', () => {
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            const route = new Route({rateLimit: null, bodyParser: null});
            route.use(m1).use(m2);
            route.get(handler1);
            route.post(handler2);

            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: handler1,
                    methods: [HttpMethods.GET],
                    middleware: [m1, m2],
                },
                {
                    bodyParser: null,
                    handler: handler1,
                    methods: [HttpMethods.HEAD],
                    middleware: [m1, m2],
                },
                {
                    bodyParser: null,
                    handler: handler2,
                    methods: [HttpMethods.POST],
                    middleware: [m1, m2],
                },
            ]);
        });

        it('Handles duplicate verbs correctly', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            const route = new Route({rateLimit: null, bodyParser: null});
            route.get(handler1);
            route.get(handler2);

            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: handler2,
                    methods: [HttpMethods.GET],
                    middleware: [],
                },
                {
                    bodyParser: null,
                    handler: handler2,
                    methods: [HttpMethods.HEAD],
                    middleware: [],
                },
            ]);
        });

        it('Handles middleware type widening with use<>()', () => {
            const m1 = vi.fn();
            const route = new Route<{}, {test?: boolean}>({rateLimit: null, bodyParser: null});
            const widened = route.use<{extra: string}>(m1);
            widened.get(dummyHandler);
            expect(widened.stack[0]?.middleware).toContain(m1);
        });

        it('Handles chaining .use() + .limit()', () => {
            const m1 = vi.fn();
            const limitMock = vi.fn().mockReturnValue(dummyMiddleware);
            const rateLimitMock = {limit: limitMock};

            const route = new Route({
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit,
                bodyParser: null,
            });
            route.use(m1).limit(5).get(dummyHandler);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.GET],
                    middleware: [m1, dummyMiddleware],
                },
                {
                    bodyParser: null,
                    handler: dummyHandler,
                    methods: [HttpMethods.HEAD],
                    middleware: [m1, dummyMiddleware],
                },
            ]);
        });

        it('Handles chaining .use() + .limit() across multiple methods', () => {
            const limitMock = vi.fn().mockReturnValue(dummyMiddleware);
            const rateLimitMock = {limit: limitMock};
            const m1 = vi.fn();
            const m2 = vi.fn();
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            const route = new Route({
                rateLimit: rateLimitMock as unknown as TriFrostRateLimit,
                bodyParser: null,
            });
            route.use(m1).limit(5).get(handler1).use(m2).post(handler2);
            expect(route.stack).toEqual([
                {
                    bodyParser: null,
                    handler: handler1,
                    methods: [HttpMethods.GET],
                    middleware: [m1, dummyMiddleware],
                },
                {
                    bodyParser: null,
                    handler: handler1,
                    methods: [HttpMethods.HEAD],
                    middleware: [m1, dummyMiddleware],
                },
                {
                    bodyParser: null,
                    handler: handler2,
                    methods: [HttpMethods.POST],
                    middleware: [m1, dummyMiddleware, m2],
                },
            ]);
        });
    });
});
