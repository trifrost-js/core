/* eslint-disable no-console */

import * as Hash from '@valkyriestudios/utils/hash';
import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {Script, SCRIPT_MARKER} from '../../../../../lib/modules/JSX/script/Script';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import CONSTANTS from '../../../../constants';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import {setActiveScriptEngine} from '../../../../../lib/modules/JSX/script/use';
import {MockContext} from '../../../../MockContext';

describe('Modules - JSX - script - <Script>', () => {
    let engine: ScriptEngine;
    let idcount = 0;
    beforeEach(() => {
        idcount = 0;
        vi.spyOn(Hash, 'djb2').mockImplementation(() => `id-${++idcount}`);
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

    describe('pure', () => {
        it('Eagerly executes pure function (no args) as inline script', () => {
            const out = Script({
                children: () => {
                    console.log('hello world');
                },
            });

            expect(out).toEqual({
                key: null,
                type: 'script',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: expect.stringContaining('console.log("hello world")'),
                    },
                    nonce: 'my-nonce',
                },
            });

            // Ensure no engine functions were flushed
            expect(engine.flush()).toBe('');
        });

        it('Skips eager script if function body is malformed', () => {
            const fn = Object.assign(() => {}, {
                toString: () => 'malformed',
            });

            const out = Script({children: fn});
            expect(out).toBe(null);
        });

        it('Minifies and inlines function with extra spacing or comments', () => {
            const out = Script({
                children: () => {
                    // comment
                    const msg = 'hi';
                    console.log(msg);
                },
            });

            expect(out).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: '(function(){const msg="hi";console.log(msg);})();',
                    },
                    nonce: 'my-nonce',
                },
                type: 'script',
            });
        });

        it('Applies custom nonce on pure eager inline function', () => {
            const out = Script({
                nonce: 'custom-nonce-xyz',
                children: () => {
                    (window as any).x = 1;
                },
            });

            expect(out).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: '(function(){window.x=1;})();',
                    },
                    nonce: 'custom-nonce-xyz',
                },
                type: 'script',
            });
        });
    });

    describe('engine', () => {
        it('Registers function and data with engine', () => {
            const out = Script({
                data: {enabled: true},
                children: ({el, data}) => (el.dataset.enabled = String(data.enabled)),
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
            expect(flushed).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data})=>el.dataset.enabled=String(data.enabled)]],',
                    '[["id-2",{"enabled":true}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Deduplicates same function bodies', () => {
            expect(
                Script({
                    data: {x: 1},
                    children: ({el}) => (el.textContent = 'hi'),
                }),
            ).toEqual({
                key: null,
                type: SCRIPT_MARKER,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-1',
                },
            });

            expect(
                Script({
                    data: {y: 2},
                    children: ({el}) => (el.textContent = 'hi'),
                }),
            ).toEqual({
                key: null,
                type: SCRIPT_MARKER,
                props: {
                    data_id: 'id-3',
                    fn_id: 'id-1',
                },
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el})=>el.textContent="hi"]],',
                    '[',
                    '["id-2",{"x":1}],',
                    '["id-3",{"y":2}]',
                    '],self?.parentNode);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Deduplicates identical JSON data', () => {
            expect(
                Script({
                    data: {a: 1, b: 2},
                    children: ({el}) => (el.innerText = 'X'),
                }),
            ).toEqual({
                key: null,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-1',
                },
                type: SCRIPT_MARKER,
            });

            expect(
                Script({
                    data: {a: 1, b: 2},
                    children: ({el}) => (el.innerText = 'Y'),
                }),
            ).toEqual({
                key: null,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-3',
                },
                type: SCRIPT_MARKER,
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[',
                    '["id-1",({el})=>el.innerText="X"],',
                    '["id-3",({el})=>el.innerText="Y"]',
                    '],',
                    '[["id-2",{"a":1,"b":2}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Does not deduplicate similar but not identical JSON data', () => {
            expect(
                Script({
                    data: {a: 1, b: 2},
                    children: ({el}) => (el.innerText = 'X'),
                }),
            ).toEqual({
                key: null,
                props: {
                    data_id: 'id-2',
                    fn_id: 'id-1',
                },
                type: SCRIPT_MARKER,
            });

            expect(
                Script({
                    data: {b: 2, a: 1},
                    children: ({el}) => (el.innerText = 'Y'),
                }),
            ).toEqual({
                key: null,
                props: {
                    data_id: 'id-4',
                    fn_id: 'id-3',
                },
                type: SCRIPT_MARKER,
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[',
                    '["id-1",({el})=>el.innerText="X"],',
                    '["id-3",({el})=>el.innerText="Y"]',
                    '],',
                    '[',
                    '["id-2",{"a":1,"b":2}],',
                    '["id-4",{"b":2,"a":1}]',
                    '],self?.parentNode);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Handles null data correctly', () => {
            const out = Script({
                children: ({el}) => (el.className = 'injected'),
            });

            expect(out).toEqual({
                key: null,
                type: '__TRIFROST_HYDRATED_SCRIPT__',
                props: {
                    fn_id: 'id-1',
                    data_id: null,
                },
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el})=>el.className="injected"]],',
                    '[],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Resets internal maps on reset()', () => {
            Script({
                data: {reset: true},
                children: ({el}) => (el.id = 'resettable'),
            });

            engine.reset();

            expect(engine.flush()).toBe('');
        });

        it('Injects script at end if no </body>', () => {
            Script({
                data: {a: 1},
                children: ({el}) => (el.textContent = 'hi'),
            });

            const result = engine.inject('<div>Hello</div>');
            expect(result).toMatch(/^<div>Hello<\/div><script/);
        });

        it('Injects script before </body>', () => {
            Script({
                data: {b: 2},
                children: ({el}) => (el.textContent = 'bye'),
            });

            const result = engine.inject('<html><body><h1>Test</h1></body></html>');
            expect(result).toMatch(/<\/script><\/body><\/html>$/);
        });

        it('Minifies', () => {
            const fn = ({el}) => {
                function greet() {
                    console.log('hello');
                }

                el.addEventListener('click', greet);
            };

            Script({children: fn});
            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el})=>{function greet(){console.log("hello");}el.addEventListener("click",greet);}]],',
                    '[],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Returns html unchanged if no functions registered', () => {
            const emptyEngine = new ScriptEngine();
            setActiveScriptEngine(emptyEngine);

            const html = '<main>hello</main>';
            expect(emptyEngine.inject(html)).toBe(html);
        });

        it('Injects atomic vm/globals when atomic + root are enabled and functions exist', () => {
            engine.setAtomic(true);
            engine.setRoot(true);

            const out = Script({
                data: {enabled: true},
                children: ({el, data}) => {
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
            expect(flushed).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data})=>{el.dataset.enabled=String(data.enabled);}]],',
                    '[["id-2",{"enabled":true}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Injects atomic vm but no globals when atomic is enabled but root isnt and functions exist', () => {
            engine.setAtomic(true);
            engine.setRoot(false);

            const out = Script({
                data: {enabled: true},
                children: ({el, data}) => {
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
            expect(flushed).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data})=>{el.dataset.enabled=String(data.enabled);}]],',
                    '[["id-2",{"enabled":true}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Deduplicates identical function bodies in atomic mode', () => {
            engine.setAtomic(true);

            Script({
                data: {x: 1},
                children: ({el, data}) => {
                    el.textContent = String(data);
                },
            });
            Script({
                data: {y: 2},
                children: ({el, data}) => {
                    el.textContent = String(data);
                },
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data})=>{el.textContent=String(data);}]],',
                    '[["id-2",{"x":1}],["id-3",{"y":2}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Deduplicates identical data bodies in atomic mode', () => {
            engine.setAtomic(true);

            Script({
                data: {x: 1},
                children: ({el, data}) => (el.textContent = String(data)),
            });
            Script({
                data: {x: 1},
                children: ({el, data}) => (el.innerHTML = String(data)),
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[',
                    '["id-1",({el,data})=>el.textContent=String(data)],',
                    '["id-3",({el,data})=>el.innerHTML=String(data)]',
                    '],',
                    '[["id-2",{"x":1}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Supports Script before enabling atomic mode', () => {
            Script({
                data: {msg: 'early'},
                children: ({el, data}) => (el.textContent = data.msg),
            });

            engine.setAtomic(true);

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data})=>el.textContent=data.msg]],',
                    '[["id-2",{"msg":"early"}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Allows multiple root/atomic calls safely', () => {
            Script({
                data: {msg: 'early'},
                children: ({el, data}) => (el.textContent = data.msg),
            });

            engine.setAtomic(true);
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setRoot(true);

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data})=>el.textContent=data.msg]],',
                    '[["id-2",{"msg":"early"}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Preserves access to tfRelay and tfStore in function body', () => {
            engine.setAtomic(true);
            engine.setRoot(true);

            Script({
                data: {msg: 'hello'},
                children: ({el, data, $}) => {
                    el.$publish('eventA', data.msg);
                    $.storeSet('lastMessage', data.msg);
                },
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data,$})=>{el.$publish("eventA",data.msg);$.storeSet("lastMessage",data.msg);}]],',
                    '[["id-2",{"msg":"hello"}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Preserves access to tfRelay and tfStore in function body with mount path', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath('/static.js');

            Script({
                data: {msg: 'hello'},
                children: ({el, data, $}) => {
                    el.$publish('eventA', data.msg);
                    $.storeSet('lastMessage', data.msg);
                },
            });

            expect(engine.flush()).toBe(
                [
                    '<script nonce="my-nonce">',
                    '(function(w){',
                    'const self=document.currentScript;',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",({el,data,$})=>{el.$publish("eventA",data.msg);$.storeSet("lastMessage",data.msg);}]],',
                    '[["id-2",{"msg":"hello"}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '};',
                    'if(!w.$tfarc){',
                    'const wait=()=>{w.$tfarc?run():setTimeout(wait,1)};',
                    'wait();',
                    '}else{',
                    'run()',
                    '}',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Escapes closing script tags in data', () => {
            Script({
                data: {msg: '</script><script>alert(1)</script>'},
                children: ({el}) => {
                    console.log(el);
                },
            });

            const flushed = engine.flush();
            expect(flushed).not.toContain('</script><script>');
            expect(flushed).toContain('<\\/script>');
        });

        it('Returns empty string from flush if no functions and not atomic', () => {
            const emptyEngine = new ScriptEngine();
            expect(emptyEngine.flush()).toBe('');
        });

        it('Returns nothing from flush if no functions and atomic with root and mount path', () => {
            const atomicEngine = new ScriptEngine();
            atomicEngine.setAtomic(true);
            atomicEngine.setRoot(true);
            atomicEngine.setMountPath('/static.js');
            expect(atomicEngine.flush()).toBe('');
        });

        it('Wraps bare arrow function before registering with engine', () => {
            const out = Script({
                data: {msg: 'wrapped'},
                /* @ts-expect-error Should be good */
                children: el => (el.textContent = 'wrapped'),
            });

            expect(out).toEqual({
                key: null,
                type: SCRIPT_MARKER,
                props: {
                    fn_id: 'id-1',
                    data_id: 'id-2',
                },
            });

            expect(engine.flush()).toContain('(el)=>el.textContent="wrapped"');
        });

        it('Does not wrap standard named functions', () => {
            const out = Script({
                data: {msg: 'standard'},
                children: function namedFn({el}) {
                    el.textContent = 'standard';
                },
            });

            expect(out).toEqual({
                key: null,
                type: SCRIPT_MARKER,
                props: {
                    fn_id: 'id-1',
                    data_id: 'id-2',
                },
            });

            expect(engine.flush()).toContain('function namedFn({el})');
        });

        it('Returns empty string from flush if no functions and atomic but not root', () => {
            engine.setAtomic(true);
            engine.setRoot(false);
            const emptyEngine = new ScriptEngine();
            expect(emptyEngine.flush()).toBe('');
        });

        it('Returns null if no active engine', () => {
            setActiveScriptEngine(null);
            const fn = ({el}) => {
                function greet() {
                    console.log('hello');
                }

                el.addEventListener('click', greet);
            };

            expect(Script({children: fn})).toBe(null);
        });

        it('Rejects string as children', () => {
            const out = Script({children: 'console.log("not allowed")' as any});
            expect(out).toBe(null);
        });
    });
});
