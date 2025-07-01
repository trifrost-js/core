import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {StyleEngine, OBSERVER, PRIME, SHARD} from '../../../../../lib/modules/JSX/style/Engine';
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

    describe('OBSERVER', () => {
        it('Should be minified correctly', () => {
            expect(OBSERVER).toBe(
                [
                    '(function(){',
                    'const cn=new Set();',
                    'let prime=document.querySelector("style[data-tfs-p]");',
                    'if(!prime)return;',
                    'const cnr=/\\.([a-zA-Z0-9_-]+)[,{]/g;',
                    'let m;',
                    'while((m=cnr.exec(prime.textContent)))cn.add(m[1]);',
                    'function boot(){',
                    'const o=new MutationObserver(e=>{',
                    'let pp=new Set();',
                    'for(let i=0;i<e.length;i++){',
                    'for(let y=0;y<e[i].addedNodes.length;y++){',
                    'const nA=e[i].addedNodes[y];',
                    'if(nA.nodeType===Node.ELEMENT_NODE&&nA.tagName==="STYLE"&&nA.hasAttribute("data-tfs-s")){',
                    'const s=nA.getAttribute("data-tfs-s");',
                    'if(!s||cn.has(s)){',
                    'nA.remove();',
                    'continue;',
                    '}',
                    'cn.add(s);',
                    'if(nA.textContent)pp.add(nA.textContent);',
                    'nA.remove();',
                    '}}}',
                    'if(pp.size){',
                    'const nN=document.createElement("style");',
                    'const nS=window.$tfnonce;',
                    'if(typeof nS==="string"&&nS.length)nN.setAttribute("nonce",nS);',
                    'nN.setAttribute("data-tfs-ps","");',
                    'nN.textContent=[...pp.values()].join("");',
                    'prime.after(nN);',
                    '}});',
                    'o.observe(document.body,{childList:true,subtree:true});',
                    '}',
                    'if(document.body){boot();}else{document.addEventListener("DOMContentLoaded",boot);}})();',
                ].join(''),
            );
        });
    });

    describe('register()', () => {
        it('Registers base styles correctly under default selector', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.flush({mode: 'file'})).toContain(`.${cls}{color:red}`);
        });

        it('Registers media query styles correctly', () => {
            const cls = 'tf' + djb2Hash('font-size:1rem');
            engine.register('font-size:1rem', cls, {
                query: '@media (max-width: 600px)',
            });
            expect(engine.flush({mode: 'file'})).toBe('@media (max-width: 600px){.tf1970c6n{font-size:1rem}}');
        });

        it('Registers multiple rules under the same media query correctly', () => {
            const query = '@media screen and (min-width: 768px)';
            engine.register('margin:1rem', 'tfm1', {query});
            engine.register('padding:2rem', 'tfp2', {query});

            expect(engine.flush({mode: 'file'})).toBe('@media screen and (min-width: 768px){.tfm1{margin:1rem}.tfp2{padding:2rem}}');
        });

        it('Respects custom selectors', () => {
            engine.register('opacity:0.5', 'tfopacity', {
                selector: '.fade-in:hover',
            });
            expect(engine.flush({mode: 'file'})).toBe('.fade-in:hover{opacity:0.5}');
        });

        it('Allows different rules with the same class name', () => {
            const cls = 'tfcustom';
            engine.register('font-weight:bold', cls, {selector: '.foo'});
            engine.register('text-decoration:underline', cls, {selector: '.bar'});

            expect(engine.flush({mode: 'file'})).toBe('.foo{font-weight:bold}.bar{text-decoration:underline}');
        });

        it('Correctly separates base and media rules', () => {
            engine.register('color:black', 'tfblack', {});
            engine.register('font-size:2rem', 'tfblack', {query: '@media (prefers-color-scheme: dark)'});
            engine.register('color:white', 'tfwhite', {query: '@media (prefers-color-scheme: dark)'});
            engine.register('font-size:1rem', 'tfblack', {query: '@media (prefers-color-scheme: light)'});
            engine.register('color:red', 'tfblack', {query: '@media (prefers-color-scheme: light)'});

            expect(engine.flush({mode: 'file'})).toBe(
                [
                    '.tfblack{color:black}',
                    '@media (prefers-color-scheme: dark){.tfblack{font-size:2rem}.tfwhite{color:white}}',
                    '@media (prefers-color-scheme: light){.tfblack{font-size:1rem}.tfblack{color:red}}',
                ].join(''),
            );
        });

        it('Deduplicates duplicate rules', () => {
            const cls = 'tf' + djb2Hash('padding:1rem');
            engine.register('padding:1rem', cls, {});
            engine.register('padding:1rem', cls, {});
            expect(engine.flush({mode: 'file'})).toBe('.tf3pou9x{padding:1rem}');
        });

        it('Trims input', () => {
            engine.register('   margin:1rem   ', 'bla', {});
            expect(engine.flush({mode: 'file'})).toBe('.bla{margin:1rem}');
        });

        it('Ignores rule when selector is an empty string', () => {
            engine.register('font-size:1rem', 'tfempty', {selector: ''});
            expect(engine.flush({mode: 'file'})).toBe('');
        });

        it('Ignores non/empty string', () => {
            for (const el of [...CONSTANTS.NOT_STRING, '']) {
                engine.register(el as string, 'tfempty', {});
            }
            expect(engine.flush({mode: 'file'})).toBe('');
        });

        it('Ignores rule if null or undefined', () => {
            /* @ts-expect-error this is what we're testing */
            engine.register(undefined, 'tfnull', {});
            /* @ts-expect-error this is what we're testing */
            engine.register(null, 'tfnull', {});
            expect(engine.flush({mode: 'file'})).toBe('');
        });
    });

    describe('flush()', () => {
        describe('mode:style', () => {
            it('Returns empty baseline if no rules registered', () => {
                expect(engine.flush({mode: 'style'})).toBe('');
            });

            it('Returns empty baseline even with nonce if no rules registered', () => {
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'style'})).toBe('');
            });

            it('Wraps output in a <style> tag', () => {
                const cls = 'tf' + djb2Hash('gap:2rem');
                engine.register('gap:2rem', cls, {});
                expect(engine.flush({mode: 'style'})).toBe([`<style>.tfjibc5d{gap:2rem}</style>`].join(''));
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2Hash(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'style'})).toBe(
                    [
                        `<style>`,
                        '.tf1dma5fa{padding:0px}',
                        '.tf1dma4mv{padding:1px}',
                        '.tf1dma0hg{padding:2px}',
                        '.tf1dma67p{padding:3px}',
                        '.tf1dma22a{padding:4px}',
                        '.tf1dma19v{padding:5px}',
                        '.tf1dm9x4g{padding:6px}',
                        '.tf1dma2up{padding:7px}',
                        '.tf1dm9ypq{padding:8px}',
                        '.tf1dm9xxb{padding:9px}',
                        '.tf3pqeav{padding:10px}',
                        '.tf3pqf3a{padding:11px}',
                        '.tf3pqfvp{padding:12px}',
                        '.tf3pqa5g{padding:13px}',
                        '.tf3pqaxv{padding:14px}',
                        '.tf3pqbqa{padding:15px}',
                        '.tf3pqcip{padding:16px}',
                        '.tf3pq6sg{padding:17px}',
                        '.tf3pq7lb{padding:18px}',
                        '.tf3pq8dq{padding:19px}',
                        '.tf3pmlac{padding:20px}',
                        '.tf3pmkhx{padding:21px}',
                        '.tf3pmq86{padding:22px}',
                        '.tf3pmpfr{padding:23px}',
                        '.tf3pmhxc{padding:24px}',
                        '.tf3pmh4x{padding:25px}',
                        '.tf3pmmv6{padding:26px}',
                        '.tf3pmm2r{padding:27px}',
                        '.tf3pmeks{padding:28px}',
                        '.tf3pmdsd{padding:29px}',
                        '.tf3pouqt{padding:30px}',
                        '.tf3povj8{padding:31px}',
                        '.tf3pozon{padding:32px}',
                        '.tf3potye{padding:33px}',
                        '.tf3pordt{padding:34px}',
                        '.tf3pos68{padding:35px}',
                        '.tf3powbn{padding:36px}',
                        '.tf3poqle{padding:37px}',
                        '.tf3poo19{padding:38px}',
                        '.tf3pooto{padding:39px}',
                        '.tf3pl1qa{padding:40px}',
                        '.tf3pl0xv{padding:41px}',
                        '.tf3pl3b4{padding:42px}',
                        '.tf3pl2ip{padding:43px}',
                        '.tf3pl53a{padding:44px}',
                        '.tf3pl4av{padding:45px}',
                        '.tf3pl6o4{padding:46px}',
                        '.tf3pl5vp{padding:47px}',
                        '.tf3pkv0q{padding:48px}',
                        '.tf3pku8b{padding:49px}',
                        '</style>',
                    ].join(''),
                );
            });

            it('Includes nonce attribute when active', () => {
                const cls = 'tf' + djb2Hash('display:grid');
                engine.register('display:grid', cls, {});
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'style'})).toBe([`<style nonce="abc123">.tf18n9a1p{display:grid}</style>`].join(''));
            });
        });

        describe('mode:prime', () => {
            it('Returns empty baseline if no rules registered', () => {
                expect(engine.flush({mode: 'prime'})).toBe([`<style ${PRIME}></style>`, '<script>', OBSERVER, '</script>'].join(''));
            });

            it('Returns empty baseline with nonce if no rules registered', () => {
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'prime'})).toBe(
                    [`<style nonce="abc123" ${PRIME}></style>`, '<script nonce="abc123">', OBSERVER, '</script>'].join(''),
                );
            });

            it('Wraps output in a <style> tag', () => {
                const cls = 'tf' + djb2Hash('gap:2rem');
                engine.register('gap:2rem', cls, {});
                expect(engine.flush({mode: 'prime'})).toBe(
                    [`<style ${PRIME}>.tfjibc5d{gap:2rem}</style>`, '<script>', OBSERVER, '</script>'].join(''),
                );
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2Hash(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'prime'})).toBe(
                    [
                        `<style ${PRIME}>`,
                        '.tf1dma5fa{padding:0px}',
                        '.tf1dma4mv{padding:1px}',
                        '.tf1dma0hg{padding:2px}',
                        '.tf1dma67p{padding:3px}',
                        '.tf1dma22a{padding:4px}',
                        '.tf1dma19v{padding:5px}',
                        '.tf1dm9x4g{padding:6px}',
                        '.tf1dma2up{padding:7px}',
                        '.tf1dm9ypq{padding:8px}',
                        '.tf1dm9xxb{padding:9px}',
                        '.tf3pqeav{padding:10px}',
                        '.tf3pqf3a{padding:11px}',
                        '.tf3pqfvp{padding:12px}',
                        '.tf3pqa5g{padding:13px}',
                        '.tf3pqaxv{padding:14px}',
                        '.tf3pqbqa{padding:15px}',
                        '.tf3pqcip{padding:16px}',
                        '.tf3pq6sg{padding:17px}',
                        '.tf3pq7lb{padding:18px}',
                        '.tf3pq8dq{padding:19px}',
                        '.tf3pmlac{padding:20px}',
                        '.tf3pmkhx{padding:21px}',
                        '.tf3pmq86{padding:22px}',
                        '.tf3pmpfr{padding:23px}',
                        '.tf3pmhxc{padding:24px}',
                        '.tf3pmh4x{padding:25px}',
                        '.tf3pmmv6{padding:26px}',
                        '.tf3pmm2r{padding:27px}',
                        '.tf3pmeks{padding:28px}',
                        '.tf3pmdsd{padding:29px}',
                        '.tf3pouqt{padding:30px}',
                        '.tf3povj8{padding:31px}',
                        '.tf3pozon{padding:32px}',
                        '.tf3potye{padding:33px}',
                        '.tf3pordt{padding:34px}',
                        '.tf3pos68{padding:35px}',
                        '.tf3powbn{padding:36px}',
                        '.tf3poqle{padding:37px}',
                        '.tf3poo19{padding:38px}',
                        '.tf3pooto{padding:39px}',
                        '.tf3pl1qa{padding:40px}',
                        '.tf3pl0xv{padding:41px}',
                        '.tf3pl3b4{padding:42px}',
                        '.tf3pl2ip{padding:43px}',
                        '.tf3pl53a{padding:44px}',
                        '.tf3pl4av{padding:45px}',
                        '.tf3pl6o4{padding:46px}',
                        '.tf3pl5vp{padding:47px}',
                        '.tf3pkv0q{padding:48px}',
                        '.tf3pku8b{padding:49px}',
                        '</style>',
                        '<script>',
                        OBSERVER,
                        '</script>',
                    ].join(''),
                );
            });

            it('Includes nonce attribute when active', () => {
                const cls = 'tf' + djb2Hash('display:grid');
                engine.register('display:grid', cls, {});
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'prime'})).toBe(
                    [
                        `<style nonce="abc123" ${PRIME}>.tf18n9a1p{display:grid}</style>`,
                        '<script nonce="abc123">',
                        OBSERVER,
                        '</script>',
                    ].join(''),
                );
            });
        });

        describe('mode:shards', () => {
            it('Returns empty string if no rules registered', () => {
                expect(engine.flush({mode: 'shards'})).toBe('');
            });

            it('Wraps output in a <style> tag', () => {
                const cls = 'tf' + djb2Hash('gap:2rem');
                engine.register('gap:2rem', cls, {});
                expect(engine.flush({mode: 'shards'})).toBe(`<style ${SHARD}="tfjibc5d">.tfjibc5d{gap:2rem}</style>`);
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2Hash(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'shards'})).toBe(
                    [
                        `<style ${SHARD}="tf1dma5fa">.tf1dma5fa{padding:0px}</style>`,
                        `<style ${SHARD}="tf1dma4mv">.tf1dma4mv{padding:1px}</style>`,
                        `<style ${SHARD}="tf1dma0hg">.tf1dma0hg{padding:2px}</style>`,
                        `<style ${SHARD}="tf1dma67p">.tf1dma67p{padding:3px}</style>`,
                        `<style ${SHARD}="tf1dma22a">.tf1dma22a{padding:4px}</style>`,
                        `<style ${SHARD}="tf1dma19v">.tf1dma19v{padding:5px}</style>`,
                        `<style ${SHARD}="tf1dm9x4g">.tf1dm9x4g{padding:6px}</style>`,
                        `<style ${SHARD}="tf1dma2up">.tf1dma2up{padding:7px}</style>`,
                        `<style ${SHARD}="tf1dm9ypq">.tf1dm9ypq{padding:8px}</style>`,
                        `<style ${SHARD}="tf1dm9xxb">.tf1dm9xxb{padding:9px}</style>`,
                        `<style ${SHARD}="tf3pqeav">.tf3pqeav{padding:10px}</style>`,
                        `<style ${SHARD}="tf3pqf3a">.tf3pqf3a{padding:11px}</style>`,
                        `<style ${SHARD}="tf3pqfvp">.tf3pqfvp{padding:12px}</style>`,
                        `<style ${SHARD}="tf3pqa5g">.tf3pqa5g{padding:13px}</style>`,
                        `<style ${SHARD}="tf3pqaxv">.tf3pqaxv{padding:14px}</style>`,
                        `<style ${SHARD}="tf3pqbqa">.tf3pqbqa{padding:15px}</style>`,
                        `<style ${SHARD}="tf3pqcip">.tf3pqcip{padding:16px}</style>`,
                        `<style ${SHARD}="tf3pq6sg">.tf3pq6sg{padding:17px}</style>`,
                        `<style ${SHARD}="tf3pq7lb">.tf3pq7lb{padding:18px}</style>`,
                        `<style ${SHARD}="tf3pq8dq">.tf3pq8dq{padding:19px}</style>`,
                        `<style ${SHARD}="tf3pmlac">.tf3pmlac{padding:20px}</style>`,
                        `<style ${SHARD}="tf3pmkhx">.tf3pmkhx{padding:21px}</style>`,
                        `<style ${SHARD}="tf3pmq86">.tf3pmq86{padding:22px}</style>`,
                        `<style ${SHARD}="tf3pmpfr">.tf3pmpfr{padding:23px}</style>`,
                        `<style ${SHARD}="tf3pmhxc">.tf3pmhxc{padding:24px}</style>`,
                        `<style ${SHARD}="tf3pmh4x">.tf3pmh4x{padding:25px}</style>`,
                        `<style ${SHARD}="tf3pmmv6">.tf3pmmv6{padding:26px}</style>`,
                        `<style ${SHARD}="tf3pmm2r">.tf3pmm2r{padding:27px}</style>`,
                        `<style ${SHARD}="tf3pmeks">.tf3pmeks{padding:28px}</style>`,
                        `<style ${SHARD}="tf3pmdsd">.tf3pmdsd{padding:29px}</style>`,
                        `<style ${SHARD}="tf3pouqt">.tf3pouqt{padding:30px}</style>`,
                        `<style ${SHARD}="tf3povj8">.tf3povj8{padding:31px}</style>`,
                        `<style ${SHARD}="tf3pozon">.tf3pozon{padding:32px}</style>`,
                        `<style ${SHARD}="tf3potye">.tf3potye{padding:33px}</style>`,
                        `<style ${SHARD}="tf3pordt">.tf3pordt{padding:34px}</style>`,
                        `<style ${SHARD}="tf3pos68">.tf3pos68{padding:35px}</style>`,
                        `<style ${SHARD}="tf3powbn">.tf3powbn{padding:36px}</style>`,
                        `<style ${SHARD}="tf3poqle">.tf3poqle{padding:37px}</style>`,
                        `<style ${SHARD}="tf3poo19">.tf3poo19{padding:38px}</style>`,
                        `<style ${SHARD}="tf3pooto">.tf3pooto{padding:39px}</style>`,
                        `<style ${SHARD}="tf3pl1qa">.tf3pl1qa{padding:40px}</style>`,
                        `<style ${SHARD}="tf3pl0xv">.tf3pl0xv{padding:41px}</style>`,
                        `<style ${SHARD}="tf3pl3b4">.tf3pl3b4{padding:42px}</style>`,
                        `<style ${SHARD}="tf3pl2ip">.tf3pl2ip{padding:43px}</style>`,
                        `<style ${SHARD}="tf3pl53a">.tf3pl53a{padding:44px}</style>`,
                        `<style ${SHARD}="tf3pl4av">.tf3pl4av{padding:45px}</style>`,
                        `<style ${SHARD}="tf3pl6o4">.tf3pl6o4{padding:46px}</style>`,
                        `<style ${SHARD}="tf3pl5vp">.tf3pl5vp{padding:47px}</style>`,
                        `<style ${SHARD}="tf3pkv0q">.tf3pkv0q{padding:48px}</style>`,
                        `<style ${SHARD}="tf3pku8b">.tf3pku8b{padding:49px}</style>`,
                    ].join(''),
                );
            });

            it('Flushes large number of base rules correctly with nonces', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2Hash(rule);
                    engine.register(rule, cls, {});
                }

                setActiveCtx(new MockContext({nonce: 'abc123'}));

                expect(engine.flush({mode: 'shards'})).toBe(
                    [
                        `<style ${SHARD}="tf1dma5fa" nonce="abc123">.tf1dma5fa{padding:0px}</style>`,
                        `<style ${SHARD}="tf1dma4mv" nonce="abc123">.tf1dma4mv{padding:1px}</style>`,
                        `<style ${SHARD}="tf1dma0hg" nonce="abc123">.tf1dma0hg{padding:2px}</style>`,
                        `<style ${SHARD}="tf1dma67p" nonce="abc123">.tf1dma67p{padding:3px}</style>`,
                        `<style ${SHARD}="tf1dma22a" nonce="abc123">.tf1dma22a{padding:4px}</style>`,
                        `<style ${SHARD}="tf1dma19v" nonce="abc123">.tf1dma19v{padding:5px}</style>`,
                        `<style ${SHARD}="tf1dm9x4g" nonce="abc123">.tf1dm9x4g{padding:6px}</style>`,
                        `<style ${SHARD}="tf1dma2up" nonce="abc123">.tf1dma2up{padding:7px}</style>`,
                        `<style ${SHARD}="tf1dm9ypq" nonce="abc123">.tf1dm9ypq{padding:8px}</style>`,
                        `<style ${SHARD}="tf1dm9xxb" nonce="abc123">.tf1dm9xxb{padding:9px}</style>`,
                        `<style ${SHARD}="tf3pqeav" nonce="abc123">.tf3pqeav{padding:10px}</style>`,
                        `<style ${SHARD}="tf3pqf3a" nonce="abc123">.tf3pqf3a{padding:11px}</style>`,
                        `<style ${SHARD}="tf3pqfvp" nonce="abc123">.tf3pqfvp{padding:12px}</style>`,
                        `<style ${SHARD}="tf3pqa5g" nonce="abc123">.tf3pqa5g{padding:13px}</style>`,
                        `<style ${SHARD}="tf3pqaxv" nonce="abc123">.tf3pqaxv{padding:14px}</style>`,
                        `<style ${SHARD}="tf3pqbqa" nonce="abc123">.tf3pqbqa{padding:15px}</style>`,
                        `<style ${SHARD}="tf3pqcip" nonce="abc123">.tf3pqcip{padding:16px}</style>`,
                        `<style ${SHARD}="tf3pq6sg" nonce="abc123">.tf3pq6sg{padding:17px}</style>`,
                        `<style ${SHARD}="tf3pq7lb" nonce="abc123">.tf3pq7lb{padding:18px}</style>`,
                        `<style ${SHARD}="tf3pq8dq" nonce="abc123">.tf3pq8dq{padding:19px}</style>`,
                        `<style ${SHARD}="tf3pmlac" nonce="abc123">.tf3pmlac{padding:20px}</style>`,
                        `<style ${SHARD}="tf3pmkhx" nonce="abc123">.tf3pmkhx{padding:21px}</style>`,
                        `<style ${SHARD}="tf3pmq86" nonce="abc123">.tf3pmq86{padding:22px}</style>`,
                        `<style ${SHARD}="tf3pmpfr" nonce="abc123">.tf3pmpfr{padding:23px}</style>`,
                        `<style ${SHARD}="tf3pmhxc" nonce="abc123">.tf3pmhxc{padding:24px}</style>`,
                        `<style ${SHARD}="tf3pmh4x" nonce="abc123">.tf3pmh4x{padding:25px}</style>`,
                        `<style ${SHARD}="tf3pmmv6" nonce="abc123">.tf3pmmv6{padding:26px}</style>`,
                        `<style ${SHARD}="tf3pmm2r" nonce="abc123">.tf3pmm2r{padding:27px}</style>`,
                        `<style ${SHARD}="tf3pmeks" nonce="abc123">.tf3pmeks{padding:28px}</style>`,
                        `<style ${SHARD}="tf3pmdsd" nonce="abc123">.tf3pmdsd{padding:29px}</style>`,
                        `<style ${SHARD}="tf3pouqt" nonce="abc123">.tf3pouqt{padding:30px}</style>`,
                        `<style ${SHARD}="tf3povj8" nonce="abc123">.tf3povj8{padding:31px}</style>`,
                        `<style ${SHARD}="tf3pozon" nonce="abc123">.tf3pozon{padding:32px}</style>`,
                        `<style ${SHARD}="tf3potye" nonce="abc123">.tf3potye{padding:33px}</style>`,
                        `<style ${SHARD}="tf3pordt" nonce="abc123">.tf3pordt{padding:34px}</style>`,
                        `<style ${SHARD}="tf3pos68" nonce="abc123">.tf3pos68{padding:35px}</style>`,
                        `<style ${SHARD}="tf3powbn" nonce="abc123">.tf3powbn{padding:36px}</style>`,
                        `<style ${SHARD}="tf3poqle" nonce="abc123">.tf3poqle{padding:37px}</style>`,
                        `<style ${SHARD}="tf3poo19" nonce="abc123">.tf3poo19{padding:38px}</style>`,
                        `<style ${SHARD}="tf3pooto" nonce="abc123">.tf3pooto{padding:39px}</style>`,
                        `<style ${SHARD}="tf3pl1qa" nonce="abc123">.tf3pl1qa{padding:40px}</style>`,
                        `<style ${SHARD}="tf3pl0xv" nonce="abc123">.tf3pl0xv{padding:41px}</style>`,
                        `<style ${SHARD}="tf3pl3b4" nonce="abc123">.tf3pl3b4{padding:42px}</style>`,
                        `<style ${SHARD}="tf3pl2ip" nonce="abc123">.tf3pl2ip{padding:43px}</style>`,
                        `<style ${SHARD}="tf3pl53a" nonce="abc123">.tf3pl53a{padding:44px}</style>`,
                        `<style ${SHARD}="tf3pl4av" nonce="abc123">.tf3pl4av{padding:45px}</style>`,
                        `<style ${SHARD}="tf3pl6o4" nonce="abc123">.tf3pl6o4{padding:46px}</style>`,
                        `<style ${SHARD}="tf3pl5vp" nonce="abc123">.tf3pl5vp{padding:47px}</style>`,
                        `<style ${SHARD}="tf3pkv0q" nonce="abc123">.tf3pkv0q{padding:48px}</style>`,
                        `<style ${SHARD}="tf3pku8b" nonce="abc123">.tf3pku8b{padding:49px}</style>`,
                    ].join(''),
                );
            });

            it('Includes nonce attribute when active', () => {
                const cls = 'tf' + djb2Hash('display:grid');
                engine.register('display:grid', cls, {});
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'shards'})).toBe(
                    '<style data-tfs-s="tf18n9a1p" nonce="abc123">.tf18n9a1p{display:grid}</style>',
                );
            });
        });

        describe('mode:file', () => {
            it('flush returns raw css string only, no tags or links', () => {
                const cls = 'tf' + djb2Hash('color:blue');
                engine.register('color:blue', cls, {});
                const raw = engine.flush({mode: 'file'});

                expect(raw).toBe(`.${cls}{color:blue}`);
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2Hash(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'file'})).toBe(
                    [
                        '.tf1dma5fa{padding:0px}',
                        '.tf1dma4mv{padding:1px}',
                        '.tf1dma0hg{padding:2px}',
                        '.tf1dma67p{padding:3px}',
                        '.tf1dma22a{padding:4px}',
                        '.tf1dma19v{padding:5px}',
                        '.tf1dm9x4g{padding:6px}',
                        '.tf1dma2up{padding:7px}',
                        '.tf1dm9ypq{padding:8px}',
                        '.tf1dm9xxb{padding:9px}',
                        '.tf3pqeav{padding:10px}',
                        '.tf3pqf3a{padding:11px}',
                        '.tf3pqfvp{padding:12px}',
                        '.tf3pqa5g{padding:13px}',
                        '.tf3pqaxv{padding:14px}',
                        '.tf3pqbqa{padding:15px}',
                        '.tf3pqcip{padding:16px}',
                        '.tf3pq6sg{padding:17px}',
                        '.tf3pq7lb{padding:18px}',
                        '.tf3pq8dq{padding:19px}',
                        '.tf3pmlac{padding:20px}',
                        '.tf3pmkhx{padding:21px}',
                        '.tf3pmq86{padding:22px}',
                        '.tf3pmpfr{padding:23px}',
                        '.tf3pmhxc{padding:24px}',
                        '.tf3pmh4x{padding:25px}',
                        '.tf3pmmv6{padding:26px}',
                        '.tf3pmm2r{padding:27px}',
                        '.tf3pmeks{padding:28px}',
                        '.tf3pmdsd{padding:29px}',
                        '.tf3pouqt{padding:30px}',
                        '.tf3povj8{padding:31px}',
                        '.tf3pozon{padding:32px}',
                        '.tf3potye{padding:33px}',
                        '.tf3pordt{padding:34px}',
                        '.tf3pos68{padding:35px}',
                        '.tf3powbn{padding:36px}',
                        '.tf3poqle{padding:37px}',
                        '.tf3poo19{padding:38px}',
                        '.tf3pooto{padding:39px}',
                        '.tf3pl1qa{padding:40px}',
                        '.tf3pl0xv{padding:41px}',
                        '.tf3pl3b4{padding:42px}',
                        '.tf3pl2ip{padding:43px}',
                        '.tf3pl53a{padding:44px}',
                        '.tf3pl4av{padding:45px}',
                        '.tf3pl6o4{padding:46px}',
                        '.tf3pl5vp{padding:47px}',
                        '.tf3pkv0q{padding:48px}',
                        '.tf3pku8b{padding:49px}',
                    ].join(''),
                );
            });
        });
    });

    describe('inject()', () => {
        it('Replaces marker if present', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.inject(`<div>${MARKER}Hello there</div>`)).toBe(
                ['<div>', '<style data-tfs-s="tf1tlgz3l">.tf1tlgz3l{color:red}</style>', 'Hello there</div>'].join(''),
            );
        });

        it('Includes nonce attribute when active', () => {
            const cls = 'tf' + djb2Hash('color:red');
            setActiveCtx(new MockContext({nonce: 'abc123'}));
            engine.register('color:red', cls, {});
            expect(engine.inject(`<div>${MARKER}Hello there</div>`)).toBe(
                ['<div>', '<style data-tfs-s="tf1tlgz3l" nonce="abc123">.tf1tlgz3l{color:red}</style>', 'Hello there</div>'].join(''),
            );
        });

        it('Prepends styles if marker is not present', () => {
            const cls = 'tf' + djb2Hash('color:red');
            engine.register('color:red', cls, {});
            expect(engine.inject('<main>hello</main>')).toBe(
                ['<main>hello</main>', '<style data-tfs-s="tf1tlgz3l">.tf1tlgz3l{color:red}</style>'].join(''),
            );
        });

        it('Only replaces the first occurrence of the style marker and strips the rest', () => {
            const cls = 'tf' + djb2Hash('border:1px solid red');
            engine.register('border:1px solid red', cls, {});
            expect(engine.inject(`<div>${MARKER}<span>${MARKER}</span></div>`)).toBe(
                ['<div>', '<style data-tfs-s="tf12bzjpg">.tf12bzjpg{border:1px solid red}</style>', '<span></span>', '</div>'].join(''),
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
                    `<style ${PRIME}>.tf1tlgz3l{color:red}</style>`,
                    `<script>${OBSERVER}</script>`,
                    '</html>',
                ].join(''),
            );
        });

        it('Injects <link> when HTML starts with <html>', () => {
            const cls = 'tf' + djb2Hash('margin:0');
            engine.register('margin:0', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<html>${MARKER}</html>`)).toBe(
                [
                    '<html>',
                    '<link rel="stylesheet" href="/styles.css">',
                    `<style ${PRIME}>.tfpmr7gx{margin:0}</style>`,
                    '<script>',
                    OBSERVER,
                    '</script>',
                    '</html>',
                ].join(''),
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
                    `<style nonce="abc123" ${PRIME}>.tf1tlgz3l{color:red}</style>`,
                    `<script nonce="abc123">${OBSERVER}</script>`,
                    '</html>',
                ].join(''),
            );
        });

        it('Does not inject <link> if mount_path is set but HTML is not full document', () => {
            const cls = 'tf' + djb2Hash('padding:0');
            engine.register('padding:0', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<div>${MARKER}content</div>`)).toBe(
                ['<div>', `<style ${SHARD}="tf8pxw5a">.tf8pxw5a{padding:0}</style>`, 'content</div>'].join(''),
            );
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

            expect(engine.flush({mode: 'style'})).toBe(
                [
                    '<style>',
                    '.tfn8zwv2{border-radius:0px}',
                    '.tfn8zw2n{border-radius:1px}',
                    '.tfn8zyfw{border-radius:2px}',
                    '.tfn8zxnh{border-radius:3px}',
                    '.tfn8zti2{border-radius:4px}',
                    '.tfn8zspn{border-radius:5px}',
                    '.tfn8zv2w{border-radius:6px}',
                    '.tfn8zuah{border-radius:7px}',
                    '.tfn903km{border-radius:8px}',
                    '.tfn902s7{border-radius:9px}',
                    '.tf1kxtfin{border-radius:10px}',
                    '.tf1kxtgb2{border-radius:11px}',
                    '.tf1kxtakt{border-radius:12px}',
                    '.tf1kxtbd8{border-radius:13px}',
                    '.tf1kxtc5n{border-radius:14px}',
                    '.tf1kxtcy2{border-radius:15px}',
                    '.tf1kxt77t{border-radius:16px}',
                    '.tf1kxt808{border-radius:17px}',
                    '.tf1kxtm87{border-radius:18px}',
                    '.tf1kxtn0m{border-radius:19px}',
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
            expect(engine.flush({mode: 'style'})).toBe(
                ['<style>', '.tf9loqhw{font-weight:bold}', '@media (min-width: 800px){.tf1txfpkp{font-size:0.9rem}}', '</style>'].join(''),
            );
            engine.reset();
            expect(engine.flush()).toBe('');
        });
    });
});
