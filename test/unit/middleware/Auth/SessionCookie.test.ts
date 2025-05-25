import {describe, it, expect, vi} from 'vitest';
import {SessionCookieAuth} from '../../../../lib/middleware/Auth/SessionCookie';
import {MockContext} from '../../../MockContext';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType} from '../../../../lib/types';
import CONSTANTS from '../../../constants';

const makeCtx = (cookieVal?: string|null) => {
    const ctx = new MockContext();
    ctx.cookies.get = vi.fn(() => cookieVal);
    ctx.cookies.verify = vi.fn(() => cookieVal);
    return ctx;
};

describe('Middleware - Auth - SessionCookie', () => {
    it('Throws if no cookie name provided', () => {
        for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
            expect(() => SessionCookieAuth({
                cookie: el as any,
                secret: {val: 'secret'},
            })).toThrow(/TriFrostMiddleware@SessionCookieAuth: A cookie name must be provided/);
        }
    });

    it('Throws if no secret provided', () => {
        for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
            if (typeof el === 'function') continue;
            expect(() => SessionCookieAuth({
                cookie: 'session',
                secret: {val: el as any},
            })).toThrow(/TriFrostMiddleware@SessionCookieAuth: A secret must be provided/);
        }

        for (const el of CONSTANTS.NOT_FUNCTION) {
            if (typeof el === 'string') continue;
            expect(() => SessionCookieAuth({
                cookie: 'session',
                secret: {val: el as any},
            })).toThrow(/TriFrostMiddleware@SessionCookieAuth: A secret must be provided/);
        }
    });

    it('Returns 401 if cookie not found', async () => {
        const ctx = makeCtx(null);
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret'},
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if secret resolver returns non-string', async () => {
        const ctx = makeCtx('cookieval');
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: () => null as any},
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if verify fails', async () => {
        const ctx = makeCtx('cookieval');
        ctx.cookies.verify = vi.fn(() => null);
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret'},
        });
        await mw(ctx);
        expect(ctx.cookies.verify).toHaveBeenCalledWith('cookieval', 'secret', {algorithm: 'SHA-256'});
        expect(ctx.$status).toBe(401);
    });

    it('Sets $auth to {cookie} if verify succeeds and no validate provided', async () => {
        const ctx = makeCtx('verifiedValue');
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret'},
        });
        const result = await mw(ctx);
        expect(result?.state.$auth).toEqual({cookie: 'verifiedValue'});
    });

    it('Returns 401 if validate function returns false', async () => {
        const ctx = makeCtx('verifiedValue');
        const validate = vi.fn().mockResolvedValue(false);
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret'},
            validate,
        });
        await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, 'verifiedValue');
        expect(ctx.$status).toBe(401);
    });

    it('Sets $auth to {cookie} if validate returns true', async () => {
        const ctx = makeCtx('verifiedValue');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret'},
            validate,
        });
        const result = await mw(ctx);
        expect(result?.state.$auth).toEqual({cookie: 'verifiedValue'});
    });

    it('Sets $auth to custom object if validate returns object', async () => {
        const ctx = makeCtx('verifiedValue');
        const custom = {id: 42, role: 'admin'};
        const validate = vi.fn().mockResolvedValue(custom);
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret'},
            validate,
        });
        const result = await mw(ctx);
        expect(result?.state.$auth).toBe(custom);
    });

    it('Resolves secret from function if provided', async () => {
        const ctx = makeCtx('verifiedValue');
        const secretFn = vi.fn(() => 'resolvedSecret');
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: secretFn},
        });
        await mw(ctx);
        expect(secretFn).toHaveBeenCalledWith(ctx);
        expect(ctx.cookies.verify).toHaveBeenCalledWith('verifiedValue', 'resolvedSecret', {algorithm: 'SHA-256'});
    });

    it('Uses provided algorithm if specified', async () => {
        const ctx = makeCtx('verifiedValue');
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret', algorithm: 'SHA-512'},
        });
        await mw(ctx);
        expect(ctx.cookies.verify).toHaveBeenCalledWith('verifiedValue', 'secret', {algorithm: 'SHA-512'});
    });

    it('Correctly attaches metadata symbols', () => {
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: 'secret'},
        });
        expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostSessionCookieAuth');
        expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
        expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('Session Cookie Authentication middleware');
    });

    it('Passes ctx correctly to secret value function', async () => {
        const ctx = makeCtx('verifiedValue');
    
        const secretFn = vi.fn(() => 'resolvedSecret');
    
        const mw = SessionCookieAuth({
            cookie: 'session',
            secret: {val: secretFn},
        });
    
        await mw(ctx);
        expect(secretFn).toHaveBeenCalledTimes(1);
        expect(secretFn).toHaveBeenCalledWith(ctx);
        expect(ctx.cookies.verify).toHaveBeenCalledWith('verifiedValue', 'resolvedSecret', {algorithm: 'SHA-256'});
    });    
});
