import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';
import {MARKER} from '../../../../../lib/modules/JSX/style/Style';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import CONSTANTS from '../../../../constants';
import {MockContext} from '../../../../MockContext';
import {djb2Hash} from '../../../../../lib/utils/Generic';

describe('Modules – JSX – style – Engine', () => {
    let engine: StyleEngine;

    beforeEach(() => {
        engine = new StyleEngine();
    });

    afterEach(() => {
        setActiveCtx(null);
    });

    describe('register()', () => {
        it('Registers base styles correctly under default selector', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.flush()).toContain(`.${cls}{color:red}`);
        });

        it('Registers media query styles correctly', () => {
            const cls = 'tf' + djb2Hash('font-size:1rem');
            engine.register('font-size:1rem', cls, {
                query: '@media (max-width: 600px)',
            });
            expect(engine.flush()).toBe('<style>@media (max-width: 600px){.tf6irgbz{font-size:1rem}}</style>');
        });

        it('Registers multiple rules under the same media query correctly', () => {
            const query = '@media screen and (min-width: 768px)';
            engine.register('margin:1rem', 'tfm1', {query});
            engine.register('padding:2rem', 'tfp2', {query});

            expect(engine.flush()).toBe(
                ['<style>', '@media screen and (min-width: 768px){.tfm1{margin:1rem}.tfp2{padding:2rem}}', '</style>'].join(''),
            );
        });

        it('Respects custom selectors', () => {
            engine.register('opacity:0.5', 'tfopacity', {
                selector: '.fade-in:hover',
            });
            expect(engine.flush()).toBe('<style>.fade-in:hover{opacity:0.5}</style>');
        });

        it('Allows different rules with the same class name if selector differs', () => {
            const cls = 'tfcustom';
            engine.register('font-weight:bold', cls, {selector: '.foo'});
            engine.register('text-decoration:underline', cls, {selector: '.bar'});

            expect(engine.flush()).toBe('<style>.foo{font-weight:bold}.bar{text-decoration:underline}</style>');
        });

        it('Correctly separates base and media rules', () => {
            engine.register('color:black', 'tfblack', {});
            engine.register('font-size:2rem', 'tfblack', {query: '@media (prefers-color-scheme: dark)'});
            engine.register('color:white', 'tfwhite', {query: '@media (prefers-color-scheme: dark)'});
            engine.register('font-size:1rem', 'tfblack', {query: '@media (prefers-color-scheme: light)'});
            engine.register('color:red', 'tfblack', {query: '@media (prefers-color-scheme: light)'});

            expect(engine.flush()).toBe(
                [
                    '<style>',
                    '.tfblack{color:black}',
                    '@media (prefers-color-scheme: dark){.tfblack{font-size:2rem}.tfwhite{color:white}}',
                    '@media (prefers-color-scheme: light){.tfblack{font-size:1rem}.tfblack{color:red}}',
                    '</style>',
                ].join(''),
            );
        });

        it('Deduplicates duplicate rules', () => {
            const cls = 'tf' + djb2Hash('padding:1rem');
            engine.register('padding:1rem', cls, {});
            engine.register('padding:1rem', cls, {});
            expect(engine.flush()).toBe('<style>.tf1a35xl1{padding:1rem}</style>');
        });

        it('Trims input', () => {
            engine.register('   margin:1rem   ', 'bla', {});
            expect(engine.flush()).toBe('<style>.bla{margin:1rem}</style>');
        });

        it('Ignores rule when selector is an empty string', () => {
            engine.register('font-size:1rem', 'tfempty', {selector: ''});
            expect(engine.flush()).toBe('');
        });

        it('Ignores non/empty string', () => {
            for (const el of [...CONSTANTS.NOT_STRING, '']) {
                engine.register(el as string, 'tfempty', {});
            }
            expect(engine.flush()).toBe('');
        });

        it('Ignores rule if null or undefined', () => {
            /* @ts-expect-error this is what we're testing */
            engine.register(undefined, 'tfnull', {});
            /* @ts-expect-error this is what we're testing */
            engine.register(null, 'tfnull', {});
            expect(engine.flush()).toBe('');
        });
    });

    describe('flush()', () => {
        it('Returns empty string if no rules registered', () => {
            expect(engine.flush()).toBe('');
        });

        it('Wraps output in a <style> tag', () => {
            const cls = 'tf' + djb2Hash('gap:2rem');
            engine.register('gap:2rem', cls, {});
            expect(engine.flush()).toBe('<style>.tf12hpry9{gap:2rem}</style>');
        });

        it('Flushes large number of base rules correctly', () => {
            for (let i = 0; i < 50; i++) {
                const rule = `padding:${i}px`;
                const cls = 'tf' + djb2Hash(rule);
                engine.register(rule, cls, {});
            }

            expect(engine.flush()).toBe(
                [
                    '<style>',
                    '.tfhiqvli{padding:0px}',
                    '.tf1q39id3{padding:1px}',
                    '.tfwyt62c{padding:2px}',
                    '.tf6i7qut{padding:3px}',
                    '.tf1hxkq5u{padding:4px}',
                    '.tfrgzayb{padding:5px}',
                    '.tf1xdn0mo{padding:6px}',
                    '.tf16x1lf5{padding:7px}',
                    '.tfgf4tby{padding:8px}',
                    '.tf1ozng3j{padding:9px}',
                    '.tf1xdis2v{padding:10px}',
                    '.tf1acv3ie{padding:11px}',
                    '.tf1uilg4l{padding:12px}',
                    '.tf17hxrk4{padding:13px}',
                    '.tfhhqdr7{padding:14px}',
                    '.tf1ti6r5u{padding:15px}',
                    '.tfemt1sx{padding:16px}',
                    '.tf1qn9f7k{padding:17px}',
                    '.tfxqwbzj{padding:18px}',
                    '.tfaq8nf2{padding:19px}',
                    '.tf1492fs4{padding:20px}',
                    '.tf1du67np{padding:21px}',
                    '.tf1hr0nfq{padding:22px}',
                    '.tf1rc4fbb{padding:23px}',
                    '.tf1nee3fk{padding:24px}',
                    '.tf1wzhvb5{padding:25px}',
                    '.tf1v8942{padding:26px}',
                    '.tfbgc0zn{padding:27px}',
                    '.tf4mfzos{padding:28px}',
                    '.tfe7jrkd{padding:29px}',
                    '.tfdsh0kl{padding:30px}',
                    '.tf1pyer5w{padding:31px}',
                    '.tfraf8fb{padding:32px}',
                    '.tf4f8x1i{padding:33px}',
                    '.tfwxso81{padding:34px}',
                    '.tfa2mcu8{padding:35px}',
                    '.tf1afqw2r{padding:36px}',
                    '.tfnkkkoy{padding:37px}',
                    '.tf1d6ymgd{padding:38px}',
                    '.tfqbsb2k{padding:39px}',
                    '.tf1p7tzvm{padding:40px}',
                    '.tf1b6b7pf{padding:41px}',
                    '.tf1mcwnq8{padding:42px}',
                    '.tf18bdvk1{padding:43px}',
                    '.tf7jhyee{padding:44px}',
                    '.tf1sj387b{padding:45px}',
                    '.tf4okm90{padding:46px}',
                    '.tf1po5w1x{padding:47px}',
                    '.tfpl7jsa{padding:48px}',
                    '.tfbjorm3{padding:49px}',
                    '</style>',
                ].join(''),
            );
        });

        it('Includes nonce attribute when active', () => {
            const cls = 'tf' + djb2Hash('display:grid');
            engine.register('display:grid', cls, {});
            setActiveCtx(new MockContext({nonce: 'abc123'}));
            expect(engine.flush()).toBe('<style nonce="abc123">.tf197m2sd{display:grid}</style>');
        });

        it('flush(true) returns raw css string only, no tags or links', () => {
            const cls = 'tf' + djb2Hash('color:blue');
            engine.register('color:blue', cls, {});
            const raw = engine.flush(true);

            expect(raw).toBe(`.${cls}{color:blue}`);
        });
    });

    describe('inject()', () => {
        it('Replaces marker if present', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.inject(`<div>${MARKER}Hello there</div>`)).toBe('<div><style>.tf1jvcvsh{color:red}</style>Hello there</div>');
        });

        it('Includes nonce attribute when active', () => {
            const cls = 'tf' + djb2Hash('color:red');
            setActiveCtx(new MockContext({nonce: 'abc123'}));
            engine.register('color:red', cls, {});
            expect(engine.inject(`<div>${MARKER}Hello there</div>`)).toBe(
                '<div><style nonce="abc123">.tf1jvcvsh{color:red}</style>Hello there</div>',
            );
        });

        it('Does not prepend styles if marker is not present', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.inject('<main>hello</main>')).toBe('<main>hello</main>');
        });

        it('Only replaces the first occurrence of the style marker and strips the rest', () => {
            const cls = 'tf' + djb2Hash('border:1px solid red');
            engine.register('border:1px solid red', cls, {});
            expect(engine.inject(`<div>${MARKER}<span>${MARKER}</span></div>`)).toBe(
                '<div><style>.tf1vi3bqc{border:1px solid red}</style><span></span></div>',
            );
        });

        it('Strips the markers even if engine is empty', () => {
            expect(engine.inject(`<div>${MARKER}<span>${MARKER}</span></div>`)).toBe('<div><span></span></div>');
        });

        it('Does not fail if passed a non/empty-string html', () => {
            for (const el of [...CONSTANTS.NOT_STRING, '']) {
                const cls = 'tf' + djb2Hash('line-height:1.5');
                engine.register('line-height:1.5', cls, {});

                const output = engine.inject(el as string);
                expect(output).toBe(`<style>.${cls}{line-height:1.5}</style>`);
            }
        });

        it('Simply returns an empty string if no html is passed and engine is empty', () => {
            expect(engine.inject('')).toBe('');
        });

        it('Injects <link> when mount_path is set and HTML starts with <!DOCTYPE>', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<!DOCTYPE html><html>${MARKER}</html>`)).toBe(
                [
                    '<!DOCTYPE html><html>',
                    '<link rel="stylesheet" href="/styles.css">',
                    '<style>.tf1jvcvsh{color:red}</style>',
                    '</html>',
                ].join(''),
            );
        });

        it('Injects <link> when HTML starts with <html>', () => {
            const cls = 'tf' + djb2Hash('margin:0');
            engine.register('margin:0', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<html>${MARKER}</html>`)).toBe(
                ['<html>', '<link rel="stylesheet" href="/styles.css">', '<style>.tfl8qkup{margin:0}</style>', '</html>'].join(''),
            );
        });

        it('Injects <link> with nonce when mount_path is set and nonce context is active', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            engine.setMountPath('/styles.css');
            setActiveCtx(new MockContext({nonce: 'abc123'}));

            expect(engine.inject(`<!DOCTYPE html><html>${MARKER}</html>`)).toBe(
                [
                    '<!DOCTYPE html><html>',
                    '<link rel="stylesheet" nonce="abc123" href="/styles.css">',
                    '<style nonce="abc123">.tf1jvcvsh{color:red}</style>',
                    '</html>',
                ].join(''),
            );
        });

        it('Does not inject <link> if mount_path is set but HTML is not full document', () => {
            const cls = 'tf' + djb2Hash('padding:0');
            engine.register('padding:0', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<div>${MARKER}content</div>`)).toBe(['<div><style>.tfyzoiny{padding:0}</style>content</div>'].join(''));
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
                engine.register(rule, 'tf' + djb2Hash(rule), {});
            }

            expect(engine.flush()).toBe(
                [
                    '<style>',
                    '.tf1t9n8da{border-radius:0px}',
                    '.tfx4k49r{border-radius:1px}',
                    '.tf7h7dzw{border-radius:2px}',
                    '.tf1ad8bvh{border-radius:3px}',
                    '.tfce3k0q{border-radius:4px}',
                    '.tf1fa4hwb{border-radius:5px}',
                    '.tfpmrrmg{border-radius:6px}',
                    '.tf1sispi1{border-radius:7px}',
                    '.tf1ypp5hy{border-radius:8px}',
                    '.tf12km1ef{border-radius:9px}',
                    '.tf17grifj{border-radius:10px}',
                    '.tf1b1ifu6{border-radius:11px}',
                    '.tf1uu63f1{border-radius:12px}',
                    '.tf1yex0to{border-radius:13px}',
                    '.tfg716yz{border-radius:14px}',
                    '.tfjrs4dm{border-radius:15px}',
                    '.tf13kfryh{border-radius:16px}',
                    '.tf1756pd4{border-radius:17px}',
                    '.tft3c3d3{border-radius:18px}',
                    '.tfwo30rq{border-radius:19px}',
                    '</style>',
                ].join(''),
            );
            engine.reset();
            expect(engine.flush()).toBe('');
        });

        it('Clears both base and media style maps', () => {
            engine.register('font-weight:bold', 'tf' + djb2Hash('font-weight:bold'), {});
            engine.register('font-size:0.9rem', 'tf' + djb2Hash('font-size:0.9rem'), {
                query: '@media (min-width: 800px)',
            });
            expect(engine.flush()).toBe(
                ['<style>', '.tf13vslg{font-weight:bold}', '@media (min-width: 800px){.tf771neh{font-size:0.9rem}}', '</style>'].join(''),
            );
            engine.reset();
            expect(engine.flush()).toBe('');
        });
    });
});
