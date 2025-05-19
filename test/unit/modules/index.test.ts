import {describe, it, expect} from 'vitest';
import {Cookies} from '../../../lib/modules/Cookies';
import {DurableObjectCache} from '../../../lib/modules/Cache/DurableObject';
import {KVCache} from '../../../lib/modules/Cache/KV';
import {MemoryCache} from '../../../lib/modules/Cache/Memory';
import {RedisCache} from '../../../lib/modules/Cache/Redis';
import {ConsoleExporter, JsonExporter, OtelHttpExporter} from '../../../lib/modules/Logger';
import {RateLimitKeyGeneratorRegistry} from '../../../lib/modules/RateLimit/_RateLimit';
import {DurableObjectRateLimit} from '../../../lib/modules/RateLimit/DurableObject';
import {KVRateLimit} from '../../../lib/modules/RateLimit/KV';
import {MemoryRateLimit} from '../../../lib/modules/RateLimit/Memory';
import {RedisRateLimit} from '../../../lib/modules/RateLimit/Redis';
import {css} from '../../../lib/modules/JSX/style/use';
import {Style} from '../../../lib/modules/JSX/style/Style';
import * as Modules from '../../../lib/modules';

describe('Modules - Index', () => {
    /**
     * MARK: Cache
     */

    describe('DurableObjectCache', () => {
        it('Should link to the correct module', () => {
            expect(Modules.DurableObjectCache).toEqual(DurableObjectCache);
        });
    });

    describe('KVCache', () => {
        it('Should link to the correct module', () => {
            expect(Modules.KVCache).toEqual(KVCache);
        });
    });

    describe('MemoryCache', () => {
        it('Should link to the correct module', () => {
            expect(Modules.MemoryCache).toEqual(MemoryCache);
        });
    });

    describe('RedisCache', () => {
        it('Should link to the correct module', () => {
            expect(Modules.RedisCache).toEqual(RedisCache);
        });
    });

    /**
     * MARK: Cookies
     */

    describe('Cookies', () => {
        it('Should link to the correct module', () => {
            expect(Modules.Cookies).toEqual(Cookies);
        });
    });

    /**
     * MARK: JSX
     */

    describe('css', () => {
        it('Should link to the correct module', () => {
            expect(Modules.css).toEqual(css);
        });
    });

    describe('Style', () => {
        it('Should link to the correct module', () => {
            expect(Modules.Style).toEqual(Style);
        });
    });

    /**
     * MaRK: RateLimit
     */
    
    describe('DurableObjectRateLimit', () => {
        it('Should link to the correct module', () => {
            expect(Modules.DurableObjectRateLimit).toEqual(DurableObjectRateLimit);
        });
    });

    describe('KVRateLimit', () => {
        it('Should link to the correct module', () => {
            expect(Modules.KVRateLimit).toEqual(KVRateLimit);
        });
    });

    describe('MemoryRateLimit', () => {
        it('Should link to the correct module', () => {
            expect(Modules.MemoryRateLimit).toEqual(MemoryRateLimit);
        });
    });

    describe('RedisRateLimit', () => {
        it('Should link to the correct module', () => {
            expect(Modules.RedisRateLimit).toEqual(RedisRateLimit);
        });
    });

    describe('RateLimitKeyGeneratorRegistry', () => {
        it('Should link to the correct module', () => {
            expect(Modules.RateLimitKeyGeneratorRegistry).toEqual(RateLimitKeyGeneratorRegistry);
        });
    });

    /**
     * MARK: Logger
     */

    describe('ConsoleExporter', () => {
        it('Should link to the correct module', () => {
            expect(Modules.ConsoleExporter).toEqual(ConsoleExporter);
        });
    });

    describe('JsonExporter', () => {
        it('Should link to the correct module', () => {
            expect(Modules.JsonExporter).toEqual(JsonExporter);
        });
    });

    describe('OtelHttpExporter', () => {
        it('Should link to the correct module', () => {
            expect(Modules.OtelHttpExporter).toEqual(OtelHttpExporter);
        });
    });
});
