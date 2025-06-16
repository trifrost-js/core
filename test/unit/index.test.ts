import {describe, it, expect} from 'vitest';
import {Sym_TriFrostMiddlewareAuth} from '../../lib/middleware/Auth/types';
import {ApiKeyAuth, Sym_TriFrostMiddlewareApiKeyAuth} from '../../lib/middleware/Auth/ApiKey';
import {BasicAuth, Sym_TriFrostMiddlewareBasicAuth} from '../../lib/middleware/Auth/Basic';
import {BearerAuth, Sym_TriFrostMiddlewareBearerAuth} from '../../lib/middleware/Auth/Bearer';
import {SessionCookieAuth, Sym_TriFrostMiddlewareSessionCookieAuth} from '../../lib/middleware/Auth/SessionCookie';
import {CacheControl, Sym_TriFrostMiddlewareCacheControl} from '../../lib/middleware/CacheControl';
import {Cors, Sym_TriFrostMiddlewareCors} from '../../lib/middleware/Cors';
import {Security, Sym_TriFrostMiddlewareSecurity} from '../../lib/middleware/Security';
import {Sym_TriFrostMiddlewareRateLimit} from '../../lib/modules/RateLimit';
import {cache, cacheFn, cacheSkip} from '../../lib/modules/Cache/util';
import {ConsoleExporter, JsonExporter, OtelHttpExporter, span, spanFn} from '../../lib/modules/Logger';
import {createCss, Style} from '../../lib/modules/JSX/style';
import {Script} from '../../lib/modules/JSX/script';
import {DurableObjectCache, DurableObjectRateLimit} from '../../lib/storage/DurableObject';
import {TriFrostDurableObject} from '../../lib/runtimes/Workerd/DurableObject';
import {KVCache, KVRateLimit} from '../../lib/storage/KV';
import {MemoryCache, MemoryRateLimit} from '../../lib/storage/Memory';
import {RedisCache, RedisRateLimit} from '../../lib/storage/Redis';
import {
    Sym_TriFrostName,
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    MimeTypes,
    HttpStatuses,
} from '../../lib/types/constants';
import {App} from '../../lib/App';
import {isDevMode} from '../../lib/utils/Generic';
import {OMIT_PRESETS} from '../../lib/utils/Scrambler';
import * as Index from '../../lib/index';

