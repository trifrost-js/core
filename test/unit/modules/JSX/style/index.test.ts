import {describe, it, expect} from 'vitest';
import {Style} from '../../../../../lib/modules/JSX/style/Style';
import {css} from '../../../../../lib/modules/JSX/style/use';
import * as Module from '../../../../../lib/modules/JSX/style';

describe('Modules - JSX - style', () => {
    describe('Style', () => {
        it('Should link to the correct module', () => {
            expect(Module.Style).toEqual(Style);
        });
    });

    describe('css', () => {
        it('Should link to the correct module', () => {
            expect(Module.css).toEqual(css);
        });
    });
});
