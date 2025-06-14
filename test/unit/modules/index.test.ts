import {describe, it, expect} from 'vitest';
import {Cookies} from '../../../lib/modules/Cookies';
import {ConsoleExporter, JsonExporter, OtelHttpExporter} from '../../../lib/modules/Logger';
import {RateLimitKeyGeneratorRegistry} from '../../../lib/modules/RateLimit/_RateLimit';
import {createCss} from '../../../lib/modules/JSX/style/use';
import {Style} from '../../../lib/modules/JSX/style/Style';
import {Script} from '../../../lib/modules/JSX/script/Script';
import {nonce} from '../../../lib/modules/JSX/nonce/index';
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

    describe('createCss', () => {
        it('Should link to the correct module', () => {
            expect(Modules.createCss).toEqual(createCss);
        });
    });

    describe('Style', () => {
        it('Should link to the correct module', () => {
            expect(Modules.Style).toEqual(Style);
        });
    });

    describe('Script', () => {
        it('Should link to the correct module', () => {
            expect(Modules.Script).toEqual(Script);
        });
    });

    describe('nonce', () => {
        it('Should link to the correct module', () => {
            expect(Modules.nonce).toEqual(nonce);
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
});
