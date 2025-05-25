import {describe, it, expect, vi} from 'vitest';
import {ApiKeyAuth} from '../../../../lib/middleware/Auth/ApiKey';
import {MockContext} from '../../../MockContext';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType} from '../../../../lib/types';
import CONSTANTS from '../../../constants';

const makeCtx = (headerKey = 'x-api-key', headerVal?: string, queryKey = 'api_key', queryVal?: string) => new MockContext({
    headers: headerVal ? {[headerKey]: headerVal} : {},
    query: queryVal ? `${queryKey}=${queryVal}` : '',
});

describe('Middleware - Auth - ApiKey', () => {
    it('Throws if validate is not provided or invalid', () => {
        for (const el of CONSTANTS.NOT_FUNCTION) {
            expect(
                () => ApiKeyAuth({validate: el as any})
            ).toThrowError(/TriFrostMiddleware@ApiKeyAuth: A validate function must be provided/);
        }
    });

    it('Uses default header and query if not provided', async () => {
        const ctx = makeCtx(undefined, 'headerVal', undefined, 'queryVal');
        const mw = ApiKeyAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if no header or query present', async () => {
        const ctx = makeCtx();
        const mw = ApiKeyAuth({validate: vi.fn()});
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Uses custom header if provided', async () => {
        const ctx = makeCtx('x-custom-key', 'customHeaderVal');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({header: 'x-custom-key', validate});
        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, 'customHeaderVal');
        expect(result?.state.$auth).toEqual({key: 'customHeaderVal'});
    });

    it('Uses custom query if provided', async () => {
        const ctx = makeCtx(undefined, undefined, 'my_api', 'queryVal');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({query: 'my_api', validate});
        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, 'queryVal');
        expect(result?.state.$auth).toEqual({key: 'queryVal'});
    });

    it('Returns 401 if validate returns false', async () => {
        const ctx = makeCtx('x-api-key', 'badkey');
        const validate = vi.fn().mockResolvedValue(false);
        const mw = ApiKeyAuth({validate});
        await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, 'badkey');
        expect(ctx.$status).toBe(401);
    });

    it('Sets $auth with fallback object if validate returns true', async () => {
        const ctx = makeCtx('x-api-key', 'goodkey');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({validate});
        const result = await mw(ctx);
        expect(result?.state.$auth).toEqual({key: 'goodkey'});
    });

    it('Sets $auth with custom object if validate returns object', async () => {
        const ctx = makeCtx('x-api-key', 'mykey');
        const customAuth = {id: 999, scope: 'read-only'};
        const validate = vi.fn().mockResolvedValue(customAuth);
        const mw = ApiKeyAuth({validate});
        const result = await mw(ctx);
        expect(result?.state.$auth).toBe(customAuth);
    });

    it('Correctly attaches metadata symbols', () => {
        const mw = ApiKeyAuth({validate: vi.fn()});
        expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostApiKeyAuth');
        expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
        expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('API Key Authentication middleware');
    });
});