describe('index', () => {
    it('App', () => {
        expect(Index.App).toBe(App);
    });

    describe('Constants', () => {
        it('HttpStatuses ', () => {
            expect(Index.HttpStatuses).toEqual(HttpStatuses);
        });

        it('MimeTypes ', () => {
            expect(Index.MimeTypes).toEqual(MimeTypes);
        });
    });

    describe('Symbols', () => {
        it('Sym_TriFrostDescription', () => {
            expect(Index.Sym_TriFrostDescription).toBe(Sym_TriFrostDescription);
        });

        it('Sym_TriFrostFingerPrint', () => {
            expect(Index.Sym_TriFrostFingerPrint).toBe(Sym_TriFrostFingerPrint);
        });

        it('Sym_TriFrostMiddlewareAuth', () => {
            expect(Index.Sym_TriFrostMiddlewareAuth).toBe(Sym_TriFrostMiddlewareAuth);
        });

        it('Sym_TriFrostMiddlewareApiKeyAuth', () => {
            expect(Index.Sym_TriFrostMiddlewareApiKeyAuth).toBe(Sym_TriFrostMiddlewareApiKeyAuth);
        });

        it('Sym_TriFrostMiddlewareBasicAuth', () => {
            expect(Index.Sym_TriFrostMiddlewareBasicAuth).toBe(Sym_TriFrostMiddlewareBasicAuth);
        });

        it('Sym_TriFrostMiddlewareBearerAuth', () => {
            expect(Index.Sym_TriFrostMiddlewareBearerAuth).toBe(Sym_TriFrostMiddlewareBearerAuth);
        });

        it('Sym_TriFrostMiddlewareCacheControl', () => {
            expect(Index.Sym_TriFrostMiddlewareCacheControl).toBe(Sym_TriFrostMiddlewareCacheControl);
        });

        it('Sym_TriFrostMiddlewareCors', () => {
            expect(Index.Sym_TriFrostMiddlewareCors).toBe(Sym_TriFrostMiddlewareCors);
        });

        it('Sym_TriFrostMiddlewareRateLimit', () => {
            expect(Index.Sym_TriFrostMiddlewareRateLimit).toBe(Sym_TriFrostMiddlewareRateLimit);
        });

        it('Sym_TriFrostMiddlewareSecurity', () => {
            expect(Index.Sym_TriFrostMiddlewareSecurity).toBe(Sym_TriFrostMiddlewareSecurity);
        });

        it('Sym_TriFrostMiddlewareSessionCookieAuth', () => {
            expect(Index.Sym_TriFrostMiddlewareSessionCookieAuth).toBe(Sym_TriFrostMiddlewareSessionCookieAuth);
        });

        it('Sym_TriFrostName', () => {
            expect(Index.Sym_TriFrostName).toBe(Sym_TriFrostName);
        });
    });

    describe('Middleware', () => {
        it('ApiKeyAuth', () => {
            expect(Index.ApiKeyAuth).toBe(ApiKeyAuth);
        });

        it('BasicAuth', () => {
            expect(Index.BasicAuth).toBe(BasicAuth);
        });

        it('BearerAuth', () => {
            expect(Index.BearerAuth).toBe(BearerAuth);
        });

        it('CacheControl', () => {
            expect(Index.CacheControl).toBe(CacheControl);
        });

        it('Cors', () => {
            expect(Index.Cors).toBe(Cors);
        });

        it('Security', () => {
            expect(Index.Security).toBe(Security);
        });

        it('SessionCookieAuth', () => {
            expect(Index.SessionCookieAuth).toBe(SessionCookieAuth);
        });
    });

    describe('Modules', () => {
        it('cache', () => {
            expect(Index.cache).toBe(cache);
        });

        it('cacheFn', () => {
            expect(Index.cacheFn).toBe(cacheFn);
        });

        it('cacheSkip', () => {
            expect(Index.cacheSkip).toBe(cacheSkip);
        });

        it('ConsoleExporter', () => {
            expect(Index.ConsoleExporter).toBe(ConsoleExporter);
        });

        it('JsonExporter', () => {
            expect(Index.JsonExporter).toBe(JsonExporter);
        });

        it('OtelHttpExporter', () => {
            expect(Index.OtelHttpExporter).toBe(OtelHttpExporter);
        });

        it('span', () => {
            expect(Index.span).toBe(span);
        });

        it('spanFn', () => {
            expect(Index.spanFn).toBe(spanFn);
        });

        it('createCss', () => {
            expect(Index.createCss).toBe(createCss);
        });

        it('Script', () => {
            expect(Index.Script).toBe(Script);
        });

        it('Style', () => {
            expect(Index.Style).toBe(Style);
        });
    });

    describe('Storage', () => {
        it('DurableObjectCache', () => {
            expect(Index.DurableObjectCache).toBe(DurableObjectCache);
        });

        it('DurableObjectRateLimit', () => {
            expect(Index.DurableObjectRateLimit).toBe(DurableObjectRateLimit);
        });

        it('TriFrostDurableObject', () => {
            expect(Index.TriFrostDurableObject).toBe(TriFrostDurableObject);
        });

        it('KVCache', () => {
            expect(Index.KVCache).toBe(KVCache);
        });

        it('KVRateLimit', () => {
            expect(Index.KVRateLimit).toBe(KVRateLimit);
        });

        it('MemoryCache', () => {
            expect(Index.MemoryCache).toBe(MemoryCache);
        });

        it('MemoryRateLimit', () => {
            expect(Index.MemoryRateLimit).toBe(MemoryRateLimit);
        });

        it('RedisCache', () => {
            expect(Index.RedisCache).toBe(RedisCache);
        });

        it('RedisRateLimit', () => {
            expect(Index.RedisRateLimit).toBe(RedisRateLimit);
        });
    });

    describe('Utils', () => {
        it('isDevMode', () => {
            expect(Index.isDevMode).toBe(isDevMode);
        });

        it('OMIT_PRESETS', () => {
            expect(Index.OMIT_PRESETS).toBe(OMIT_PRESETS);
        });
    });
});
