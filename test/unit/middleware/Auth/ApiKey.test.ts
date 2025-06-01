import {describe, it, expect, vi} from 'vitest';
import {ApiKeyAuth, Sym_TriFrostMiddlewareApiKeyAuth} from '../../../../lib/middleware/Auth/ApiKey';
import {Sym_TriFrostMiddlewareAuth} from '../../../../lib/middleware/Auth/types';
import {MockContext} from '../../../MockContext';
import {Sym_TriFrostDescription, Sym_TriFrostName, Sym_TriFrostType, Sym_TriFrostFingerPrint} from '../../../../lib/types/constants';
import CONSTANTS from '../../../constants';

const makeCtx = (headers: Record<string, string> = {}, queryStr: string = '') => new MockContext({
    headers,
    query: queryStr,
});

describe('Middleware - Auth - ApiKey', () => {
    it('Throws if validate is not provided or invalid', () => {
        for (const el of CONSTANTS.NOT_FUNCTION) {
            expect(() => ApiKeyAuth({
                apiKey: {header: 'x-api-key'},
                validate: el as any,
            })).toThrowError(/A validate function must be provided/);
        }
    });

    it('Throws if neither apiKey.header nor apiKey.query is provided', () => {
        expect(() => ApiKeyAuth({
            apiKey: {},
            validate: vi.fn(),
        })).toThrowError(/You must configure apiKey header or query/);
    });

    it('Returns 401 if apiKey is missing', async () => {
        const ctx = makeCtx();
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate: vi.fn(),
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if apiClient is configured but missing', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'});
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            apiClient: {header: 'x-app-id'},
            validate: vi.fn(),
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Passes only apiKey when apiClient is not configured', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'});
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate,
        });
        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, {apiKey: 'goodkey', apiClient: null});
        expect(result?.state.$auth).toEqual({apiKey: 'goodkey', apiClient: null});
    });

    it('Passes both apiKey and apiClient when both are configured', async () => {
        const ctx = makeCtx({
            'x-api-key': 'goodkey',
            'x-app-id': 'myapp',
        });
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            apiClient: {header: 'x-app-id'},
            validate,
        });
        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, {apiKey: 'goodkey', apiClient: 'myapp'});
        expect(result?.state.$auth).toEqual({apiKey: 'goodkey', apiClient: 'myapp'});
    });

    it('Accepts values from query if configured', async () => {
        const ctx = makeCtx({}, 'api_key=queryval&app_id=queryapp');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({
            apiKey: {query: 'api_key'},
            apiClient: {query: 'app_id'},
            validate,
        });
        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, {apiKey: 'queryval', apiClient: 'queryapp'});
        expect(result?.state.$auth).toEqual({apiKey: 'queryval', apiClient: 'queryapp'});
    });

    it('Returns 401 if validate returns false', async () => {
        const ctx = makeCtx({'x-api-key': 'badkey'});
        const validate = vi.fn().mockResolvedValue(false);
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate,
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Attaches fallback $auth if validate returns true', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'});
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate,
        });
        const result = await mw(ctx);
        expect(result?.state.$auth).toEqual({apiKey: 'goodkey', apiClient: null});
    });

    it('Attaches custom $auth if validate returns object', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'});
        const customAuth = {id: 123, role: 'admin'};
        const validate = vi.fn().mockResolvedValue(customAuth);
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate,
        });
        const result = await mw(ctx);
        expect(result?.state.$auth).toBe(customAuth);
    });

    it('Throws if apiKey config has no valid header or query string', () => {
        for (const badVal of CONSTANTS.NOT_STRING_WITH_EMPTY) {
            expect(() => ApiKeyAuth({
                apiKey: {header: badVal as any, query: badVal as any},
                validate: vi.fn(),
            })).toThrowError(/You must configure apiKey header or query/);
        }
    });

    it('Ignores invalid apiClient config and proceeds with just apiKey', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'});
        const validate = vi.fn().mockResolvedValue(true);

        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            apiClient: {header: ''}, // invalid header (empty string)
            validate,
        });

        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, {apiKey: 'goodkey', apiClient: null});
        expect(result?.state.$auth).toEqual({apiKey: 'goodkey', apiClient: null});
    });

    it('Handles cases where apiClient is only provided in query but value is missing', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'}, '');
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            apiClient: {query: 'app_id'},
            validate: vi.fn(),
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Handles cases where apiClient config keys are non-strings', () => {
        for (const badVal of CONSTANTS.NOT_STRING_WITH_EMPTY) {
            const mw = ApiKeyAuth({
                apiKey: {header: 'x-api-key'},
                apiClient: {header: badVal as any, query: badVal as any},
                validate: vi.fn(),
            });
            expect(mw).toBeDefined();
        }
    });

    it('Returns 401 if header is configured but header value is blank', async () => {
        const ctx = makeCtx({'x-api-key': ''});
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate: vi.fn(),
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Returns 401 if query is configured but query value is blank', async () => {
        const ctx = makeCtx({}, 'api_key=');
        const mw = ApiKeyAuth({
            apiKey: {query: 'api_key'},
            validate: vi.fn(),
        });
        await mw(ctx);
        expect(ctx.$status).toBe(401);
    });

    it('Skips apiClient if not configured and still authenticates apiKey only', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'});
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate,
        });
        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, {apiKey: 'goodkey', apiClient: null});
        expect(result?.state.$auth).toEqual({apiKey: 'goodkey', apiClient: null});
    });

    it('Handles strange combinations of valid header but bad query configs', async () => {
        const ctx = makeCtx({'x-api-key': 'goodkey'}, 'weird=query');
        const validate = vi.fn().mockResolvedValue(true);
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key', query: ''}, // invalid query
            validate,
        });
        const result = await mw(ctx);
        expect(validate).toHaveBeenCalledWith(ctx, {apiKey: 'goodkey', apiClient: null});
        expect(result?.state.$auth).toEqual({apiKey: 'goodkey', apiClient: null});
    });

    it('Correctly attaches metadata symbols', () => {
        const mw = ApiKeyAuth({
            apiKey: {header: 'x-api-key'},
            validate: vi.fn(),
        });
        expect(Reflect.get(mw, Sym_TriFrostName)).toBe('TriFrostApiKeyAuth');
        expect(Reflect.get(mw, Sym_TriFrostType)).toBe('middleware');
        expect(Reflect.get(mw, Sym_TriFrostDescription)).toBe('API Key Authentication middleware');
        expect(Reflect.get(mw, Sym_TriFrostMiddlewareAuth)).toBe(true);
        expect(Reflect.get(mw, Sym_TriFrostFingerPrint)).toBe(Sym_TriFrostMiddlewareApiKeyAuth);
    });
});
