import {describe, it, expect} from 'vitest';
import {ApiKeyAuth} from '../../../../lib/middleware/Auth/ApiKey';
import {BasicAuth} from '../../../../lib/middleware/Auth/Basic';
import {BearerAuth} from '../../../../lib/middleware/Auth/Bearer';
import {SessionCookieAuth} from '../../../../lib/middleware/Auth/SessionCookie';
import * as Auth from '../../../../lib/middleware/Auth';

describe('Middleware', () => {
    describe('ApiKeyAuth', () => {
        it('Should link to the correct module', () => {
            expect(Auth.ApiKeyAuth).toEqual(ApiKeyAuth);
        });
    });

    describe('BasicAuth', () => {
        it('Should link to the correct module', () => {
            expect(Auth.BasicAuth).toEqual(BasicAuth);
        });
    });

    describe('BearerAuth', () => {
        it('Should link to the correct module', () => {
            expect(Auth.BearerAuth).toEqual(BearerAuth);
        });
    });

    describe('SessionCookieAuth', () => {
        it('Should link to the correct module', () => {
            expect(Auth.SessionCookieAuth).toEqual(SessionCookieAuth);
        });
    });
});
