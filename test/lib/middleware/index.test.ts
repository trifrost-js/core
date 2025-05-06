import {describe, it} from 'node:test';
import * as assert from 'node:assert/strict';
import {CacheControl as OGCacheControl} from '../../../lib/middleware/CacheControl';
import {Cors as OGCors} from '../../../lib/middleware/Cors';
import {Security as OGSecurity} from '../../../lib/middleware/Security';
import * as Middleware from '../../../lib/middleware';

describe('Middleware', () => {
    describe('*', () => {
        it('Should link to the correct modules', () => {
            assert.deepEqual(Middleware, {
                CacheControl: OGCacheControl,
                Cors: OGCors,
                Security: OGSecurity,
            });
        });
    });

    describe('CacheControl', () => {
        it('Should link to the correct module', () => {
            assert.deepEqual(Middleware.CacheControl, OGCacheControl);
        });
    });

    describe('Cors', () => {
        it('Should link to the correct module', () => {
            assert.deepEqual(Middleware.Cors, OGCors);
        });
    });

    describe('Security', () => {
        it('Should link to the correct module', () => {
            assert.deepEqual(Middleware.Security, OGSecurity);
        });
    });
});
