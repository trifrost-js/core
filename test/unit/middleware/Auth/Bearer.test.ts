import {describe, it, expect, vi} from 'vitest';
import {BearerAuth, Sym_TriFrostMiddlewareBearerAuth} from '../../../../lib/middleware/Auth/Bearer';
import {Sym_TriFrostMiddlewareAuth} from '../../../../lib/middleware/Auth/types';
import {MockContext} from '../../../MockContext';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostFingerPrint} from '../../../../lib/types/constants';
import CONSTANTS from '../../../constants';

const makeCtx = (authHeader?: string) =>
    new MockContext({
        headers: authHeader ? {authorization: authHeader} : {},
    });

describe('Middleware - Auth - Bearer', () => {
    it('Throws if validate is not provided or invalid', () => {
        for (const el of CONSTANTS.NOT_FUNCTION) {
            expect(() => BearerAuth({validate: el as any})).toThrowError(
                /TriFrostMiddleware@BearerAuth: A validate function must be provided/,
            );
        }
    });

    it('Returns 401 if no Authorization header', async () => {
        const ctx = makeCtx();
        const mw = BearerAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if Authorization header is not Bearer', async () => {
        const ctx = makeCtx('Basic YWRtaW46cGFzcw==');
        const mw = BearerAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if Authorization header is malformed', async () => {
        const ctx = makeCtx('Bearer');
        const mw = BearerAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if validate returns false', async () => {
        const ctx = makeCtx('Bearer testtoken');
        const validate = vi.fn().mockResolvedValue(false);
        const mw = BearerAuth({validate});
        await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, 'testtoken');
        expect(ctx.$status).toBe(401);
    });

    it('Sets $auth with fallback object if validate returns true', async () => {
        const ctx = makeCtx('Bearer validtoken');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = BearerAuth({validate});
        const result = await mw(ctx);
        expect(result?.state.$auth).toEqual({token: 'validtoken'});
    });

    it('Sets $auth with custom object if validate returns object', async () => {
        const ctx = makeCtx('Bearer validtoken');
        const customAuth = {id: 456, role: 'editor'};
        const validate = vi.fn().mockResolvedValue(customAuth);
        const mw = BearerAuth({validate});
        const result = await mw(ctx);
        expect(result?.state.$auth).toBe(customAuth);
    });

    it('Correctly attaches metadata symbols', () => {
        const mw = BearerAuth({validate: vi.fn()});
        expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostBearerAuth');
        expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('HTTP Bearer Token Authentication middleware');
    });

    it('Sets a specific symbol marker to identify TriFrost BearerAuth', () => {
        const mw = BearerAuth({validate: vi.fn()});
        expect(Reflect.get(mw, Sym_TriFrostMiddlewareAuth)).toBe(true);
        expect(Reflect.get(mw, Sym_TriFrostFingerPrint)).toBe(Sym_TriFrostMiddlewareBearerAuth);
    });
});
