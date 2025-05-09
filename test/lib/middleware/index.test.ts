import {describe, it, expect} from 'vitest';
import {CacheControl as OGCacheControl} from '../../../lib/middleware/CacheControl';
import {Cors as OGCors} from '../../../lib/middleware/Cors';
import {Security as OGSecurity} from '../../../lib/middleware/Security';
import * as Middleware from '../../../lib/middleware';

describe('Middleware', () => {
    describe('CacheControl', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.CacheControl).toEqual(OGCacheControl);
        });
    });

    describe('Cors', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.Cors).toEqual(OGCors);
        });
    });

    describe('Security', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.Security).toEqual(OGSecurity);
        });
    });
});
