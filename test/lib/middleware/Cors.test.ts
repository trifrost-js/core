import {isAsyncFunction} from '@valkyriestudios/utils/function/isAsync';
import {describe, it} from 'node:test';
import * as assert from 'node:assert/strict';
import {Cors} from '../../../lib/middleware/Cors';
import CONSTANTS from '../../constants';
import {MockContext} from '../../MockContext';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../../lib/types/constants';

describe('Middleware - Cors', () => {
    it('Returns a function that is non-async', () => {
        const fn = Cors();
        assert.ok(typeof fn === 'function');
        assert.ok(!isAsyncFunction(fn));
    });

    it('Returns a function with TriFrost symbols set', () => {
        const fn = Cors();
        assert.ok(Reflect.get(fn, Sym_TriFrostName), 'TriFrostCors');
        assert.ok(Reflect.get(fn, Sym_TriFrostType), 'middleware');
        assert.ok(
            Reflect.get(fn, Sym_TriFrostDescription),
            'Middleware for Cross Origin Resource Sharing'
        );
    });

    it('Sets default headers when no options provided', () => {
        const ctx = new MockContext();
        Cors()(ctx);
        assert.deepEqual(ctx.headers, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
        });
    });

    it('Sets custom static origin', () => {
        const ctx = new MockContext();
        Cors({origin: 'https://trifrost.land'})(ctx);
        assert.deepEqual(ctx.headers, {
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
        assert.deepEqual(ctx.headers, {
            Origin: 'https://foo.com',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Allow-Origin': 'https://bar.com',
        });
    });

    it('Does not set origin header if dynamic origin returns null', () => {
        const ctx = new MockContext({headers: {Origin: 'https://deny.com'}});
        Cors({origin: () => null})(ctx);
        assert.deepEqual(ctx.headers, {
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            Origin: 'https://deny.com',
        });
    });

    it('Throws if invalid method passed', () => {
        assert.throws(() => Cors({methods: ['GET', 'FOOBAR'] as any}));
    });

    it('Supports wildcard methods', () => {
        const ctx = new MockContext();
        Cors({methods: '*'})(ctx);
        assert.deepEqual(ctx.headers, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            Vary: 'Origin',
        });
    });

    it('Joins custom headers', () => {
        const ctx = new MockContext();
        Cors({headers: ['X-Custom', 'Authorization']})(ctx);
        assert.deepEqual(ctx.headers, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Allow-Headers': 'X-Custom, Authorization',
        });
    });

    it('Joins exposed headers', () => {
        const ctx = new MockContext();
        Cors({expose: ['X-Expose-This', 'X-Also-This']})(ctx);
        assert.deepEqual(ctx.headers, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Expose-Headers': 'X-Expose-This, X-Also-This',
        });
    });

    it('Sets credentials to true when specified', () => {
        const ctx = new MockContext();
        Cors({credentials: true})(ctx);
        assert.deepEqual(ctx.headers, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Allow-Credentials': 'true',
        });
    });

    it('Sets max-age if valid', () => {
        const ctx = new MockContext();
        Cors({maxage: 86400})(ctx);
        assert.deepEqual(ctx.headers, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            Vary: 'Origin',
            'Access-Control-Max-Age': '86400',
        });
    });

    it('Returns 204 status on OPTIONS method', () => {
        const ctx = new MockContext({method: 'options'});
        Cors()(ctx);
        assert.equal(ctx.$status, 204);
    });

    it('Applies all options together (maximal config)', () => {
        const ctx = new MockContext({headers: {Origin: 'https://client.com'}, method: 'get'});
        Cors({
            origin: 'https://trifrost.land',
            methods: ['GET', 'POST', 'DELETE'],
            headers: ['Authorization', 'X-Request-ID'],
            expose: ['X-Response-Time'],
            credentials: true,
            maxage: 3600,
        })(ctx);
        assert.deepEqual(ctx.headers, {
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
        assert.deepEqual(ctx.headers, {
            Vary: 'Origin',
            'Access-Control-Allow-Origin': 'https://trifrost.land',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Expose-Headers': 'X-Auth',
        });
    });

    it('Applies wildcard methods with headers and maxage', () => {
        const ctx = new MockContext();
        Cors({
            methods: '*',
            headers: ['X-Test', 'X-Another'],
            maxage: 999,
        })(ctx);
        assert.deepEqual(ctx.headers, {
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
        assert.deepEqual(ctx.headers, {
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
        assert.deepEqual(ctx.headers, {
            Vary: 'Origin',
            'Access-Control-Allow-Methods': 'GET, PUT',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': 'https://thisone.com',
        });
    });

    it('Throws on methods array containing invalid and valid entries', () => {
        assert.throws(() => {
            Cors({methods: ['GET', 'INVALID', 'POST'] as any});
        }, /Invalid method "INVALID"/);
    });

    it('Throws on methods array with all invalid values', () => {
        assert.throws(() => {
            Cors({methods: ['FOO', 'BAR'] as any});
        }, /Invalid method "FOO"/);
    });

    it('Throws when headers contain non-string values', () => {
        assert.throws(() => {
            Cors({headers: ['X-Test', ...CONSTANTS.NOT_STRING_WITH_EMPTY] as string[]});
        }, /Invalid header "/);
    });

    it('Throws when expose contains non-string values', () => {
        assert.throws(() => {
            Cors({expose: [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'X-Expose'] as string[]});
        }, /Invalid expose "/);
    });

    it('Ignores non/empty-array methods without throwing but omits header', () => {
        for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
            if (el === undefined) continue;
            const ctx = new MockContext();
            Cors({methods: el as any})(ctx);
            assert.deepEqual(ctx.headers, {
                Vary: 'Origin',
                'Access-Control-Allow-Origin': '*',
            });
        }
    });

    it('Omits allow-headers if empty or invalid header list', () => {
        const ctx = new MockContext();
        Cors({headers: []})(ctx);
        assert.ok(!('Access-Control-Allow-Headers' in ctx.headers));
    });

    it('Omits expose-headers if not valid', () => {
        const ctx = new MockContext();
        Cors({expose: []})(ctx);
        assert.ok(!('Access-Control-Expose-Headers' in ctx.headers));
    });

    it('Omits max-age if not a valid integer', () => {
        const ctx = new MockContext();
        Cors({maxage: -5})(ctx);
        assert.ok(!('Access-Control-Max-Age' in ctx.headers));
    });
});
