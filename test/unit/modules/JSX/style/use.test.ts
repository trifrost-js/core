import {describe, it, expect, beforeEach} from 'vitest';
import {css, setActiveStyleEngine} from '../../../../../lib/modules/JSX/style/use';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';
import CONSTANTS from '../../../../constants';

describe('Modules - JSX - style - use', () => {
    let engine: StyleEngine;

    beforeEach(() => {
        engine = new StyleEngine();
        setActiveStyleEngine(engine);
    });

    it('Handles empty object gracefully', () => {
        const cls = css({});
        const html = engine.inject(`<div class="${cls}">Empty</div>`);
        expect(html).toBe(`<div class="${cls}">Empty</div>`);
    });

    it('Handles a non-object rule gracefully', () => {
        for (const el of CONSTANTS.NOT_OBJECT) {
            const cls = css(el as Record<string, unknown>);
            expect(cls).toBe('');
            const html = engine.inject(`<div class="${cls}">Blank</div>`);
            expect(html).toBe(`<div class="${cls}">Blank</div>`);
        }
    });

    it('Generates deterministic class for flat styles', () => {
        const cls = css({color: 'red', fontSize: '1rem'});
        expect(cls).toMatch(/^tf-/);
        const html = engine.inject(`<div class="${cls}">Hello</div>`);
        expect(html).toBe(`<style>.${cls}{color:red;font-size:1rem}</style><div class="${cls}">Hello</div>`);
    });

    it('Ignores null or undefined style values', () => {
        const cls = css({
            color: 'black',
            backgroundColor: null,
            border: undefined,
            padding: '1rem',
        });
    
        const html = engine.inject(`<div class="${cls}">Sanitized</div>`);
        expect(html).toBe(`<style>.${cls}{color:black;padding:1rem}</style><div class="${cls}">Sanitized</div>`);
    });

    it('Supports :hover and span selectors', () => {
        const cls = css({
            color: 'black',
            ':hover': {color: 'red'},
            ' span': {fontWeight: 'bold'},
            ':hover span': {color: 'blue'},
        });

        const html = engine.inject(`<div class="${cls}">Hover</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}:hover{color:red}`,
            `.${cls} span{font-weight:bold}`,
            `.${cls}:hover span{color:blue}`,
            `.${cls}{color:black}`,
            '</style>',
            `<div class="${cls}">Hover</div>`,
        ].join(''));
    });

    it('Supports attribute selectors', () => {
        const cls = css({
            color: 'black',
            '[data-active="true"]': {color: 'red', backgroundColor: 'white'},
            '[data-active="true"]:hover': {fontWeight: 'bold'},
            ' span': {fontWeight: 'bold', flexDirection: 'column'},
            ':hover span': {color: 'blue'},
        });

        const html = engine.inject(`<div class="${cls}">Hover</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}[data-active="true"]{color:red;background-color:white}`,
            `.${cls}[data-active="true"]:hover{font-weight:bold}`,
            `.${cls} span{font-weight:bold;flex-direction:column}`,
            `.${cls}:hover span{color:blue}`,
            `.${cls}{color:black}`,
            '</style>',
            `<div class="${cls}">Hover</div>`,
        ].join(''));
    });

    it('Handles media queries for base and selector rules', () => {
        const cls = css({
            fontSize: '1rem',
            '@media (max-width: 600px)': {
                fontSize: '0.875rem',
                ':hover': {fontSize: '0.75rem'},
            },
        });

        const html = engine.inject(`<div class="${cls}">Responsive</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}{font-size:1rem}`,
            '@media (max-width: 600px){',
            `.${cls}:hover{font-size:0.75rem}`,
            `.${cls}{font-size:0.875rem}`,
            '}',
            '</style>',
            `<div class="${cls}">Responsive</div>`,
        ].join(''));
    });

    it('Handles multiple selectors under the same media query', () => {
        const cls = css({
            fontSize: '1rem',
            '@media (max-width: 600px)': {
                fontSize: '0.5rem',
                ':hover': {fontSize: '0.75rem'},
                ' span': {fontWeight: 'bold'},
            },
        });
    
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}{font-size:1rem}`,
            '@media (max-width: 600px){',
            `.${cls}:hover{font-size:0.75rem}`,
            `.${cls} span{font-weight:bold}`,
            `.${cls}{font-size:0.5rem}`,
            '}',
            '</style>',
            `<div class="${cls}">Test</div>`,
        ].join(''));
    });

    it('Supports attribute selectors in combination with media queries', () => {
        const cls = css({
            color: 'black',
            '[data-active="true"]': {color: 'red', backgroundColor: 'white'},
            '[data-active="true"]:hover': {fontWeight: 'bold'},
            ' span': {fontWeight: 'bold', flexDirection: 'column'},
            ':hover span': {color: 'blue'},
            '@media (max-width: 600px)': {
                fontSize: '0.5rem',
                '[data-active="true"]': {color: 'black', fontSize: '0.4rem'},
                ':hover [data-active="true"]': {fontSize: '0.75rem'},
                ':active [data-active="true"]': {fontSize: '0.70rem'},
                ':hover': {fontSize: '0.75rem'},
                ' span': {fontWeight: 'bold'},
            },
        });

        const html = engine.inject(`<div class="${cls}">Hover</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}[data-active="true"]{color:red;background-color:white}`,
            `.${cls}[data-active="true"]:hover{font-weight:bold}`,
            `.${cls} span{font-weight:bold;flex-direction:column}`,
            `.${cls}:hover span{color:blue}`,
            `.${cls}{color:black}`,
            [
                '@media (max-width: 600px){',
                `.${cls}[data-active="true"]{color:black;font-size:0.4rem}`,
                `.${cls}:hover [data-active="true"]{font-size:0.75rem}`,
                `.${cls}:active [data-active="true"]{font-size:0.70rem}`,
                `.${cls}:hover{font-size:0.75rem}`,
                `.${cls} span{font-weight:bold}`,
                `.${cls}{font-size:0.5rem}`,
                '}',
            ].join(''),
            '</style>',
            `<div class="${cls}">Hover</div>`,
        ].join(''));
    });

    it('Deduplicates identical declarations under different selectors', () => {
        const base = {color: 'red'};
        const cls1 = css(base);
        const cls2 = css(base);
        expect(cls1).toBe(cls2);
        const html = engine.inject(`<div class="${cls1} ${cls2}">Hello</div>`);
        expect(html).toBe(`<style>.${cls1}{color:red}</style><div class="${cls1} ${cls2}">Hello</div>`);
    });

    it('Correctly handles background url', () => {
        const cls = css({
            backgroundImage: 'url(\'./foo.jpg\')',
        });

        const html = engine.inject(`<div class="${cls}">Images</div>`);
        expect(html).toBe(`<style>.${cls}{background-image:url('./foo.jpg')}</style><div class="${cls}">Images</div>`);
    });

    it('Normalizes CSS functions wrapped in quotes', () => {
        const cls = css({backgroundImage: '\'url(/foo.png)\''});
        const html = engine.inject(`<div class="${cls}">BG</div>`);
        expect(html).toBe(`<style>.${cls}{background-image:url(/foo.png)}</style><div class="${cls}">BG</div>`);
    });
      
    it('Preserves quotes for valid string literals like content', () => {
        const cls = css({content: '"TriFrost"'});
        const html = engine.inject(`<div class="${cls}">Quoted</div>`);
        expect(html).toBe(`<style>.${cls}{content:"TriFrost"}</style><div class="${cls}">Quoted</div>`);
    });
      
    it('Strips quotes around url() if present', () => {
        const cls = css({backgroundImage: '\'url(/bg.png)\''});
        const html = engine.inject(`<div class="${cls}">BG</div>`);
        expect(html).toBe(`<style>.${cls}{background-image:url(/bg.png)}</style><div class="${cls}">BG</div>`);
    });
      
    it('Strips quotes around calc(...) expressions', () => {
        const cls = css({width: '"calc(100% - 2rem)"'});
        const html = engine.inject(`<div class="${cls}">Layout</div>`);
        expect(html).toBe(`<style>.${cls}{width:calc(100% - 2rem)}</style><div class="${cls}">Layout</div>`);
    });
      
    it('Strips quotes around var(...) tokens', () => {
        const cls = css({margin: '\'var(--space-md)\''});
        const html = engine.inject(`<div class="${cls}">Token</div>`);
        expect(html).toBe(`<style>.${cls}{margin:var(--space-md)}</style><div class="${cls}">Token</div>`);
    });
      
    it('Strips quotes around nested functions like filter()', () => {
        const cls = css({filter: '\'blur(5px)\''});
        const html = engine.inject(`<div class="${cls}">Filter</div>`);
        expect(html).toBe(`<style>.${cls}{filter:blur(5px)}</style><div class="${cls}">Filter</div>`);
    });
      
    it('Leaves other string literals untouched', () => {
        const cls = css({fontFamily: '"Helvetica, sans-serif"'});
        const html = engine.inject(`<div class="${cls}">Font</div>`);
        expect(html).toBe(`<style>.${cls}{font-family:"Helvetica, sans-serif"}</style><div class="${cls}">Font</div>`);
    });
      
    it('Returns the same class for identical rule strings', () => {
        const cls1 = css({fontWeight: 'bold'});
        const cls2 = css({fontWeight: 'bold'});
        expect(cls1).toBe(cls2);
    });

    it('Returns class but does not inject when inject: false', () => {
        const cls = css({color: 'green'}, {inject: false});
        expect(cls).toMatch(/^tf-/);
        const html = engine.inject(`<div class="${cls}">Nothing</div>`);
        expect(html).toBe(`<div class="${cls}">Nothing</div>`);
    });
});
