import {describe, it, expect, vi} from 'vitest';
import {BasicAuth, Sym_TriFrostMiddlewareBasicAuth} from '../../../../lib/middleware/Auth/Basic';
import {Sym_TriFrostMiddlewareAuth} from '../../../../lib/middleware/Auth/types';
import {MockContext} from '../../../MockContext';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostFingerPrint} from '../../../../lib/types/constants';
import CONSTANTS from '../../../constants';

const makeCtx = (authHeader?: string) =>
    new MockContext({
        headers: authHeader ? {authorization: authHeader} : {},
    });

describe('Middleware - Auth - Basic', () => {
    it('Throws if validate is not provided or invalid', () => {
        for (const el of CONSTANTS.NOT_FUNCTION) {
            expect(() => BasicAuth({validate: el as any})).toThrowError(
                /TriFrostMiddleware@BasicAuth: A validate function must be provided/,
            );
        }
    });

    it('Uses default realm if none or invalid provided', async () => {
        for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
            const ctx = makeCtx();
            const mw = BasicAuth({realm: el as string, validate: vi.fn()});
            await mw(ctx);
            expect(ctx.headers['www-authenticate']).toBe('Basic realm="Restricted Area"');
            expect(ctx.$status).toBe(401);
        }
    });

    it('Uses custom realm if provided', async () => {
        const ctx = makeCtx();
        const mw = BasicAuth({realm: 'MyRealm', validate: vi.fn()});
        await mw(ctx);
        expect(ctx.headers['www-authenticate']).toBe('Basic realm="MyRealm"');
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if no Authorization header', async () => {
        const ctx = makeCtx();
        const mw = BasicAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if Authorization header is not Basic', async () => {
        const ctx = makeCtx('Bearer sometoken');
        const mw = BasicAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if Authorization header is simply the token', async () => {
        const ctx = makeCtx('sometoken');
        const mw = BasicAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if base64 is malformed', async () => {
        const ctx = makeCtx('Basic malformed');
        const mw = BasicAuth({validate: vi.fn()});
        global.atob = vi.fn(() => {
            throw new Error('bad base64');
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if decoded string has no colon', async () => {
        global.atob = vi.fn(() => 'nocolonhere');
        const ctx = makeCtx('Basic anything');
        const mw = BasicAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if validate returns false', async () => {
        global.atob = vi.fn(() => 'user:pass');
        const ctx = makeCtx('Basic anybase64');
        const validate = vi.fn().mockResolvedValue(false);
        const mw = BasicAuth({validate});
        await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, {user: 'user', pass: 'pass'});
        expect(ctx.$status).toBe(401);
    });

    it('Sets $auth with fallback object if validate returns true', async () => {
        global.atob = vi.fn(() => 'john:doe');
        const ctx = makeCtx('Basic anybase64');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = BasicAuth({validate});
        const result = await mw(ctx);
        expect(result?.state.$auth).toEqual({user: 'john'});
    });

    it('Sets $auth with custom object if validate returns object', async () => {
        global.atob = vi.fn(() => 'jane:secret');
        const ctx = makeCtx('Basic anybase64');
        const customAuth = {id: 123, role: 'admin'};
        const validate = vi.fn().mockResolvedValue(customAuth);
        const mw = BasicAuth({validate});
        const result = await mw(ctx);
        expect(result?.state.$auth).toBe(customAuth);
    });

    it('Correctly attaches metadata symbols', () => {
        const mw = BasicAuth({validate: vi.fn()});
        expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostBasicAuth');
        expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('HTTP Basic Authentication middleware');
    });

    it('Sets a specific symbol marker to identify TriFrost BasicAuth', () => {
        const mw = BasicAuth({validate: vi.fn()});
        expect(Reflect.get(mw, Sym_TriFrostMiddlewareAuth)).toBe(true);
        expect(Reflect.get(mw, Sym_TriFrostFingerPrint)).toBe(Sym_TriFrostMiddlewareBasicAuth);
    });
});
