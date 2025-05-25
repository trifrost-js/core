import {describe, it, expect} from 'vitest';
import {ApiKeyAuth} from '../../../lib/middleware/Auth/ApiKey';
import {BasicAuth} from '../../../lib/middleware/Auth/Basic';
import {BearerAuth} from '../../../lib/middleware/Auth/Bearer';
import {CacheControl} from '../../../lib/middleware/CacheControl';
import {Cors} from '../../../lib/middleware/Cors';
import {Security} from '../../../lib/middleware/Security';
import {SessionCookieAuth} from '../../../lib/middleware/Auth/SessionCookie';
import * as Middleware from '../../../lib/middleware';

describe('Middleware', () => {
    describe('ApiKeyAuth', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.ApiKeyAuth).toEqual(ApiKeyAuth);
        });
    });

    describe('BasicAuth', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.BasicAuth).toEqual(BasicAuth);
        });
    });

    describe('BearerAuth', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.BearerAuth).toEqual(BearerAuth);
        });
    });

    describe('CacheControl', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.CacheControl).toEqual(CacheControl);
        });
    });

    describe('Cors', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.Cors).toEqual(Cors);
        });
    });

    describe('Security', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.Security).toEqual(Security);
        });
    });

    describe('SessionCookieAuth', () => {
        it('Should link to the correct module', () => {
            expect(Middleware.SessionCookieAuth).toEqual(SessionCookieAuth);
        });
    });
});
