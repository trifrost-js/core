import {describe, it, expect} from 'vitest';
import {toKebab, styleToString, CAMEL_TO_KEBAB_LUT} from '../../../../../lib/modules/JSX/style/util';
import CONSTANTS from '../../../../constants';

describe('Modules - JSX - style - util', () => {
    describe('toKebab()', () => {
        for (const [input, expected] of Object.entries(CAMEL_TO_KEBAB_LUT)) {
            it(`converts ${input} to ${expected}`, () => {
                expect(toKebab(input)).toBe(expected);
            });
        }

        it('Handles vendor-prefixed properties', () => {
            expect(toKebab('webkitTransform')).toBe('-webkit-transform');
            expect(toKebab('mozTransition')).toBe('-moz-transition');
            expect(toKebab('msOverflowStyle')).toBe('-ms-overflow-style');
            expect(toKebab('oAppearance')).toBe('-o-appearance');
        });

        it('Returns already-kebab-case strings as-is', () => {
            expect(toKebab('border-radius')).toBe('border-radius');
            expect(toKebab('background-color')).toBe('background-color');
        });

        it('Is idempotent (calling twice returns same result)', () => {
            const once = toKebab('paddingTop');
            const twice = toKebab(once);
            expect(twice).toBe(once);
        });

        it('Caches results for performance (same reference returned)', () => {
            const result1 = toKebab('marginLeft');
            const result2 = toKebab('marginLeft');
            expect(result1).toBe(result2); // string equality
        });

        it('Handles non-alpha characters in property names safely', () => {
            expect(toKebab('fontSize123')).toBe('font-size123');
            expect(toKebab('$$customProp')).toBe('$$custom-prop');
        });
    });

    describe('styleToString()', () => {
        it('Returns null for null input', () => {
            expect(styleToString(null)).toBeNull();
        });

        it('Returns null for empty object', () => {
            expect(styleToString({})).toBeNull();
        });

        it('Handles single property correctly', () => {
            expect(styleToString({color: 'red'})).toBe('color:red');
        });

        it('Converts camelCase properties to kebab-case', () => {
            expect(styleToString({backgroundColor: 'blue'})).toBe('background-color:blue');
        });

        it('Handles multiple properties in correct order', () => {
            const style = styleToString({color: 'black', fontSize: '1rem'});
            expect(style).toBe('color:black;font-size:1rem');
        });

        it('Ignores null and undefined values', () => {
            expect(styleToString({color: null, padding: undefined, margin: '1rem'})).toBe('margin:1rem');
        });

        it('Stringifies non-string values', () => {
            expect(styleToString({opacity: 0.5, zIndex: 10})).toBe('opacity:0.5;z-index:10');
        });

        it('Unwraps quoted CSS functions', () => {
            expect(styleToString({backgroundImage: '"url(/x.jpg)"'})).toBe('background-image:url(/x.jpg)');
            expect(styleToString({width: "'calc(100% - 2rem)'"})).toBe('width:calc(100% - 2rem)');
        });

        it('Retains non-function quoted strings', () => {
            expect(styleToString({content: '"TriFrost"'})).toBe('content:"TriFrost"');
        });

        it('Returns null if all values are null/undefined/empty', () => {
            expect(styleToString({foo: null, bar: undefined})).toBeNull();
        });

        it('Handles a mix of strings, numbers, vendor prefixes, and quoted functions', () => {
            const style = styleToString({
                display: 'flex',
                webkitTransform: 'rotate(45deg)',
                opacity: 0.9,
                content: '"Test"',
                width: '"calc(100% - 1rem)"',
                paddingTop: '1rem',
            });

            expect(style).toBe(
                'display:flex;-webkit-transform:rotate(45deg);opacity:0.9;content:"Test";width:calc(100% - 1rem);padding-top:1rem',
            );
        });

        it('Handles malformed input gracefully', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                /* @ts-expect-error This is what we're testing */
                expect(styleToString(el)).toBe(null);
            }
        });
    });
});
