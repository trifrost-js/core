import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import * as Generic from '../../../../../lib/utils/Generic';
import * as Nonce from '../../../../../lib/modules/JSX/ctx/nonce';
import CONSTANTS from '../../../../constants';
import {ARC_GLOBAL, ARC_GLOBAL_OBSERVER, ATOMIC_GLOBAL} from '../../../../../lib/modules/JSX/script/atomic';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';

describe('Modules - JSX - script - Engine', () => {
    let engine: ScriptEngine;

    beforeEach(() => {
        engine = new ScriptEngine();

        vi.spyOn(Nonce, 'nonce').mockReturnValue('abc123');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('register', () => {
        it('Registers a new function and data, returns both ids', () => {
            const fn = 'function({el,data}){el.innerText="Hi";}';
            const data = '{"msg":"Hi"}';

            const result = engine.register(fn, data);
            expect(result).toEqual({fn_id: '1dmtm1c', data_id: '1auq0jl'});
        });

        it('Deduplicates identical functions', () => {
            const fn = 'function(){}';

            const a = engine.register(fn, null);
            const b = engine.register(fn, null);

            expect(a.fn_id).toBe(b.fn_id);

            /* @ts-expect-error Should be good */
            expect([...engine.map_fn.entries()]).toEqual([['function(){}', 'ptukow']]);

            /* @ts-expect-error Should be good */
            expect([...engine.map_data.entries()]).toEqual([]);
        });

        it('Deduplicates identical data', () => {
            const fn1 = 'function a(){}';
            const fn2 = 'function b(){}';
            const data = '{"foo":42}';

            const a = engine.register(fn1, data);
            const b = engine.register(fn2, data);

            expect(a.data_id).toBe(b.data_id);

            /* @ts-expect-error Should be good */
            expect([...engine.map_fn.entries()]).toEqual([
                ['function a(){}', '1uzw5kx'],
                ['function b(){}', '1v0jxxe'],
            ]);

            /* @ts-expect-error Should be good */
            expect([...engine.map_data.entries()]).toEqual([['{"foo":42}', '1f6vqhl']]);
        });

        it('Handles null data by omitting data_id', () => {
            const result = engine.register('function(){}', null);
            expect(result.data_id).toBeNull();
        });

        it('Treats different key order in data as distinct payloads', () => {
            const fn = 'function({el,data}){el.textContent=data.value;}';

            const a = engine.register(fn, JSON.stringify({a: 1, b: 2}));
            const b = engine.register(fn, JSON.stringify({b: 2, a: 1}));

            expect(a.fn_id).toBe(b.fn_id);
            expect(a.data_id).not.toBe(b.data_id);
        });

        it('Handles malformed JSON strings gracefully as plain data keys', () => {
            const fn = 'function(){}';
            const malformed = '{not: "valid json}';

            const result = engine.register(fn, malformed);

            expect(result).toEqual({fn_id: 'ptukow', data_id: '1dfze00'});
            /* @ts-expect-error Should be good */
            expect([...engine.map_fn.entries()]).toEqual([['function(){}', 'ptukow']]);

            /* @ts-expect-error Should be good */
            expect([...engine.map_data.entries()]).toEqual([[malformed, '1dfze00']]);
        });

        it('Registers an empty function string without throwing', () => {
            const result = engine.register('', '{"test":true}');
            expect(result).toEqual({});
            /* @ts-expect-error Should be good */
            expect([...engine.map_fn.entries()]).toEqual([]);

            /* @ts-expect-error Should be good */
            expect([...engine.map_data.entries()]).toEqual([]);
        });

        it('handles multiple null data registrations with the same function', () => {
            const fn = 'function(){}';
            const a = engine.register(fn, null);
            const b = engine.register(fn, null);

            expect(a.fn_id).toBe(b.fn_id);
            expect(a.data_id).toBeNull();
            expect(b.data_id).toBeNull();
            /* @ts-expect-error Should be good */
            expect([...engine.map_fn.entries()]).toEqual([[fn, 'ptukow']]);

            /* @ts-expect-error Should be good */
            expect([...engine.map_data.entries()]).toEqual([]);
        });
    });

    describe('registerModule', () => {
        it('Registers a new module with unique name', () => {
            const fn = '({mod})=>mod.$publish("ready")';
            const data = '{"foo":123}';
            const name = 'dashboard.module';

            const result = engine.registerModule(fn, data, name);
            expect(result).toEqual({name: '1ywpved'});
        });

        it('Registers multiple modules with different names', () => {
            const fn1 = '({mod})=>mod.$publish("foo")';
            const fn2 = '({mod})=>mod.$publish("bar")';
            const data1 = '{"a":1}';
            const data2 = '{"b":2}';

            const res1 = engine.registerModule(fn1, data1, 'foo');
            const res2 = engine.registerModule(fn2, data2, 'bar');

            expect(res1).toEqual({name: '375gv7'});
            expect(res2).toEqual({name: '375k38'});
            /* @ts-expect-error Should be good */
            expect([...engine.map_modules.entries()]).toEqual([
                [
                    '375gv7',
                    {
                        data: data1,
                        fn: fn1,
                    },
                ],
                [
                    '375k38',
                    {
                        data: data2,
                        fn: fn2,
                    },
                ],
            ]);
        });

        it('Deduplicates modules by name even with different function or data', () => {
            const fn1 = '({mod})=>mod.$publish("foo")';
            const fn2 = '({mod})=>mod.$publish("bar")';
            const data1 = '{"a":1}';
            const data2 = '{"b":2}';

            const first = engine.registerModule(fn1, data1, 'mod-dup');
            const second = engine.registerModule(fn2, data2, 'mod-dup');

            expect(first).toEqual({name: 'ir1inj'});
            expect(second).toEqual({name: 'ir1inj'});
            /* @ts-expect-error Should be good */
            expect([...engine.map_modules.entries()]).toEqual([
                [
                    'ir1inj',
                    {
                        data: data1,
                        fn: fn1,
                    },
                ],
            ]);
        });

        it('Handles null data correctly', () => {
            const fn = '({mod})=>mod.$publish("init")';
            const result = engine.registerModule(fn, null, 'mod-null');
            expect(result).toEqual({name: '1ej6zed'});
        });

        it('Handles empty string module name (falls back to hashing empty string)', () => {
            const fn = '({mod})=>mod.$publish("blank")';
            const data = '{"foo":"bar"}';

            const result = engine.registerModule(fn, data, '');
            expect(result).toEqual({name: '45h'});
        });

        it('Handles empty string function body without crashing', () => {
            const result = engine.registerModule('', '{"key":"val"}', 'empty-fn');
            expect(result).toEqual({});
            /* @ts-expect-error Should be good */
            expect([...engine.map_modules.entries()]).toEqual([]);
        });

        it('Handles multiple null data registrations safely', () => {
            const fn = '({mod})=>mod.$publish("noop")';

            const a = engine.registerModule(fn, null, 'mod-x');
            const b = engine.registerModule(fn, null, 'mod-x');

            expect(a).toEqual({name: '2vxr2u'});
            expect(b).toEqual({name: '2vxr2u'});
        });

        it('Hashes correctly even with complex module names', () => {
            const fn = '({mod})=>{}';
            const result = engine.registerModule(fn, null, 'component/user/profile/settings');
            expect(result).toEqual({name: '1jagu2'});
        });
    });

    describe('flush', () => {
        let idcount = 0;

        beforeEach(() => {
            idcount = 0;
            vi.spyOn(Generic, 'djb2Hash').mockImplementation(() => `id-${++idcount}`);
        });

        it('Returns empty string if nothing is registered', () => {
            expect(engine.flush()).toBe('');
        });

        it('Outputs correct script with one function and data', () => {
            engine.register('function({el,data}){el.textContent="x";}', '{"x":1}');

            const out = engine.flush();
            expect(out).toBe(
                [
                    '<script nonce="abc123">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.textContent="x";}]],',
                    '[["id-2",{"x":1}]]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Respects nonce being null', () => {
            vi.spyOn(Nonce, 'nonce').mockReturnValue(null);
            engine.register('function(){}', null);
            expect(engine.flush()).toBe(
                [
                    '<script>(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",function(){}]],',
                    '[]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Deduplicates both function and data payloads correctly', () => {
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            expect(engine.flush()).toBe(
                [
                    '<script nonce="abc123">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Returns empty script if only data is registered without any functions', () => {
            /* @ts-expect-error Should be good */
            engine.map_data.set('{"a":1}', 'id-1');

            expect(engine.flush()).toBe('');
        });

        it('Does NOT include atomic global when mount path is set (even if atomic + root)', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath('/static/atomic.js');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');

            expect(engine.flush()).toBe(
                [
                    '<script nonce="abc123">(function(w){const self=document.currentScript;',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '};',
                    'if(!w.$tfarc){',
                    'const wait=()=>{w.$tfarc?run():setTimeout(wait,1)};',
                    'wait();',
                    '}else{',
                    'run()',
                    '}})(window);</script>',
                ].join(''),
            );
        });

        it('Includes full function definition on first flush, then minimal on second', () => {
            const seen = new Set<string>();

            engine.register('function x(){}', null);

            const first = engine.flush({scripts: seen, modules: new Set()});
            expect(first).toContain('["id-1",function x(){}]');

            const second = engine.flush({scripts: seen, modules: new Set()});
            expect(second).toContain('["id-1"]');
            expect(second).not.toContain('function x(){}');
        });

        it('Skips seen function ids but still updates seen set', () => {
            const seen = new Set<string>(['id-1']);

            engine.register('function A(){}', null);
            engine.register('function B(){}', null);

            const out = engine.flush({scripts: seen, modules: new Set()});
            expect(out).toContain('["id-1"]');
            expect(out).toContain('"id-2",function B(){}');

            expect(seen.has('id-2')).toBe(true);
        });

        it('Returns empty string when no modules are registered', () => {
            expect(engine.flush()).toBe('');
        });

        it('Outputs sparkModule for single module with fn + data', () => {
            engine.registerModule('({mod,data})=>mod.$publish("x",data)', '{"x":123}', 'foo');

            expect(engine.flush()).toBe(
                [
                    '<script nonce="abc123">',
                    '(function(w){const self=document.currentScript;',
                    'w.$tfarc.sparkModule([["id-1",({mod,data})=>mod.$publish("x",data),{"x":123}]]);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Includes only unseen modules (seen.modules)', () => {
            const seen = new Set<string>(['id-1']);
            engine.registerModule('({mod})=>{}', null, 'foo');
            engine.registerModule('({mod})=>{}', null, 'bar');

            expect(engine.flush({scripts: new Set(), modules: seen})).toContain('["id-2"');
            expect(engine.flush({scripts: new Set(), modules: seen})).not.toContain('["id-1"');
        });

        it('Returns IIFE wrapper with defer cleanup even if only modules exist', () => {
            engine.registerModule('({mod})=>{}', null, 'alpha');

            const output = engine.flush();
            expect(output.startsWith('<script')).toBe(true);
            expect(output).toContain('w.$tfarc.sparkModule');
            expect(output).toContain('setTimeout(()=>self?.remove?.(),0)');
        });

        it('Handles multiple modules correctly', () => {
            engine.registerModule('({mod})=>mod.$publish("a")', null, 'mod-a');
            engine.registerModule('({mod})=>mod.$publish("b")', '{"b":true}', 'mod-b');

            expect(engine.flush()).toBe(
                [
                    '<script nonce="abc123">',
                    '(function(w){const self=document.currentScript;',
                    'w.$tfarc.sparkModule([',
                    '["id-1",({mod})=>mod.$publish("a")],',
                    '["id-2",({mod})=>mod.$publish("b"),{"b":true}]',
                    ']);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Returns empty string if all modules are already seen', () => {
            engine.registerModule('({mod})=>{}', null, 'x');
            engine.registerModule('({mod})=>{}', null, 'y');

            const seen = new Set<string>(['id-1', 'id-2']);
            const result = engine.flush({scripts: new Set(), modules: seen});

            expect(result).toBe('');
        });

        it('Includes both spark and sparkModule if scripts and modules are registered', () => {
            vi.spyOn(Generic, 'djb2Hash').mockImplementation((str: string) => {
                if (str.includes('function')) return 'id-1';
                if (str.includes('data')) return 'id-2';
                if (str.includes('module')) return 'mod-1';
                return 'hash';
            });

            // register a script
            engine.register('function({el,data}){el.textContent=data.msg}', '{"msg":"hi"}');
            // register a module
            engine.registerModule('({mod})=>mod.$publish("ready")', null, 'module');

            expect(engine.flush()).toBe(
                [
                    '<script nonce="abc123">(function(w){',
                    'const self=document.currentScript;',
                    'w.$tfarc.sparkModule([["mod-1",({mod})=>mod.$publish("ready")]]);',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.textContent=data.msg}]],',
                    '[["hash",{"msg":"hi"}]]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });
    });

    describe('inject', () => {
        let idcount = 0;

        beforeEach(() => {
            idcount = 0;
            vi.spyOn(Generic, 'djb2Hash').mockImplementation(() => `id-${++idcount}`);
        });

        it('Returns input unchanged if no script is registered', () => {
            const html = '<div>Hello</div>';
            expect(engine.inject(html)).toBe(html);
        });

        it('Appends script to end of HTML if </body> is missing', () => {
            engine.register('function(){}', null);
            expect(engine.inject('<html><main>Stuff</main></html>')).toBe(
                [
                    '<html><main>Stuff</main>',
                    '<script nonce="abc123">',
                    ARC_GLOBAL(false),
                    ARC_GLOBAL_OBSERVER,
                    '</script>',
                    '<script nonce="abc123">',
                    '(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark([["id-1",function(){}]],[]);setTimeout(()=>self?.remove?.(),0);})(window);',
                    '</script>',
                    '</html>',
                ].join(''),
            );
        });

        it('Appends script to end of HTML if </body> is missing and enable debug if in dev mode', () => {
            setActiveCtx({env: {TRIFROST_DEV: 'true'}} as any);
            engine.register('function(){}', null);
            expect(engine.inject('<html><main>Stuff</main></html>')).toBe(
                [
                    '<html><main>Stuff</main>',
                    '<script nonce="abc123">',
                    ARC_GLOBAL(true),
                    ARC_GLOBAL_OBSERVER,
                    '</script>',
                    '<script nonce="abc123">',
                    '(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark([["id-1",function(){}]],[]);setTimeout(()=>self?.remove?.(),0);})(window);',
                    '</script>',
                    '</html>',
                ].join(''),
            );
            setActiveCtx(null);
        });

        it('Appends script to end of HTML if </html> and </body> are missing', () => {
            engine.register('function(){}', null);
            expect(engine.inject('<html><main>Stuff</main>')).toBe(
                [
                    '<html><main>Stuff</main>',
                    '<script nonce="abc123">',
                    ARC_GLOBAL(false),
                    ARC_GLOBAL_OBSERVER,
                    '</script>',
                    '<script nonce="abc123">',
                    '(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark([["id-1",function(){}]],[]);setTimeout(()=>self?.remove?.(),0);})(window);',
                    '</script>',
                ].join(''),
            );
        });

        it('Inserts script before </body> if present', () => {
            engine.register('function(){}', null);
            expect(engine.inject('<html><body><main>Content</main></body></html>')).toBe(
                [
                    '<html>',
                    '<body>',
                    '<main>Content</main>',
                    '<script nonce="abc123">',
                    ARC_GLOBAL(false),
                    ARC_GLOBAL_OBSERVER,
                    '</script>',
                    '<script nonce="abc123">',
                    '(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark([["id-1",function(){}]],[]);setTimeout(()=>self?.remove?.(),0);})(window);',
                    '</script>',
                    '</body>',
                    '</html>',
                ].join(''),
            );
        });

        it('Inserts script at end if </body> is not present', () => {
            engine.register('function(el){el.dataset.x="1"}', null);

            expect(engine.inject('<div>Partial content</div>')).toBe(
                [
                    '<div>Partial content</div>',
                    '<script nonce="abc123">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",function(el){el.dataset.x="1"}]],',
                    '[]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Returns an empty string if not passed a string html', () => {
            engine.register('function(el){el.dataset.x="1"}', null);
            for (const el of CONSTANTS.NOT_STRING) {
                expect(engine.inject(el as string)).toBe('');
            }
        });

        it('Injects only <script src> when mounted and root', () => {
            engine.setAtomic(true);
            engine.setMountPath('/static/client.js');

            expect(engine.inject('<!DOCTYPE html><html><body><main>Hi</main></body></html>')).toBe(
                [
                    '<!DOCTYPE html>',
                    '<html><body><main>Hi</main>',
                    '<script nonce="abc123" src="/static/client.js" defer></script>',
                    '</body></html>',
                ].join(''),
            );
        });

        it('Injects both <script src> and inline script when mounted and root', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath('/static/atomic.js');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            expect(engine.inject('<!DOCTYPE html><html><body><main>Hello</main></body></html>')).toBe(
                [
                    '<!DOCTYPE html><html><body><main>Hello</main>',
                    '<script nonce="abc123" src="/static/atomic.js" defer></script>',
                    '<script nonce="abc123">(function(w){const self=document.currentScript;',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '};',
                    'if(!w.$tfarc){',
                    'const wait=()=>{w.$tfarc?run():setTimeout(wait,1)};',
                    'wait();',
                    '}else{',
                    'run()',
                    '}})(window);</script>',
                    '</body></html>',
                ].join(''),
            );
        });

        it('Does not inject <script src> when mount is set but HTML is not a full document', () => {
            engine.setAtomic(true);
            engine.setMountPath('/atomic.js');

            expect(engine.inject('<div>Partial</div>')).toBe(['<div>Partial</div>'].join(''));
        });

        it('Includes nonce on mount script if available', () => {
            engine.setAtomic(true);
            engine.setMountPath('/atomic.js');

            expect(engine.inject('<!DOCTYPE html><html><body><main>App</main></body></html>')).toBe(
                [
                    '<!DOCTYPE html><html><body><main>App</main>',
                    '<script nonce="abc123" src="/atomic.js" defer></script>',
                    '</body></html>',
                ].join(''),
            );
        });

        it('Injects only and inline script when mounted and not full html', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath('/static/atomic.js');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            expect(engine.inject('<main>Hello</main>')).toBe(
                [
                    '<main>Hello</main>',
                    '<script nonce="abc123">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Injects without nonce if no active nonce', () => {
            vi.spyOn(Nonce, 'nonce').mockReturnValue(null);
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath('/static/atomic.js');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            expect(engine.inject('<html><body><main>Hello</main></body></html>')).toBe(
                [
                    '<html><body><main>Hello</main>',
                    '<script src="/static/atomic.js" defer></script>',
                    '<script>(function(w){const self=document.currentScript;',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '};',
                    'if(!w.$tfarc){',
                    'const wait=()=>{w.$tfarc?run():setTimeout(wait,1)};',
                    'wait();',
                    '}else{',
                    'run()',
                    '}})(window);</script>',
                    '</body></html>',
                ].join(''),
            );
        });

        it('Injects without nonce if no active nonce and no mount path', () => {
            vi.spyOn(Nonce, 'nonce').mockReturnValue(null);
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath(null as unknown as string);
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            expect(engine.inject('<html><body><main>Hello</main></body></html>')).toBe(
                [
                    '<html><body><main>Hello</main>',
                    '<script>',
                    ARC_GLOBAL(false),
                    ATOMIC_GLOBAL,
                    '</script>',
                    '<script>',
                    '(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);',
                    '</script>',
                    '</body></html>',
                ].join(''),
            );
        });

        it('Gracefully handles empty html in inject()', () => {
            engine.register('function(){}', null);
            expect(engine.inject('')).toBe(
                '<script nonce="abc123">(function(w){const self=document.currentScript;w.$tfarc.spark([["id-1",function(){}]],[]);setTimeout(()=>self?.remove?.(),0);})(window);</script>',
            );
        });

        it('Skips runtime injection for HTML fragments (not full documents)', () => {
            engine.setAtomic(false);
            const input = '<section><div>Inline</div></section>';
            engine.register('function(){}', null);

            const out = engine.inject(input);
            expect(out).toMatch(/^<section>/);
            expect(out).not.toContain(ARC_GLOBAL(false));
            expect(out).not.toContain(ATOMIC_GLOBAL);
            expect(out).not.toContain('<script src=');
        });

        it('Injects ARC_GLOBAL and ARC_GLOBAL_OBSERVER when atomic is disabled and no mount path', () => {
            engine.setAtomic(false);
            engine.register('function(){}', null);

            const html = '<html><body><main>Hi</main></body></html>';
            const output = engine.inject(html);

            expect(output).toContain(ARC_GLOBAL(false));
            expect(output).toContain(ARC_GLOBAL_OBSERVER);
            expect(output).not.toContain(ATOMIC_GLOBAL);
        });

        it('Injects ARC_GLOBAL and ATOMIC_GLOBAL when atomic is enabled and no mount path', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.register('function(){}', null);

            const html = '<html><body><main>Hi</main></body></html>';
            const output = engine.inject(html);

            expect(output).toContain(ARC_GLOBAL(false));
            expect(output).toContain(ATOMIC_GLOBAL);
            expect(output).not.toContain(ARC_GLOBAL_OBSERVER);
        });

        it('Injects ARC_GLOBAL and ARC_GLOBAL_OBSERVER without nonce if nonce is null', () => {
            vi.spyOn(Nonce, 'nonce').mockReturnValue(null);
            engine.setAtomic(false);
            engine.register('function(){}', null);

            const html = '<html><body><main>Content</main></body></html>';
            const result = engine.inject(html);

            expect(result).toContain('<script>');
            expect(result).toContain(ARC_GLOBAL(false));
            expect(result).toContain(ARC_GLOBAL_OBSERVER);
            expect(result).not.toContain('nonce=');
            expect(result).not.toContain(ATOMIC_GLOBAL);
        });

        it('clears seen set for full HTML documents', () => {
            const seen = new Set<string>(['7348932', '432874923']);
            engine.register('function(){}', null);

            engine.inject('<!DOCTYPE html><html><body><main>hi</main></body></html>', {scripts: seen, modules: new Set()});
            expect(seen.size).toBe(1);
        });

        it('retains seen set for HTML fragments', () => {
            const seen = new Set<string>();
            engine.register('function(){}', null);

            engine.inject('<main>fragment</main>', {scripts: seen, modules: new Set()});
            expect(seen.size).toBe(1);
        });

        it('inject skips full function body if fn already in seen', () => {
            const seen = new Set<string>();
            engine.register('function onlyOnce(){}', null);
            seen.add('id-1');

            const html = engine.inject('<main>Test</main>', {scripts: seen, modules: new Set()});
            expect(html).toContain('["id-1"]');
            expect(html).not.toContain('function onlyOnce');
        });

        it('Injects module script to end of HTML when no </body>', () => {
            engine.registerModule('({mod})=>mod.$publish("x")', null, 'module-a');

            expect(engine.inject('<main>Module Render</main>')).toBe(
                [
                    '<main>Module Render</main>',
                    '<script nonce="abc123">(function(w){',
                    'const self=document.currentScript;',
                    'w.$tfarc.sparkModule([["id-1",({mod})=>mod.$publish("x")]]);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Injects module script before </body> if present', () => {
            engine.registerModule('({mod})=>mod.$publish("x")', '{"flag":true}', 'mod-with-data');

            const html = '<html><body><main>Module</main></body></html>';
            const result = engine.inject(html);

            expect(result).toContain('</script></body></html>');
            expect(result).toContain('w.$tfarc.sparkModule');
            expect(result).toContain('{"flag":true}');
        });

        it('Injects nothing if all modules already seen', () => {
            engine.registerModule('({mod})=>{}', null, 'mod-a');
            const seen = {scripts: new Set<string>(), modules: new Set(['id-1'])};

            const html = '<main>Nothing to inject</main>';
            const result = engine.inject(html, seen);

            expect(result).toBe('<main>Nothing to inject</main>');
        });

        it('Respects full-page atomic+root+mountPath in module-only render', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath('/client.js');
            engine.registerModule('({mod})=>mod.$publish("x")', '{"x":123}', 'example');

            expect(engine.inject('<!DOCTYPE html><html><body><h1>Mount</h1></body></html>')).toBe(
                [
                    '<!DOCTYPE html><html><body><h1>Mount</h1>',
                    '<script nonce="abc123" src="/client.js" defer></script>',
                    '<script nonce="abc123">(function(w){',
                    'const self=document.currentScript;',
                    'const run=()=>{',
                    'w.$tfarc.sparkModule([["id-1",({mod})=>mod.$publish("x"),{"x":123}]]);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '};',
                    'if(!w.$tfarc){const wait=()=>{w.$tfarc?run():setTimeout(wait,1)};wait();}else{run()}',
                    '})(window);</script></body></html>',
                ].join(''),
            );
        });

        it('Injects ARC and ATOMIC globals when atomic enabled and mountPath not set', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath(null as any);
            engine.registerModule('({mod})=>mod.$publish("go")', null, 'boot');

            const html = '<html><body><div>App</div></body></html>';
            const result = engine.inject(html);

            expect(result).toContain(ARC_GLOBAL(false));
            expect(result).toContain(ATOMIC_GLOBAL);
            expect(result).toContain('w.$tfarc.sparkModule');
        });

        it('Injects ARC and ATOMIC globals when atomic enabled and mountPath not set and enable debug if ctx has it', () => {
            setActiveCtx({env: {TRIFROST_DEV: 'true'}} as any);
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.setMountPath(null as any);
            engine.registerModule('({mod})=>mod.$publish("go")', null, 'boot');

            const html = '<html><body><div>App</div></body></html>';
            const result = engine.inject(html);
            setActiveCtx(null);

            expect(result).toContain(ARC_GLOBAL(true));
            expect(result).toContain(ATOMIC_GLOBAL);
            expect(result).toContain('w.$tfarc.sparkModule');
        });

        it('Injects only runtime globals if fragment is empty string', () => {
            engine.registerModule('({mod})=>mod.$publish("event")', '{"ready":true}', 'alpha');
            expect(engine.inject('')).toBe(
                '<script nonce="abc123">(function(w){const self=document.currentScript;w.$tfarc.sparkModule([["id-1",({mod})=>mod.$publish("event"),{"ready":true}]]);setTimeout(()=>self?.remove?.(),0);})(window);</script>',
            );
        });

        it('adds new function and module IDs to provided seen sets', () => {
            const scripts = new Set<string>();
            const modules = new Set<string>();

            // Register 1 script and 1 module
            engine.register('function x(){}', '{"msg":"hello"}');
            engine.registerModule('({mod})=>mod.$publish("abc")', '{"k":true}', 'moduleX');

            expect(engine.flush({scripts, modules})).toBe(
                [
                    '<script nonce="abc123">(function(w){',
                    'const self=document.currentScript;',
                    'w.$tfarc.sparkModule([["id-3",({mod})=>mod.$publish("abc"),{"k":true}]]);',
                    'w.$tfarc.spark([["id-1",function x(){}]],[["id-2",{"msg":"hello"}]]);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );

            expect([...scripts.values()]).toEqual(['id-1']);
            expect([...modules.values()]).toEqual(['id-3']);
        });

        it('Does not emit function body again if script id is already seen', () => {
            engine.register('function onceOnly(){}', null);
            const scripts = new Set<string>(['id-1']);
            const modules = new Set<string>();

            const flushed = engine.flush({scripts, modules});
            expect(flushed).toContain('["id-1"]');
            expect(flushed).not.toContain('function onceOnly');
        });

        it('Does not emit module again if its id is already seen', () => {
            engine.registerModule('({mod})=>mod.$publish("event")', null, 'Xmod');

            const seenModules = new Set<string>(['id-1']);
            const out = engine.flush({scripts: new Set(), modules: seenModules});

            expect(out).not.toContain('sparkModule');
            expect(seenModules.size).toBe(1);
        });

        it('Adds only new module IDs to seen set', () => {
            engine.registerModule('({mod})=>{console.log("Alpha")}', null, 'Alpha');
            engine.registerModule('({mod})=>{console.log("Beta")}', null, 'Beta');
            engine.registerModule('({mod})=>{console.log("Gamma")}', null, 'Gamma');

            const modules = new Set<string>(['id-2']);

            expect(engine.inject('<p>Hello</p>', {scripts: new Set(), modules})).toBe(
                [
                    '<p>Hello</p>',
                    '<script nonce="abc123">(function(w){',
                    'const self=document.currentScript;',
                    'w.$tfarc.sparkModule([',
                    '["id-1",({mod})=>{console.log("Alpha")}],',
                    '["id-3",({mod})=>{console.log("Gamma")}]',
                    ']);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );

            expect([...modules.values()]).toEqual(['id-2', 'id-1', 'id-3']);
        });

        it('Emits both spark and sparkModule if both sets contain new entries', () => {
            const res = engine.register('function y(){}', '{"n":9}');
            const resmod = engine.registerModule('({mod})=>{}', null, 'Z');

            const scripts = new Set<string>(['bla']);
            const modules = new Set<string>();

            const out = engine.flush({scripts, modules});
            expect(out).toContain('spark([');
            expect(out).toContain('sparkModule([');

            expect(scripts.has('bla')).toBe(true);
            expect(scripts.has(res.fn_id!)).toBe(true);
            expect(modules.has(resmod.name!)).toBe(true);
        });

        it('Skips function flushing if both sets already contain all ids', () => {
            const result = engine.register('function existing(){}', '{"foo":1}');
            const result2 = engine.registerModule('({mod})=>{}', null, 'existing-mod');

            expect(engine.inject('<p>Hello</p>', {scripts: new Set([result.fn_id!]), modules: new Set([result2.name!])})).toBe(
                [
                    '<p>Hello</p>',
                    '<script nonce="abc123">(function(w){',
                    'const self=document.currentScript;',
                    'w.$tfarc.spark([["id-1"]],[["id-2",{"foo":1}]]);',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                ].join(''),
            );
        });
    });

    describe('reset', () => {
        it('Clears all registered functions and data', () => {
            engine.register('function(){}', '{"x":1}');
            expect(engine.flush().length).toBeGreaterThan(0);

            engine.reset();
            expect(engine.flush()).toBe('');
        });
    });
});
