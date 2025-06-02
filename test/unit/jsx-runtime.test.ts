import {describe, it, expect} from 'vitest';
import {jsx, jsxs, Fragment} from '../../lib/modules/JSX/runtime';
import * as JSXRuntime from '../../lib/jsx-runtime';

describe('jsx-runtime', () => {
    describe('jsx', () => {
        it('Should link to the correct function', () => {
            expect(JSXRuntime.jsx).toEqual(jsx);
        });
    });

    describe('jsxs', () => {
        it('Should link to the correct function', () => {
            expect(JSXRuntime.jsxs).toEqual(jsxs);
        });
    });

    describe('Fragment', () => {
        it('Should link to the correct function', () => {
            expect(JSXRuntime.Fragment).toEqual(Fragment);
        });
    });
});
