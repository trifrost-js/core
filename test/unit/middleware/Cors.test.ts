/* eslint-disable max-statements */
import {isAsyncFn} from '@valkyriestudios/utils/function';
import {describe, it, expect} from 'vitest';
import {Cors, Sym_TriFrostMiddlewareCors} from '../../../lib/middleware/Cors';
import CONSTANTS from '../../constants';
import {MockContext} from '../../MockContext';
import {
    HttpMethods,
    Sym_TriFrostDescription,
    Sym_TriFrostName,
    Sym_TriFrostFingerPrint,
} from '../../../lib/types/constants';

describe('Middleware - Cors', () => {
    it('Returns a function that is non-async', () => {
        const fn = Cors();
        expect(typeof fn).toBe('function');
        expect(isAsyncFn(fn)).toBe(false);
    });

    it('Returns a function with TriFrost symbols set', () => {
        const fn = Cors();
        expect(Reflect.get(fn, Sym_TriFrostName)).toBe('TriFrostCors');
        expect(Reflect.get(fn, Sym_TriFrostDescription)).toBe('Middleware for Cross Origin Resource Sharing');
    });

    it('Sets a specific symbol marker to identify TriFrost cors', () => {
        const fn = Cors();
        expect(Reflect.get(fn, Sym_TriFrostFingerPrint)).toBe(Sym_TriFrostMiddlewareCors);
    });

    it('Sets default headers when no options provided', () => {
        const ctx = new MockContext();
        Cors()(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
        });
    });

    it('Sets default headers when invalid options provided', () => {
        const ctx = new MockContext();
        /* @ts-ignore */
        Cors('bla')(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
        });
    });

    it('Skips defaults when use_defaults is false', () => {
        const ctx = new MockContext();
        Cors({origin: '*'}, {use_defaults: false})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            Vary: 'Origin',
        });
    });

    it('Sets only vary header when invalid options provided and use_defaults is false', () => {
        const ctx = new MockContext();
        /* @ts-ignore */
        Cors('bla', {use_defaults: false})(ctx);
        expect(ctx.headers).toEqual({Vary: 'Origin'});
    });

    it('Sets custom static origin', () => {
        const ctx = new MockContext();
        Cors({origin: 'https://trifrost.land'})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Allow-Origin': 'https://trifrost.land',
        });
    });

    it('Sets dynamic origin if function returns non-null', () => {
        const ctx = new MockContext({headers: {Origin: 'https://foo.com'}});
        Cors({origin: el => {
            if (el === 'https://foo.com') return 'https://bar.com';
            return null;
        }})(ctx);
        expect(ctx.headers).toEqual({
            Origin: 'https://foo.com',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Allow-Origin': 'https://bar.com',
        });
    });

    it('Does not set origin header if dynamic origin returns null', () => {
        const ctx = new MockContext({headers: {Origin: 'https://deny.com'}});
        Cors({origin: () => null})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            Origin: 'https://deny.com',
        });
    });

    it('Throws if invalid method passed', () => {
        expect(() => Cors({methods: ['GET', 'FOOBAR'] as any})).toThrow();
    });

    it('Supports wildcard methods', () => {
        const ctx = new MockContext();
        Cors({methods: '*'})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            Vary: 'Origin',
        });
    });

    it('Joins custom headers', () => {
        const ctx = new MockContext();
        Cors({headers: ['X-Custom', 'Authorization']})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Allow-Headers': 'X-Custom, Authorization',
        });
    });

    it('Joins exposed headers', () => {
        const ctx = new MockContext();
        Cors({expose: ['X-Expose-This', 'X-Also-This']})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Expose-Headers': 'X-Expose-This, X-Also-This',
        });
    });

    it('Sets credentials to true when specified', () => {
        const ctx = new MockContext();
        Cors({credentials: true})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Allow-Credentials': 'true',
        });
    });

    it('Sets max-age if valid', () => {
        const ctx = new MockContext();
        Cors({maxage: 86400})(ctx);
        expect(ctx.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Max-Age': '86400',
        });
    });

    it('Returns 204 status on OPTIONS method', () => {
        const ctx = new MockContext({method: HttpMethods.OPTIONS});
        Cors()(ctx);
        expect(ctx.$status).toBe(204);
    });

    it('Applies all options together (maximal config)', () => {
        const ctx = new MockContext({headers: {Origin: 'https://client.com'}, method: HttpMethods.GET});
        Cors({
            origin: 'https://trifrost.land',
            methods: ['GET', 'POST', 'DELETE'],
            headers: ['Authorization', 'X-Request-ID'],
            expose: ['X-Response-Time'],
            credentials: true,
            maxage: 3600,
        })(ctx);
        expect(ctx.headers).toEqual({
            Vary: 'Origin',
            'Access-Control-Allow-Origin': 'https://trifrost.land',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE',
            'Access-Control-Allow-Headers': 'Authorization, X-Request-ID',
            'Access-Control-Expose-Headers': 'X-Response-Time',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '3600',
            Origin: 'https://client.com',
        });
    });

    it('Applies origin + credentials + expose only', () => {
        const ctx = new MockContext();
        Cors({
            origin: 'https://trifrost.land',
            credentials: true,
            expose: ['X-Auth'],
        })(ctx);
        expect(ctx.headers).toEqual({
            Vary: 'Origin',
            'Access-Control-Allow-Origin': 'https://trifrost.land',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Expose-Headers': 'X-Auth',
        });
    });

    it('Applies origin as string array and matches allowed origin', () => {
        const ctx = new MockContext({headers: {Origin: 'https://site1.com'}});
        Cors({
            origin: ['https://site1.com', 'https://site2.com'],
        })(ctx);
        expect(ctx.headers).toEqual({
            Origin: 'https://site1.com',
            Vary: 'Origin',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            'Access-Control-Allow-Origin': 'https://site1.com',
        });
    });

    it('Applies origin as string array and ignores disallowed origin', () => {
        const ctx = new MockContext({headers: {Origin: 'https://unknown.com'}});
        Cors({
            origin: ['https://site1.com', 'https://site2.com'],
        })(ctx);
        expect(ctx.headers).toEqual({
            Origin: 'https://unknown.com',
            Vary: 'Origin',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
        });
    });

    it('Throws if provided an invalid origin array', () => {
        expect(() => Cors({
            origin: [...CONSTANTS.NOT_STRING_WITH_EMPTY] as string[],
        })).toThrow();
    });

    it('Applies wildcard methods with headers and maxage', () => {
        const ctx = new MockContext();
        Cors({
            methods: '*',
            headers: ['X-Test', 'X-Another'],
            maxage: 999,
        })(ctx);
        expect(ctx.headers).toEqual({
            Vary: 'Origin',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': 'X-Test, X-Another',
            'Access-Control-Max-Age': '999',
        });
    });

    it('Dynamic origin with credentials and methods', () => {
        const ctx = new MockContext({headers: {Origin: 'https://trusted.com'}});
        Cors({
            origin: el => {
                if (el === 'https://trusted.com') return 'https://allowed.com';
                return null;
            },
            credentials: true,
            methods: ['GET', 'PUT'],
        })(ctx);
        expect(ctx.headers).toEqual({
            Origin: 'https://trusted.com',
            Vary: 'Origin',
            'Access-Control-Allow-Methods': 'GET, PUT',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': 'https://allowed.com',
        });
    });

    it('Dynamic origin with credentials and methods with no Origin on headers', () => {
        const ctx = new MockContext();
        Cors({
            origin: el => {
                if (el === 'https://trusted.com') return 'https://allowed.com';
                return 'https://thisone.com';
            },
            credentials: true,
            methods: ['GET', 'PUT'],
        })(ctx);
        expect(ctx.headers).toEqual({
            Vary: 'Origin',
            'Access-Control-Allow-Methods': 'GET, PUT',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': 'https://thisone.com',
        });
    });

    it('Throws on methods array containing invalid and valid entries', () => {
        expect(() => {
            Cors({methods: ['GET', 'INVALID', 'POST'] as any});
        }).toThrow(/Invalid method "INVALID"/);
    });

    it('Throws on methods array with all invalid values', () => {
        expect(() => {
            Cors({methods: ['FOO', 'BAR'] as any});
        }).toThrow(/Invalid method "FOO"/);
    });

    it('Throws when headers contain non-string values', () => {
        expect(() => {
            Cors({headers: ['X-Test', ...CONSTANTS.NOT_STRING_WITH_EMPTY] as string[]});
        }).toThrow(/Invalid header "/);
    });

    it('Throws when expose contains non-string values', () => {
        expect(() => {
            Cors({expose: [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'X-Expose'] as string[]});
        }).toThrow(/Invalid expose "/);
    });

    it('Ignores non/empty-array methods without throwing but omits header', () => {
        for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
            if (el === undefined) continue;
            const ctx = new MockContext();
            Cors({methods: el as any})(ctx);
            expect(ctx.headers).toEqual({
                Vary: 'Origin',
                'Access-Control-Allow-Origin': '*',
            });
        }
    });

    it('Omits allow-headers if empty or invalid header list', () => {
        const ctx = new MockContext();
        Cors({headers: []})(ctx);
        expect('Access-Control-Allow-Headers' in ctx.headers).toBe(false);
    });

    it('Omits expose-headers if not valid', () => {
        const ctx = new MockContext();
        Cors({expose: []})(ctx);
        expect('Access-Control-Expose-Headers' in ctx.headers).toBe(false);
    });

    it('Omits max-age if not a valid integer', () => {
        const ctx = new MockContext();
        Cors({maxage: -5})(ctx);
        expect('Access-Control-Max-Age' in ctx.headers).toBe(false);
    });
});
