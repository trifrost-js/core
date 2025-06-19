import {describe, it, expect} from 'vitest';
import {nonce} from '../../../../lib/modules/JSX/ctx/nonce';
import {createScript} from '../../../../lib/modules/JSX/script/use';
import {Style} from '../../../../lib/modules/JSX/style/Style';
import {createCss} from '../../../../lib/modules/JSX/style/use';
import * as Module from '../../../../lib/modules/JSX/index';

describe('Modules - JSX', () => {
    it('createScript should link to the correct module', () => {
        expect(Module.createScript).toEqual(createScript);
    });

    it('Style should link to the correct module', () => {
        expect(Module.Style).toEqual(Style);
    });

    it('createCss should link to the correct module', () => {
        expect(Module.createCss).toEqual(createCss);
    });

    it('nonce should link to the correct module', () => {
        expect(Module.nonce).toEqual(nonce);
    });
});
