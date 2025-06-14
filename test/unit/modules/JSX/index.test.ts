import {describe, it, expect} from 'vitest';
import {nonce} from '../../../../lib/modules/JSX/nonce/use';
import {Script} from '../../../../lib/modules/JSX/script/Script';
import {Style} from '../../../../lib/modules/JSX/style/Style';
import {createCss} from '../../../../lib/modules/JSX/style/use';
import * as Module from '../../../../lib/modules/JSX/index';

describe('Modules - JSX', () => {
    describe('Script', () => {
        it('Should link to the correct module', () => {
            expect(Module.Script).toEqual(Script);
        });
    });

    describe('Style', () => {
        it('Should link to the correct module', () => {
            expect(Module.Style).toEqual(Style);
        });
    });

    describe('createCss', () => {
        it('Should link to the correct module', () => {
            expect(Module.createCss).toEqual(createCss);
        });
    });

    describe('nonce', () => {
        it('Should link to the correct module', () => {
            expect(Module.nonce).toEqual(nonce);
        });
    });
});
