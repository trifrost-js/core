import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';
import {MARKER} from '../../../../../lib/modules/JSX/style/Style';
import {setActiveNonce} from '../../../../../lib/modules/JSX/nonce/use';
import CONSTANTS from '../../../../constants';

describe('Modules – JSX – style – Engine', () => {
    let engine: StyleEngine;

    beforeEach(() => {
        engine = new StyleEngine();
    });

    afterEach(() => {
        setActiveNonce(null);
    });

    describe('hash()', () => {
        it('Generates consistent deterministic hashes', () => {
            const h1 = engine.hash('color:red');
            const h2 = engine.hash('color:red');
            expect(h1).toBe(h2);
        });

        it('Prefixes hashes with "tf-"', () => {
            expect(engine.hash('x')).toMatch(/^tf-/);
        });
    });

    describe('register()', () => {
        it('Registers base styles correctly under default selector', () => {
            const cls = engine.hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.flush()).toContain(`.${cls}{color:red}`);
        });

        it('Registers media query styles correctly', () => {
            const cls = engine.hash('font-size:1rem');
            engine.register('font-size:1rem', cls, {
                query: '@media (max-width: 600px)',
            });
            expect(engine.flush()).toBe('<style>@media (max-width: 600px){.tf-1970c6n{font-size:1rem}}</style>');
        });

        it('Registers multiple rules under the same media query correctly', () => {
            const query = '@media screen and (min-width: 768px)';
            engine.register('margin:1rem', 'tf-m1', {query});
            engine.register('padding:2rem', 'tf-p2', {query});

            expect(engine.flush()).toBe([
                '<style>',
                '@media screen and (min-width: 768px){.tf-m1{margin:1rem}.tf-p2{padding:2rem}}',
                '</style>',
            ].join(''));
        });

        it('Respects custom selectors', () => {
            engine.register('opacity:0.5', 'tf-opacity', {
                selector: '.fade-in:hover',
            });
            expect(engine.flush()).toBe('<style>.fade-in:hover{opacity:0.5}</style>');
        });

        it('Allows different rules with the same class name if selector differs', () => {
            const cls = 'tf-custom';
            engine.register('font-weight:bold', cls, {selector: '.foo'});
            engine.register('text-decoration:underline', cls, {selector: '.bar'});

            expect(engine.flush()).toBe('<style>.foo{font-weight:bold}.bar{text-decoration:underline}</style>');
        });

        it('Correctly separates base and media rules', () => {
            engine.register('color:black', 'tf-black', {});
            engine.register('font-size:2rem', 'tf-black', {query: '@media (prefers-color-scheme: dark)'});
            engine.register('color:white', 'tf-white', {query: '@media (prefers-color-scheme: dark)'});
            engine.register('font-size:1rem', 'tf-black', {query: '@media (prefers-color-scheme: light)'});
            engine.register('color:red', 'tf-black', {query: '@media (prefers-color-scheme: light)'});

            expect(engine.flush()).toBe([
                '<style>',
                '.tf-black{color:black}',
                '@media (prefers-color-scheme: dark){.tf-black{font-size:2rem}.tf-white{color:white}}',
                '@media (prefers-color-scheme: light){.tf-black{font-size:1rem}.tf-black{color:red}}',
                '</style>',
            ].join(''));
        });

        it('Deduplicates duplicate rules', () => {
            const cls = engine.hash('padding:1rem');
            engine.register('padding:1rem', cls, {});
            engine.register('padding:1rem', cls, {});
            expect(engine.flush()).toBe('<style>.tf-3pou9x{padding:1rem}</style>');
        });

        it('Trims input', () => {
            engine.register('   margin:1rem   ', 'bla', {});
            expect(engine.flush()).toBe('<style>.bla{margin:1rem}</style>');
        });

        it('Ignores rule when selector is an empty string', () => {
            engine.register('font-size:1rem', 'tf-empty', {selector: ''});
            expect(engine.flush()).toBe('');
        });

        it('Ignores non/empty string', () => {
            for (const el of [...CONSTANTS.NOT_STRING, '']) {
                engine.register(el as string, 'tf-empty', {});
            }
            expect(engine.flush()).toBe('');
        });

        it('Ignores rule if null or undefined', () => {
			/* @ts-ignore testing invalid input */
            engine.register(undefined, 'tf-null', {});
			/* @ts-ignore testing invalid input */
            engine.register(null, 'tf-null', {});
            expect(engine.flush()).toBe('');
        });
    });

    describe('flush()', () => {
        it('Returns empty string if no rules registered', () => {
            expect(engine.flush()).toBe('');
        });

        it('Wraps output in a <style> tag', () => {
            const cls = engine.hash('gap:2rem');
            engine.register('gap:2rem', cls, {});
            expect(engine.flush()).toBe('<style>.tf-jibc5d{gap:2rem}</style>');
        });

        it('Flushes large number of base rules correctly', () => {
            for (let i = 0; i < 50; i++) {
                const rule = `padding:${i}px`;
                const cls = engine.hash(rule);
                engine.register(rule, cls, {});
            }

            expect(engine.flush()).toBe([
                '<style>',
                '.tf-1dma5fa{padding:0px}',
                '.tf-1dma4mv{padding:1px}',
                '.tf-1dma0hg{padding:2px}',
                '.tf-1dma67p{padding:3px}',
                '.tf-1dma22a{padding:4px}',
                '.tf-1dma19v{padding:5px}',
                '.tf-1dm9x4g{padding:6px}',
                '.tf-1dma2up{padding:7px}',
                '.tf-1dm9ypq{padding:8px}',
                '.tf-1dm9xxb{padding:9px}',
                '.tf-3pqeav{padding:10px}',
                '.tf-3pqf3a{padding:11px}',
                '.tf-3pqfvp{padding:12px}',
                '.tf-3pqa5g{padding:13px}',
                '.tf-3pqaxv{padding:14px}',
                '.tf-3pqbqa{padding:15px}',
                '.tf-3pqcip{padding:16px}',
                '.tf-3pq6sg{padding:17px}',
                '.tf-3pq7lb{padding:18px}',
                '.tf-3pq8dq{padding:19px}',
                '.tf-3pmlac{padding:20px}',
                '.tf-3pmkhx{padding:21px}',
                '.tf-3pmq86{padding:22px}',
                '.tf-3pmpfr{padding:23px}',
                '.tf-3pmhxc{padding:24px}',
                '.tf-3pmh4x{padding:25px}',
                '.tf-3pmmv6{padding:26px}',
                '.tf-3pmm2r{padding:27px}',
                '.tf-3pmeks{padding:28px}',
                '.tf-3pmdsd{padding:29px}',
                '.tf-3pouqt{padding:30px}',
                '.tf-3povj8{padding:31px}',
                '.tf-3pozon{padding:32px}',
                '.tf-3potye{padding:33px}',
                '.tf-3pordt{padding:34px}',
                '.tf-3pos68{padding:35px}',
                '.tf-3powbn{padding:36px}',
                '.tf-3poqle{padding:37px}',
                '.tf-3poo19{padding:38px}',
                '.tf-3pooto{padding:39px}',
                '.tf-3pl1qa{padding:40px}',
                '.tf-3pl0xv{padding:41px}',
                '.tf-3pl3b4{padding:42px}',
                '.tf-3pl2ip{padding:43px}',
                '.tf-3pl53a{padding:44px}',
                '.tf-3pl4av{padding:45px}',
                '.tf-3pl6o4{padding:46px}',
                '.tf-3pl5vp{padding:47px}',
                '.tf-3pkv0q{padding:48px}',
                '.tf-3pku8b{padding:49px}',
                '</style>',
            ].join(''));
        });

        it('Includes nonce attribute when active', () => {
            const cls = engine.hash('display:grid');
            engine.register('display:grid', cls, {});
            setActiveNonce('abc123');
            expect(engine.flush()).toBe('<style nonce="abc123">.tf-18n9a1p{display:grid}</style>');
        });
    });

    describe('inject()', () => {
        it('Replaces marker if present', () => {
            const cls = engine.hash('color:red');
            engine.register('color:red', cls, {});
            expect(
                engine.inject(`<div>${MARKER}Hello there</div>`)
            ).toBe('<div><style>.tf-1tlgz3l{color:red}</style>Hello there</div>');
        });

        it('Includes nonce attribute when active', () => {
            const cls = engine.hash('color:red');
            setActiveNonce('abc123');
            engine.register('color:red', cls, {});
            expect(
                engine.inject(`<div>${MARKER}Hello there</div>`)
            ).toBe('<div><style nonce="abc123">.tf-1tlgz3l{color:red}</style>Hello there</div>');
        });

        it('Does not prepend styles if marker is not present', () => {
            const cls = engine.hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.inject('<main>hello</main>')).toBe('<main>hello</main>');
        });

        it('Only replaces the first occurrence of the style marker and strips the rest', () => {
            const cls = engine.hash('border:1px solid red');
            engine.register('border:1px solid red', cls, {});
            expect(
                engine.inject(`<div>${MARKER}<span>${MARKER}</span></div>`)
            ).toBe('<div><style>.tf-12bzjpg{border:1px solid red}</style><span></span></div>');
        });

        it('Strips the markers even if engine is empty', () => {
            expect(
                engine.inject(`<div>${MARKER}<span>${MARKER}</span></div>`)
            ).toBe('<div><span></span></div>');
        });

        it('Does not fail if passed a non/empty-string html', () => {
            for (const el of [...CONSTANTS.NOT_STRING, '']) {
                const cls = engine.hash('line-height:1.5');
                engine.register('line-height:1.5', cls, {});

                const output = engine.inject(el as string);
                expect(output).toBe(`<style>.${cls}{line-height:1.5}</style>`);
            }
        });

        it('Simply returns an empty string if no html is passed and engine is empty', () => {
            expect(engine.inject('')).toBe('');
        });
    });

    describe('reset()', () => {
        it('Does not throw if nothing to reset', () => {
            expect(engine.flush()).toBe('');
            engine.reset();
            expect(engine.flush()).toBe('');
        });

        it('Clears all rules even after large number of registrations', () => {
            for (let i = 0; i < 20; i++) {
                const rule = `border-radius:${i}px`;
                engine.register(rule, engine.hash(rule), {});
            }

            expect(engine.flush()).toBe([
                '<style>',
                '.tf-n8zwv2{border-radius:0px}',
                '.tf-n8zw2n{border-radius:1px}',
                '.tf-n8zyfw{border-radius:2px}',
                '.tf-n8zxnh{border-radius:3px}',
                '.tf-n8zti2{border-radius:4px}',
                '.tf-n8zspn{border-radius:5px}',
                '.tf-n8zv2w{border-radius:6px}',
                '.tf-n8zuah{border-radius:7px}',
                '.tf-n903km{border-radius:8px}',
                '.tf-n902s7{border-radius:9px}',
                '.tf-1kxtfin{border-radius:10px}',
                '.tf-1kxtgb2{border-radius:11px}',
                '.tf-1kxtakt{border-radius:12px}',
                '.tf-1kxtbd8{border-radius:13px}',
                '.tf-1kxtc5n{border-radius:14px}',
                '.tf-1kxtcy2{border-radius:15px}',
                '.tf-1kxt77t{border-radius:16px}',
                '.tf-1kxt808{border-radius:17px}',
                '.tf-1kxtm87{border-radius:18px}',
                '.tf-1kxtn0m{border-radius:19px}',
                '</style>',
            ].join(''));
            engine.reset();
            expect(engine.flush()).toBe('');
        });

        it('Clears both base and media style maps', () => {
            engine.register('font-weight:bold', engine.hash('font-weight:bold'), {});
            engine.register('font-size:0.9rem', engine.hash('font-size:0.9rem'), {
                query: '@media (min-width: 800px)',
            });
            expect(engine.flush()).toBe([
                '<style>',
                '.tf-9loqhw{font-weight:bold}',
                '@media (min-width: 800px){.tf-1txfpkp{font-size:0.9rem}}',
                '</style>',
            ].join(''));
            engine.reset();
            expect(engine.flush()).toBe('');
        });
    });
});
