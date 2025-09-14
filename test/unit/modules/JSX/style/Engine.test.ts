import {djb2} from '@valkyriestudios/utils/hash';
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {StyleEngine, OBSERVER, PRIME, SHARD} from '../../../../../lib/modules/JSX/style/Engine';
import {MARKER} from '../../../../../lib/modules/JSX/style/Style';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import CONSTANTS from '../../../../constants';
import {MockContext} from '../../../../MockContext';

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
                    'function c(n,p){',
                    'if(n.nodeType===Node.ELEMENT_NODE&&n.tagName==="STYLE"&&n.hasAttribute("data-tfs-s")){',
                    'const s=n.getAttribute("data-tfs-s");',
                    'if(!s||cn.has(s))return n.remove();',
                    'cn.add(s);',
                    'if(n.textContent)p.add(n.textContent);',
                    'return n.remove();',
                    '}',
                    'n.childNodes?.forEach(k=>c(k,p));',
                    '}',
                    'function b(){',
                    'const o=new MutationObserver(e=>{',
                    'const pp=new Set();',
                    'for(let i=0;i<e.length;i++){',
                    'for(let y=0;y<e[i].addedNodes.length;y++){',
                    'c(e[i].addedNodes[y],pp);',
                    '}',
                    '}',
                    'if(pp.size){',
                    'const nN=document.createElement("style");',
                    'const nS=window.$tfnonce;',
                    'if(typeof nS==="string"&&nS.length)nN.setAttribute("nonce",nS);',
                    'nN.setAttribute("data-tfs-ps","");',
                    'nN.textContent=[...pp.values()].join("");',
                    'prime.after(nN);',
                    '}',
                    '});',
                    'o.observe(document.body,{childList:true,subtree:true});',
                    '}',
                    'if(document.body){b();}else{document.addEventListener("DOMContentLoaded",b);}})();',
                ].join(''),
            );
        });
    });

    describe('register()', () => {
        it('Registers base styles correctly under default selector', () => {
            const cls = 'tf' + djb2('color:red');
            engine.register('color:red', cls, {});
            expect(engine.flush({mode: 'file'})).toContain(`.${cls}{color:red}`);
        });

        it('Registers media query styles correctly', () => {
            const cls = 'tf' + djb2('font-size:1rem');
            engine.register('font-size:1rem', cls, {
                query: '@media (max-width: 600px)',
            });
            expect(engine.flush({mode: 'file'})).toBe('@media (max-width: 600px){.tf2732751023{font-size:1rem}}');
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
            const cls = 'tf' + djb2('padding:1rem');
            engine.register('padding:1rem', cls, {});
            engine.register('padding:1rem', cls, {});
            expect(engine.flush({mode: 'file'})).toBe('.tf224547909{padding:1rem}');
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

        it('Registers global rule with selector explicitly set to null', () => {
            engine.register('@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}', 'fadeInKeyframes', {selector: null});
            const out = engine.flush({mode: 'file'});
            expect(out).toContain('@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}');
        });

        it('Handles @font-face block with selector null', () => {
            engine.register('@font-face { font-family: "MyFont"; src: url(font.woff2); }', 'tfFont', {
                selector: null,
            });

            const out = engine.flush({mode: 'file'});
            expect(out).toBe('@font-face { font-family: "MyFont"; src: url(font.woff2); }');
        });

        it('Registers rule with undefined selector falls back to class name', () => {
            const name = 'tfabc123';
            engine.register('color:green', name, {
                /* no selector */
            });
            const out = engine.flush({mode: 'file'});
            expect(out).toContain(`.${name}{color:green}`);
        });

        it('Registers rule with explicit selector', () => {
            engine.register('color:blue', 'tftest', {selector: '.foo'});
            expect(engine.flush({mode: 'file'})).toBe('.foo{color:blue}');
        });

        it('Registers rule with selector undefined (uses default)', () => {
            engine.register('color:green', 'tfgreen', {});
            expect(engine.flush({mode: 'file'})).toBe('.tfgreen{color:green}');
        });

        it('Registers rule with selector null (outputs rule directly)', () => {
            engine.register('body{margin:0}', 'tfbody', {selector: null});
            expect(engine.flush({mode: 'file'})).toBe('body{margin:0}');
        });

        it('Registers media rule with selector null (global rule)', () => {
            const query = '@media (min-width: 1024px)';
            engine.register('html{font-size:18px}', 'globalFontSize', {query, selector: null});
            const out = engine.flush({mode: 'file'});
            expect(out).toContain(`${query}{html{font-size:18px}}`);
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
                const cls = 'tf' + djb2('gap:2rem');
                engine.register('gap:2rem', cls, {});
                expect(engine.flush({mode: 'style'})).toBe([`<style>.tf1179619393{gap:2rem}</style>`].join(''));
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'style'})).toBe(
                    [
                        '<style>',
                        '.tf3000267766{padding:0px}',
                        '.tf3000266743{padding:1px}',
                        '.tf3000261364{padding:2px}',
                        '.tf3000268789{padding:3px}',
                        '.tf3000263410{padding:4px}',
                        '.tf3000262387{padding:5px}',
                        '.tf3000257008{padding:6px}',
                        '.tf3000264433{padding:7px}',
                        '.tf3000259070{padding:8px}',
                        '.tf3000258047{padding:9px}',
                        '.tf224620519{padding:10px}',
                        '.tf224621542{padding:11px}',
                        '.tf224622565{padding:12px}',
                        '.tf224615140{padding:13px}',
                        '.tf224616163{padding:14px}',
                        '.tf224617186{padding:15px}',
                        '.tf224618209{padding:16px}',
                        '.tf224610784{padding:17px}',
                        '.tf224611823{padding:18px}',
                        '.tf224612846{padding:19px}',
                        '.tf224442948{padding:20px}',
                        '.tf224441925{padding:21px}',
                        '.tf224449350{padding:22px}',
                        '.tf224448327{padding:23px}',
                        '.tf224438592{padding:24px}',
                        '.tf224437569{padding:25px}',
                        '.tf224444994{padding:26px}',
                        '.tf224443971{padding:27px}',
                        '.tf224434252{padding:28px}',
                        '.tf224433229{padding:29px}',
                        '.tf224548517{padding:30px}',
                        '.tf224549540{padding:31px}',
                        '.tf224554919{padding:32px}',
                        '.tf224547494{padding:33px}',
                        '.tf224544161{padding:34px}',
                        '.tf224545184{padding:35px}',
                        '.tf224550563{padding:36px}',
                        '.tf224543138{padding:37px}',
                        '.tf224539821{padding:38px}',
                        '.tf224540844{padding:39px}',
                        '.tf224370946{padding:40px}',
                        '.tf224369923{padding:41px}',
                        '.tf224372992{padding:42px}',
                        '.tf224371969{padding:43px}',
                        '.tf224375302{padding:44px}',
                        '.tf224374279{padding:45px}',
                        '.tf224377348{padding:46px}',
                        '.tf224376325{padding:47px}',
                        '.tf224362250{padding:48px}',
                        '.tf224361227{padding:49px}',
                        '</style>',
                    ].join(''),
                );
            });

            it('Includes nonce attribute when active', () => {
                const cls = 'tf' + djb2('display:grid');
                engine.register('display:grid', cls, {});
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'style'})).toBe([`<style nonce="abc123">.tf2699575837{display:grid}</style>`].join(''));
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
                const cls = 'tf' + djb2('gap:2rem');
                engine.register('gap:2rem', cls, {});
                expect(engine.flush({mode: 'prime'})).toBe(
                    [`<style ${PRIME}>.tf1179619393{gap:2rem}</style>`, '<script>', OBSERVER, '</script>'].join(''),
                );
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'prime'})).toBe(
                    [
                        '<style data-tfs-p>',
                        '.tf3000267766{padding:0px}',
                        '.tf3000266743{padding:1px}',
                        '.tf3000261364{padding:2px}',
                        '.tf3000268789{padding:3px}',
                        '.tf3000263410{padding:4px}',
                        '.tf3000262387{padding:5px}',
                        '.tf3000257008{padding:6px}',
                        '.tf3000264433{padding:7px}',
                        '.tf3000259070{padding:8px}',
                        '.tf3000258047{padding:9px}',
                        '.tf224620519{padding:10px}',
                        '.tf224621542{padding:11px}',
                        '.tf224622565{padding:12px}',
                        '.tf224615140{padding:13px}',
                        '.tf224616163{padding:14px}',
                        '.tf224617186{padding:15px}',
                        '.tf224618209{padding:16px}',
                        '.tf224610784{padding:17px}',
                        '.tf224611823{padding:18px}',
                        '.tf224612846{padding:19px}',
                        '.tf224442948{padding:20px}',
                        '.tf224441925{padding:21px}',
                        '.tf224449350{padding:22px}',
                        '.tf224448327{padding:23px}',
                        '.tf224438592{padding:24px}',
                        '.tf224437569{padding:25px}',
                        '.tf224444994{padding:26px}',
                        '.tf224443971{padding:27px}',
                        '.tf224434252{padding:28px}',
                        '.tf224433229{padding:29px}',
                        '.tf224548517{padding:30px}',
                        '.tf224549540{padding:31px}',
                        '.tf224554919{padding:32px}',
                        '.tf224547494{padding:33px}',
                        '.tf224544161{padding:34px}',
                        '.tf224545184{padding:35px}',
                        '.tf224550563{padding:36px}',
                        '.tf224543138{padding:37px}',
                        '.tf224539821{padding:38px}',
                        '.tf224540844{padding:39px}',
                        '.tf224370946{padding:40px}',
                        '.tf224369923{padding:41px}',
                        '.tf224372992{padding:42px}',
                        '.tf224371969{padding:43px}',
                        '.tf224375302{padding:44px}',
                        '.tf224374279{padding:45px}',
                        '.tf224377348{padding:46px}',
                        '.tf224376325{padding:47px}',
                        '.tf224362250{padding:48px}',
                        '.tf224361227{padding:49px}',
                        '</style>',
                        '<script>',
                        OBSERVER,
                        '</script>',
                    ].join(''),
                );
            });

            it('Includes nonce attribute when active', () => {
                const cls = 'tf' + djb2('display:grid');
                engine.register('display:grid', cls, {});
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'prime'})).toBe(
                    [
                        `<style nonce="abc123" ${PRIME}>.tf2699575837{display:grid}</style>`,
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
                const cls = 'tf' + djb2('gap:2rem');
                engine.register('gap:2rem', cls, {});
                expect(engine.flush({mode: 'shards'})).toBe(`<style ${SHARD}="tf1179619393">.tf1179619393{gap:2rem}</style>`);
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'shards'})).toBe(
                    [
                        '<style data-tfs-s="tf3000267766">.tf3000267766{padding:0px}</style>',
                        '<style data-tfs-s="tf3000266743">.tf3000266743{padding:1px}</style>',
                        '<style data-tfs-s="tf3000261364">.tf3000261364{padding:2px}</style>',
                        '<style data-tfs-s="tf3000268789">.tf3000268789{padding:3px}</style>',
                        '<style data-tfs-s="tf3000263410">.tf3000263410{padding:4px}</style>',
                        '<style data-tfs-s="tf3000262387">.tf3000262387{padding:5px}</style>',
                        '<style data-tfs-s="tf3000257008">.tf3000257008{padding:6px}</style>',
                        '<style data-tfs-s="tf3000264433">.tf3000264433{padding:7px}</style>',
                        '<style data-tfs-s="tf3000259070">.tf3000259070{padding:8px}</style>',
                        '<style data-tfs-s="tf3000258047">.tf3000258047{padding:9px}</style>',
                        '<style data-tfs-s="tf224620519">.tf224620519{padding:10px}</style>',
                        '<style data-tfs-s="tf224621542">.tf224621542{padding:11px}</style>',
                        '<style data-tfs-s="tf224622565">.tf224622565{padding:12px}</style>',
                        '<style data-tfs-s="tf224615140">.tf224615140{padding:13px}</style>',
                        '<style data-tfs-s="tf224616163">.tf224616163{padding:14px}</style>',
                        '<style data-tfs-s="tf224617186">.tf224617186{padding:15px}</style>',
                        '<style data-tfs-s="tf224618209">.tf224618209{padding:16px}</style>',
                        '<style data-tfs-s="tf224610784">.tf224610784{padding:17px}</style>',
                        '<style data-tfs-s="tf224611823">.tf224611823{padding:18px}</style>',
                        '<style data-tfs-s="tf224612846">.tf224612846{padding:19px}</style>',
                        '<style data-tfs-s="tf224442948">.tf224442948{padding:20px}</style>',
                        '<style data-tfs-s="tf224441925">.tf224441925{padding:21px}</style>',
                        '<style data-tfs-s="tf224449350">.tf224449350{padding:22px}</style>',
                        '<style data-tfs-s="tf224448327">.tf224448327{padding:23px}</style>',
                        '<style data-tfs-s="tf224438592">.tf224438592{padding:24px}</style>',
                        '<style data-tfs-s="tf224437569">.tf224437569{padding:25px}</style>',
                        '<style data-tfs-s="tf224444994">.tf224444994{padding:26px}</style>',
                        '<style data-tfs-s="tf224443971">.tf224443971{padding:27px}</style>',
                        '<style data-tfs-s="tf224434252">.tf224434252{padding:28px}</style>',
                        '<style data-tfs-s="tf224433229">.tf224433229{padding:29px}</style>',
                        '<style data-tfs-s="tf224548517">.tf224548517{padding:30px}</style>',
                        '<style data-tfs-s="tf224549540">.tf224549540{padding:31px}</style>',
                        '<style data-tfs-s="tf224554919">.tf224554919{padding:32px}</style>',
                        '<style data-tfs-s="tf224547494">.tf224547494{padding:33px}</style>',
                        '<style data-tfs-s="tf224544161">.tf224544161{padding:34px}</style>',
                        '<style data-tfs-s="tf224545184">.tf224545184{padding:35px}</style>',
                        '<style data-tfs-s="tf224550563">.tf224550563{padding:36px}</style>',
                        '<style data-tfs-s="tf224543138">.tf224543138{padding:37px}</style>',
                        '<style data-tfs-s="tf224539821">.tf224539821{padding:38px}</style>',
                        '<style data-tfs-s="tf224540844">.tf224540844{padding:39px}</style>',
                        '<style data-tfs-s="tf224370946">.tf224370946{padding:40px}</style>',
                        '<style data-tfs-s="tf224369923">.tf224369923{padding:41px}</style>',
                        '<style data-tfs-s="tf224372992">.tf224372992{padding:42px}</style>',
                        '<style data-tfs-s="tf224371969">.tf224371969{padding:43px}</style>',
                        '<style data-tfs-s="tf224375302">.tf224375302{padding:44px}</style>',
                        '<style data-tfs-s="tf224374279">.tf224374279{padding:45px}</style>',
                        '<style data-tfs-s="tf224377348">.tf224377348{padding:46px}</style>',
                        '<style data-tfs-s="tf224376325">.tf224376325{padding:47px}</style>',
                        '<style data-tfs-s="tf224362250">.tf224362250{padding:48px}</style>',
                        '<style data-tfs-s="tf224361227">.tf224361227{padding:49px}</style>',
                    ].join(''),
                );
            });

            it('Flushes large number of base rules correctly with nonces', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2(rule);
                    engine.register(rule, cls, {});
                }

                setActiveCtx(new MockContext({nonce: 'abc123'}));

                expect(engine.flush({mode: 'shards'})).toBe(
                    [
                        '<style data-tfs-s="tf3000267766" nonce="abc123">.tf3000267766{padding:0px}</style>',
                        '<style data-tfs-s="tf3000266743" nonce="abc123">.tf3000266743{padding:1px}</style>',
                        '<style data-tfs-s="tf3000261364" nonce="abc123">.tf3000261364{padding:2px}</style>',
                        '<style data-tfs-s="tf3000268789" nonce="abc123">.tf3000268789{padding:3px}</style>',
                        '<style data-tfs-s="tf3000263410" nonce="abc123">.tf3000263410{padding:4px}</style>',
                        '<style data-tfs-s="tf3000262387" nonce="abc123">.tf3000262387{padding:5px}</style>',
                        '<style data-tfs-s="tf3000257008" nonce="abc123">.tf3000257008{padding:6px}</style>',
                        '<style data-tfs-s="tf3000264433" nonce="abc123">.tf3000264433{padding:7px}</style>',
                        '<style data-tfs-s="tf3000259070" nonce="abc123">.tf3000259070{padding:8px}</style>',
                        '<style data-tfs-s="tf3000258047" nonce="abc123">.tf3000258047{padding:9px}</style>',
                        '<style data-tfs-s="tf224620519" nonce="abc123">.tf224620519{padding:10px}</style>',
                        '<style data-tfs-s="tf224621542" nonce="abc123">.tf224621542{padding:11px}</style>',
                        '<style data-tfs-s="tf224622565" nonce="abc123">.tf224622565{padding:12px}</style>',
                        '<style data-tfs-s="tf224615140" nonce="abc123">.tf224615140{padding:13px}</style>',
                        '<style data-tfs-s="tf224616163" nonce="abc123">.tf224616163{padding:14px}</style>',
                        '<style data-tfs-s="tf224617186" nonce="abc123">.tf224617186{padding:15px}</style>',
                        '<style data-tfs-s="tf224618209" nonce="abc123">.tf224618209{padding:16px}</style>',
                        '<style data-tfs-s="tf224610784" nonce="abc123">.tf224610784{padding:17px}</style>',
                        '<style data-tfs-s="tf224611823" nonce="abc123">.tf224611823{padding:18px}</style>',
                        '<style data-tfs-s="tf224612846" nonce="abc123">.tf224612846{padding:19px}</style>',
                        '<style data-tfs-s="tf224442948" nonce="abc123">.tf224442948{padding:20px}</style>',
                        '<style data-tfs-s="tf224441925" nonce="abc123">.tf224441925{padding:21px}</style>',
                        '<style data-tfs-s="tf224449350" nonce="abc123">.tf224449350{padding:22px}</style>',
                        '<style data-tfs-s="tf224448327" nonce="abc123">.tf224448327{padding:23px}</style>',
                        '<style data-tfs-s="tf224438592" nonce="abc123">.tf224438592{padding:24px}</style>',
                        '<style data-tfs-s="tf224437569" nonce="abc123">.tf224437569{padding:25px}</style>',
                        '<style data-tfs-s="tf224444994" nonce="abc123">.tf224444994{padding:26px}</style>',
                        '<style data-tfs-s="tf224443971" nonce="abc123">.tf224443971{padding:27px}</style>',
                        '<style data-tfs-s="tf224434252" nonce="abc123">.tf224434252{padding:28px}</style>',
                        '<style data-tfs-s="tf224433229" nonce="abc123">.tf224433229{padding:29px}</style>',
                        '<style data-tfs-s="tf224548517" nonce="abc123">.tf224548517{padding:30px}</style>',
                        '<style data-tfs-s="tf224549540" nonce="abc123">.tf224549540{padding:31px}</style>',
                        '<style data-tfs-s="tf224554919" nonce="abc123">.tf224554919{padding:32px}</style>',
                        '<style data-tfs-s="tf224547494" nonce="abc123">.tf224547494{padding:33px}</style>',
                        '<style data-tfs-s="tf224544161" nonce="abc123">.tf224544161{padding:34px}</style>',
                        '<style data-tfs-s="tf224545184" nonce="abc123">.tf224545184{padding:35px}</style>',
                        '<style data-tfs-s="tf224550563" nonce="abc123">.tf224550563{padding:36px}</style>',
                        '<style data-tfs-s="tf224543138" nonce="abc123">.tf224543138{padding:37px}</style>',
                        '<style data-tfs-s="tf224539821" nonce="abc123">.tf224539821{padding:38px}</style>',
                        '<style data-tfs-s="tf224540844" nonce="abc123">.tf224540844{padding:39px}</style>',
                        '<style data-tfs-s="tf224370946" nonce="abc123">.tf224370946{padding:40px}</style>',
                        '<style data-tfs-s="tf224369923" nonce="abc123">.tf224369923{padding:41px}</style>',
                        '<style data-tfs-s="tf224372992" nonce="abc123">.tf224372992{padding:42px}</style>',
                        '<style data-tfs-s="tf224371969" nonce="abc123">.tf224371969{padding:43px}</style>',
                        '<style data-tfs-s="tf224375302" nonce="abc123">.tf224375302{padding:44px}</style>',
                        '<style data-tfs-s="tf224374279" nonce="abc123">.tf224374279{padding:45px}</style>',
                        '<style data-tfs-s="tf224377348" nonce="abc123">.tf224377348{padding:46px}</style>',
                        '<style data-tfs-s="tf224376325" nonce="abc123">.tf224376325{padding:47px}</style>',
                        '<style data-tfs-s="tf224362250" nonce="abc123">.tf224362250{padding:48px}</style>',
                        '<style data-tfs-s="tf224361227" nonce="abc123">.tf224361227{padding:49px}</style>',
                    ].join(''),
                );
            });

            it('Includes nonce attribute when active', () => {
                const cls = 'tf' + djb2('display:grid');
                engine.register('display:grid', cls, {});
                setActiveCtx(new MockContext({nonce: 'abc123'}));
                expect(engine.flush({mode: 'shards'})).toBe(
                    '<style data-tfs-s="tf2699575837" nonce="abc123">.tf2699575837{display:grid}</style>',
                );
            });
        });

        describe('mode:file', () => {
            it('flush returns raw css string only, no tags or links', () => {
                const cls = 'tf' + djb2('color:blue');
                engine.register('color:blue', cls, {});
                const raw = engine.flush({mode: 'file'});

                expect(raw).toBe(`.${cls}{color:blue}`);
            });

            it('Flushes large number of base rules correctly', () => {
                for (let i = 0; i < 50; i++) {
                    const rule = `padding:${i}px`;
                    const cls = 'tf' + djb2(rule);
                    engine.register(rule, cls, {});
                }

                expect(engine.flush({mode: 'file'})).toBe(
                    [
                        '.tf3000267766{padding:0px}',
                        '.tf3000266743{padding:1px}',
                        '.tf3000261364{padding:2px}',
                        '.tf3000268789{padding:3px}',
                        '.tf3000263410{padding:4px}',
                        '.tf3000262387{padding:5px}',
                        '.tf3000257008{padding:6px}',
                        '.tf3000264433{padding:7px}',
                        '.tf3000259070{padding:8px}',
                        '.tf3000258047{padding:9px}',
                        '.tf224620519{padding:10px}',
                        '.tf224621542{padding:11px}',
                        '.tf224622565{padding:12px}',
                        '.tf224615140{padding:13px}',
                        '.tf224616163{padding:14px}',
                        '.tf224617186{padding:15px}',
                        '.tf224618209{padding:16px}',
                        '.tf224610784{padding:17px}',
                        '.tf224611823{padding:18px}',
                        '.tf224612846{padding:19px}',
                        '.tf224442948{padding:20px}',
                        '.tf224441925{padding:21px}',
                        '.tf224449350{padding:22px}',
                        '.tf224448327{padding:23px}',
                        '.tf224438592{padding:24px}',
                        '.tf224437569{padding:25px}',
                        '.tf224444994{padding:26px}',
                        '.tf224443971{padding:27px}',
                        '.tf224434252{padding:28px}',
                        '.tf224433229{padding:29px}',
                        '.tf224548517{padding:30px}',
                        '.tf224549540{padding:31px}',
                        '.tf224554919{padding:32px}',
                        '.tf224547494{padding:33px}',
                        '.tf224544161{padding:34px}',
                        '.tf224545184{padding:35px}',
                        '.tf224550563{padding:36px}',
                        '.tf224543138{padding:37px}',
                        '.tf224539821{padding:38px}',
                        '.tf224540844{padding:39px}',
                        '.tf224370946{padding:40px}',
                        '.tf224369923{padding:41px}',
                        '.tf224372992{padding:42px}',
                        '.tf224371969{padding:43px}',
                        '.tf224375302{padding:44px}',
                        '.tf224374279{padding:45px}',
                        '.tf224377348{padding:46px}',
                        '.tf224376325{padding:47px}',
                        '.tf224362250{padding:48px}',
                        '.tf224361227{padding:49px}',
                    ].join(''),
                );
            });
        });
    });

    describe('inject()', () => {
        it('Returns an empty string if disabled and not passed an html string', () => {
            engine.setDisabled(true);
            for (const el of CONSTANTS.NOT_STRING) {
                expect(engine.inject(el as any)).toBe('');
            }
        });

        it('Replaces marker if present', () => {
            const cls = 'tf' + djb2('color:red');
            engine.register('color:red', cls, {});
            expect(engine.inject(`<div>${MARKER}Hello there</div>`)).toBe(
                ['<div>', '<style data-tfs-s="tf3966365361">.tf3966365361{color:red}</style>', 'Hello there</div>'].join(''),
            );
        });

        it('Includes nonce attribute when active', () => {
            const cls = 'tf' + djb2('color:red');
            setActiveCtx(new MockContext({nonce: 'abc123'}));
            engine.register('color:red', cls, {});
            expect(engine.inject(`<div>${MARKER}Hello there</div>`)).toBe(
                ['<div>', '<style data-tfs-s="tf3966365361" nonce="abc123">.tf3966365361{color:red}</style>', 'Hello there</div>'].join(''),
            );
        });

        it('Prepends styles if marker is not present', () => {
            const cls = 'tf' + djb2('color:red');
            engine.register('color:red', cls, {});
            expect(engine.inject('<main>hello</main>')).toBe(
                ['<main>hello</main>', '<style data-tfs-s="tf3966365361">.tf3966365361{color:red}</style>'].join(''),
            );
        });

        it('Only replaces the first occurrence of the style marker and strips the rest', () => {
            const cls = 'tf' + djb2('border:1px solid red');
            engine.register('border:1px solid red', cls, {});
            expect(engine.inject(`<div>${MARKER}<span>${MARKER}</span></div>`)).toBe(
                ['<div>', '<style data-tfs-s="tf2317848964">.tf2317848964{border:1px solid red}</style>', '<span></span>', '</div>'].join(
                    '',
                ),
            );
        });

        it('Strips the markers even if engine is empty', () => {
            expect(engine.inject(`<div>${MARKER}<span>${MARKER}</span></div>`)).toBe('<div><span></span></div>');
        });

        it('Does not fail if passed a non/empty-string html', () => {
            for (const el of [...CONSTANTS.NOT_STRING, '']) {
                const cls = 'tf' + djb2('line-height:1.5');
                engine.register('line-height:1.5', cls, {});

                const output = engine.inject(el as string);
                expect(output).toBe(`<style>.${cls}{line-height:1.5}</style>`);
            }
        });

        it('Simply returns an empty string if no html is passed and engine is empty', () => {
            expect(engine.inject('')).toBe('');
        });

        it('Injects <link> when mount_path is set and HTML starts with <!DOCTYPE>', () => {
            const cls = 'tf' + djb2('color:red');
            engine.register('color:red', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<!DOCTYPE html><html>${MARKER}</html>`)).toBe(
                [
                    '<!DOCTYPE html><html>',
                    '<link rel="stylesheet" href="/styles.css">',
                    `<style ${PRIME}>.tf3966365361{color:red}</style>`,
                    `<script>${OBSERVER}</script>`,
                    '</html>',
                ].join(''),
            );
        });

        it('Injects <link> when HTML starts with <html>', () => {
            const cls = 'tf' + djb2('margin:0');
            engine.register('margin:0', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<html>${MARKER}</html>`)).toBe(
                [
                    '<html>',
                    '<link rel="stylesheet" href="/styles.css">',
                    `<style ${PRIME}>.tf1549875345{margin:0}</style>`,
                    '<script>',
                    OBSERVER,
                    '</script>',
                    '</html>',
                ].join(''),
            );
        });

        it('Injects <link> with nonce when mount_path is set and nonce context is active', () => {
            const cls = 'tf' + djb2('color:red');
            engine.register('color:red', cls, {});
            engine.setMountPath('/styles.css');
            setActiveCtx(new MockContext({nonce: 'abc123'}));

            expect(engine.inject(`<!DOCTYPE html><html>${MARKER}</html>`)).toBe(
                [
                    '<!DOCTYPE html><html>',
                    '<link rel="stylesheet" nonce="abc123" href="/styles.css">',
                    `<style nonce="abc123" ${PRIME}>.tf3966365361{color:red}</style>`,
                    `<script nonce="abc123">${OBSERVER}</script>`,
                    '</html>',
                ].join(''),
            );
        });

        it('Does not inject <link> if mount_path is set but HTML is not full document', () => {
            const cls = 'tf' + djb2('padding:0');
            engine.register('padding:0', cls, {});
            engine.setMountPath('/styles.css');

            expect(engine.inject(`<div>${MARKER}content</div>`)).toBe(
                ['<div>', `<style ${SHARD}="tf527301118">.tf527301118{padding:0}</style>`, 'content</div>'].join(''),
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
                engine.register(rule, 'tf' + djb2(rule), {});
            }

            expect(engine.flush({mode: 'style'})).toBe(
                [
                    '<style>',
                    '.tf1405834526{border-radius:0px}',
                    '.tf1405833503{border-radius:1px}',
                    '.tf1405836572{border-radius:2px}',
                    '.tf1405835549{border-radius:3px}',
                    '.tf1405830170{border-radius:4px}',
                    '.tf1405829147{border-radius:5px}',
                    '.tf1405832216{border-radius:6px}',
                    '.tf1405831193{border-radius:7px}',
                    '.tf1405843222{border-radius:8px}',
                    '.tf1405842199{border-radius:9px}',
                    '.tf3442906319{border-radius:10px}',
                    '.tf3442907342{border-radius:11px}',
                    '.tf3442899917{border-radius:12px}',
                    '.tf3442900940{border-radius:13px}',
                    '.tf3442901963{border-radius:14px}',
                    '.tf3442902986{border-radius:15px}',
                    '.tf3442895561{border-radius:16px}',
                    '.tf3442896584{border-radius:17px}',
                    '.tf3442915015{border-radius:18px}',
                    '.tf3442916038{border-radius:19px}',
                    '</style>',
                ].join(''),
            );
            engine.reset();
            expect(engine.flush()).toBe('');
        });

        it('Clears both base and media style maps', () => {
            engine.register('font-weight:bold', 'tf' + djb2('font-weight:bold'), {});
            engine.register('font-size:0.9rem', 'tf' + djb2('font-size:0.9rem'), {
                query: '@media (min-width: 800px)',
            });
            expect(engine.flush({mode: 'style'})).toBe(
                [
                    '<style>',
                    '.tf580621604{font-weight:bold}',
                    '@media (min-width: 800px){.tf3986461753{font-size:0.9rem}}',
                    '</style>',
                ].join(''),
            );
            engine.reset();
            expect(engine.flush()).toBe('');
        });
    });
});
