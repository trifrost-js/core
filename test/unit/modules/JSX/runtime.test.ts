import {describe, it, expect} from 'vitest';
import {jsx, jsxs, Fragment} from '../../../../lib/modules/JSX/runtime';

describe('Modules - JSX - Runtime', () => {
    describe('jsx', () => {
        it('Should return a valid JSXElement object', () => {
            const el = jsx('div', {id: 'foo', children: 'bar'}, 'my-key');
            expect(el).toEqual({
                type: 'div',
                props: {id: 'foo', children: 'bar'},
                key: 'my-key',
            });
        });

        it('Should fallback to {} if props is undefined', () => {
            const el = jsx('span', undefined as any, 'key');
            expect(el.props).toEqual({});
        });
    });

    describe('jsxs', () => {
        it('Should behave the same as jsx()', () => {
            const el1 = jsx('ul', {children: ['a', 'b']}, 'key1');
            const el2 = jsxs('ul', {children: ['a', 'b']}, 'key1');
            expect(el2).toEqual(el1);
        });
    });

    describe('Fragment', () => {
        it('Should unwrap children as-is', () => {
            const children = ['one', 'two'];
            /* @ts-ignore */
            const result = Fragment({children});
            expect(result).toBe(children);
        });
    });
});
