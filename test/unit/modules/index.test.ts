import {describe, it, expect} from 'vitest';
import {Cookies} from '../../../lib/modules/Cookies';
import {ConsoleExporter, JsonExporter, OtelHttpExporter} from '../../../lib/modules/Logger';
import {RateLimitKeyGeneratorRegistry} from '../../../lib/modules/RateLimit/_RateLimit';
import {createCss} from '../../../lib/modules/JSX/style/use';
import {Style} from '../../../lib/modules/JSX/style/Style';
import {createScript} from '../../../lib/modules/JSX/script/use';
import {
    jwtSign,
    jwtVerify,
    jwtDecode,
    JWTError,
    JWTMalformedError,
    JWTTypeError,
    JWTTimeError,
    JWTClaimError,
    JWTAlgorithmError,
    JWTSignatureError,
} from '../../../lib/modules/JWT';
import * as Modules from '../../../lib/modules';

describe('Modules - Index', () => {
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

    describe('JSX', () => {
        it('createCss should link to the correct module', () => {
            expect(Modules.createCss).toEqual(createCss);
        });

        it('createScript should link to the correct module', () => {
            expect(Modules.createScript).toEqual(createScript);
        });

        it('Style should link to the correct module', () => {
            expect(Modules.Style).toEqual(Style);
        });
    });

    /**
     * MARK: RateLimit
     */

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

    /**
     * MARK: JWT
     */

    describe('JWT', () => {
        it('jwtVerify should link to the correct module', () => {
            expect(Modules.jwtVerify).toEqual(jwtVerify);
        });

        it('jwtSign should link to the correct module', () => {
            expect(Modules.jwtSign).toEqual(jwtSign);
        });

        it('jwtDecode should link to the correct module', () => {
            expect(Modules.jwtDecode).toEqual(jwtDecode);
        });

        it('JWTError should link to the correct module', () => {
            expect(Modules.JWTError).toEqual(JWTError);
        });

        it('JWTMalformedError should link to the correct module', () => {
            expect(Modules.JWTMalformedError).toEqual(JWTMalformedError);
        });

        it('JWTTypeError should link to the correct module', () => {
            expect(Modules.JWTTypeError).toEqual(JWTTypeError);
        });

        it('JWTTimeError should link to the correct module', () => {
            expect(Modules.JWTTimeError).toEqual(JWTTimeError);
        });

        it('JWTClaimError should link to the correct module', () => {
            expect(Modules.JWTClaimError).toEqual(JWTClaimError);
        });

        it('JWTAlgorithmError should link to the correct module', () => {
            expect(Modules.JWTAlgorithmError).toEqual(JWTAlgorithmError);
        });

        it('JWTSignatureError should link to the correct module', () => {
            expect(Modules.JWTSignatureError).toEqual(JWTSignatureError);
        });
    });
});
