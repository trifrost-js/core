/* eslint-disable no-console */
/* eslint-disable max-len */

import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {Script, SCRIPT_MARKER} from '../../../../../lib/modules/JSX/script/Script';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import CONSTANTS from '../../../../constants';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import {setActiveScriptEngine} from '../../../../../lib/modules/JSX/script/use';
import * as Generic from '../../../../../lib/utils/Generic';
import {MockContext} from '../../../../MockContext';

describe('JSX - <Script>', () => {
    let engine:ScriptEngine;
    let idcount = 0;
    beforeEach(() => {
        idcount = 0;
        vi.spyOn(Generic, 'hexId').mockImplementation(() => `id-${++idcount}`);
        engine = new ScriptEngine();
        setActiveScriptEngine(engine);
        setActiveCtx(new MockContext({nonce: 'my-nonce'}));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        setActiveCtx(null);
        setActiveScriptEngine(null);
    });

    it('Returns null if passed a non-object', () => {
        for (const el of CONSTANTS.NOT_OBJECT) {
            expect(Script(el as any)).toBe(null);
        }
    });

    describe('src', () => {
        it('Renders a script tag with src', () => {
            const out = Script({src: 'https://cdn.example.com/app.js'});
            expect(out).toEqual({
                key: null,
                type: 'script',
                props: {
                    nonce: 'my-nonce',
                    src: 'https://cdn.example.com/app.js',
                    type: 'text/javascript',
                },
            });
            expect(engine.flush()).toBe('');
        });

        it('Applies async and defer when specified', () => {
            const out = Script({src: '/bundle.js', async: true, defer: true});
            expect(out).toEqual({
                key: null,
                type: 'script',
                props: {
                    nonce: 'my-nonce',
                    src: '/bundle.js',
                    async: true,
                    defer: true,
                    type: 'text/javascript',
                },
            });
            expect(engine.flush()).toBe('');
        });

        it('Sets script type to module if specified', () => {
            const out = Script({src: '/mod.js', type: 'module'});
            expect(out).toEqual({
                key: null,
                type: 'script',
                props: {
                    nonce: 'my-nonce',
                    src: '/mod.js',
                    type: 'module',
                },
            });
            expect(engine.flush()).toBe('');
        });

        it('Includes nonce if explicitly provided', () => {
            const out = Script({src: '/a.js', nonce: 'abc123'});
            expect(out).toEqual({
                key: null,
                type: 'script',
                props: {
                    src: '/a.js',
                    nonce: 'abc123',
                    type: 'text/javascript',
                },
            });
            expect(engine.flush()).toBe('');
        });

        it('Does not include nonce if not active', () => {
            setActiveCtx(null);
            const out = Script({src: '/b.js'});
            expect(out).toEqual({
                key: null,
                type: 'script',
                props: {
                    src: '/b.js',
                    type: 'text/javascript',
                },
            });
            expect(engine.flush()).toBe('');
        });

        it('Skips nonce if empty string or invalid', () => {
            setActiveCtx(null);
            for (const value of CONSTANTS.NOT_STRING) {
                const out = Script({src: '/c.js', nonce: value as any});
                expect(out).toEqual({
                    key: null,
                    type: 'script',
                    props: {
                        src: '/c.js',
                        type: 'text/javascript',
                    },
                });
            }
            expect(engine.flush()).toBe('');
        });
    });

    describe('engine', () => {
        it('Registers function and data with engine', () => {
            const out = Script({
                data: {enabled: true},
                children: (el, data) => {
                    el.dataset.enabled = String(data.enabled);
                },
            });

            expect(out).toEqual({
                key: null,
                type: '__TRIFROST_HYDRATED_SCRIPT__',
                props: {
                    fn_id: 'id-1',
                    data_id: 'id-2',
                },
            });

            const flushed = engine.flush();
            expect(flushed).toBe([
                '<script nonce="my-nonce">',
                '(function(){',
                'const TFD = {"id-2":{"enabled":true}};',
                'const TFF = {"id-1":function(el,data){el.dataset.enabled = String(data.enabled);}};',
                'for (const id in TFF) {',
                'const n = document.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for (let i = 0; i < n.length; i++) {',
                'const d = n[i].getAttribute("data-tfhd");',
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}',
                '}',
                '}',
                '})();</script>',
            ].join(''));
        });

        it('Deduplicates same function bodies', () => {
            expect(Script({
                data: {x: 1},
                children: el => {
                    el.textContent = 'hi';
                },
            })).toEqual({
                key: null,
                type: SCRIPT_MARKER,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-1',
                },
            });

            expect(Script({
                data: {y: 2},
                children: el => {
                    el.textContent = 'hi';
                },
            })).toEqual({
                key: null,
                type: SCRIPT_MARKER,
                props: {
                    data_id: 'id-3',
                    fn_id: 'id-1',
                },
            });

            expect(engine.flush()).toBe([
                '<script nonce="my-nonce">',
                '(function(){',
                'const TFD = {"id-2":{"x":1},"id-3":{"y":2}};',
                'const TFF = {"id-1":function(el,data){el.textContent = "hi";}};',
                'for (const id in TFF) {',
                'const n = document.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for (let i = 0; i < n.length; i++) {',
                'const d = n[i].getAttribute("data-tfhd");',
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}',
                '}',
                '}',
                '})();</script>',
            ].join(''));
        });

        it('Deduplicates identical JSON data', () => {
            expect(Script({
                data: {a: 1, b: 2},
                children: el => el.innerText = 'X',
            })).toEqual({
                key: null,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-1',
                },
                type: SCRIPT_MARKER,
            });

            expect(Script({
                data: {a: 1, b: 2},
                children: el => el.innerText = 'Y',
            })).toEqual({
                key: null,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-3',
                },
                type: SCRIPT_MARKER,
            });

            expect(engine.flush()).toBe([
                '<script nonce="my-nonce">',
                '(function(){',
                'const TFD = {"id-2":{"a":1,"b":2}};',
                'const TFF = {"id-1":function(el,data){(el) => el.innerText = "X},"id-3":function(el,data){(el) => el.innerText = "Y}};',
                'for (const id in TFF) {',
                'const n = document.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for (let i = 0; i < n.length; i++) {',
                'const d = n[i].getAttribute("data-tfhd");',
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}',
                '}',
                '}',
                '})();</script>',
            ].join(''));
        });

        it('Does not deduplicate similar but not identical JSON data', () => {
            expect(Script({
                data: {a: 1, b: 2},
                children: el => el.innerText = 'X',
            })).toEqual({
                key: null,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-1',
                },
                type: SCRIPT_MARKER,
            });

            expect(Script({
                data: {b: 2, a: 1},
                children: el => el.innerText = 'Y',
            })).toEqual({
                key: null,
                props: {
                    data_id: 'id-4',
                    fn_id: 'id-3',
                },
                type: SCRIPT_MARKER,
            });

            expect(engine.flush()).toBe([
                '<script nonce="my-nonce">',
                '(function(){',
                'const TFD = {"id-2":{"a":1,"b":2},"id-4":{"b":2,"a":1}};',
                'const TFF = {"id-1":function(el,data){(el) => el.innerText = "X},"id-3":function(el,data){(el) => el.innerText = "Y}};',
                'for (const id in TFF) {',
                'const n = document.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for (let i = 0; i < n.length; i++) {',
                'const d = n[i].getAttribute("data-tfhd");',
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}',
                '}',
                '}',
                '})();</script>',
            ].join(''));
        });

        it('Handles null data correctly', () => {
            const out = Script({
                children: el => {
                    el.className = 'injected';
                },
            });

            expect(out).toEqual({
                key: null,
                type: '__TRIFROST_HYDRATED_SCRIPT__',
                props: {
                    fn_id: 'id-1',
                    data_id: null,
                },
            });

            expect(engine.flush()).toBe([
                '<script nonce="my-nonce">',
                '(function(){',
                'const TFD = {};',
                'const TFF = {"id-1":function(el,data){el.className = "injected";}};',
                'for (const id in TFF) {',
                'const n = document.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for (let i = 0; i < n.length; i++) {',
                'const d = n[i].getAttribute("data-tfhd");',
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}',
                '}',
                '}',
                '})();</script>',
            ].join(''));
        });

        it('Resets internal maps on reset()', () => {
            Script({
                data: {reset: true},
                children: el => el.id = 'resettable',
            });

            engine.reset();

            expect(engine.flush()).toBe('');
        });

        it('Injects script at end if no </body>', () => {
            Script({
                data: {a: 1},
                children: el => el.textContent = 'hi',
            });

            const result = engine.inject('<div>Hello</div>');
            expect(result).toMatch(/^<div>Hello<\/div><script/);
        });

        it('Injects script before </body>', () => {
            Script({
                data: {b: 2},
                children: el => el.textContent = 'bye',
            });

            const result = engine.inject('<html><body><h1>Test</h1></body></html>');
            expect(result).toMatch(/<\/script><\/body><\/html>$/);
        });

        it('strips async fat arrow __name() wrappers', () => {
            const fn = () => {
                const load = async () => {
                    /* @ts-ignore */
                    console.log('loaded');
                };
                /* @ts-ignore */
                __name(load, 'load');
                document.addEventListener('click', load);
            };

            const out = Script({children: fn});
            expect(out?.props?.fn_id).toBe('id-1');

            const flushed = engine.flush();
            expect(flushed).toContain('async () => {');
            expect(flushed).not.toContain('__name');
        });

        it('strips __name for async function declarations', () => {
            const fn = Object.assign(() => {}, {
                toString: () => `
                (el) => {
                  async function hydrate () {
                    console.log("hydrated");
                  };
                  __name(hydrate, "hydrate");
                  el.addEventListener('click', hydrate);
                }
              `,
            });

            const out = Script({children: fn});
            expect(out?.props?.fn_id).toBe('id-1');

            const flushed = engine.flush();
            expect(flushed).toContain('async function hydrate ()');
            expect(flushed).not.toContain('__name');
        });

        it('Cleans whitespace and trims function body', () => {
            /* @ts-ignore */
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fn = (el: HTMLElement) => {
                const msg = '    test   ';
                console.log(msg);
            };

            const out = Script({children: fn});
            expect(out?.props?.fn_id).toBe('id-1');

            expect(engine.flush()).toBe([
                '<script nonce="my-nonce">(function(){const TFD = {};const TFF = {"id-1":function(el,data){const msg = "    test   ";',
                '        console.log(msg);}};for (const id in TFF) {const n = document.querySelectorAll(`[data-tfhf="${id}"]`);for (let i = 0; i < n.length; i++) {const d = n[i].getAttribute("data-tfhd");try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}}}})();</script>',
            ].join('\n'));
        });

        it('Handles functions that are not formatted as fat-arrows', () => {
            const fn = Object.assign(() => {}, {
                toString: () => '{ console.log("no arrow"); }',
            });

            const out = Script({children: fn});
            expect(out?.props?.fn_id).toBe('id-1');

            const flushed = engine.flush();
            expect(flushed).toContain('console.log("no arrow");');
        });

        it('Preserves formatting and indentation', () => {
            const fn = (node: HTMLElement) => {
                function greet () {
                    console.log('hello');
                }

                node.addEventListener('click', greet);
            };

            Script({children: fn});
            expect(engine.flush()).toBe([
                '<script nonce="my-nonce">(function(){const TFD = {};const TFF = {"id-1":function(el,data){function greet() {',
                '          console.log("hello");',
                '        }',
                '        node.addEventListener("click", greet);}};for (const id in TFF) {const n = document.querySelectorAll(`[data-tfhf="${id}"]`);for (let i = 0; i < n.length; i++) {const d = n[i].getAttribute("data-tfhd");try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}}}})();</script>',
            ].join('\n'));
        });

        it('Returns html unchanged if no functions registered', () => {
            const emptyEngine = new ScriptEngine();
            setActiveScriptEngine(emptyEngine);

            const html = '<main>hello</main>';
            expect(emptyEngine.inject(html)).toBe(html);
        });

        it('Returns empty string from flush if no functions', () => {
            const emptyEngine = new ScriptEngine();
            expect(emptyEngine.flush()).toBe('');
        });

        it('Returns null if no active engine', () => {
            setActiveScriptEngine(null);
            const fn = (node: HTMLElement) => {
                function greet () {
                    console.log('hello');
                }

                node.addEventListener('click', greet);
            };

            expect(Script({children: fn})).toBe(null);
        });

        it('Rejects string as children', () => {
            const out = Script({children: 'console.log("not allowed")' as any});
            expect(out).toBe(null);
        });
    });
});
