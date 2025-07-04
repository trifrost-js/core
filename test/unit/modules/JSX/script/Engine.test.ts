import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import * as Generic from '../../../../../lib/utils/Generic';
import * as Nonce from '../../../../../lib/modules/JSX/ctx/nonce';
import CONSTANTS from '../../../../constants';
import {ARC_GLOBAL, ARC_GLOBAL_OBSERVER, ATOMIC_GLOBAL} from '../../../../../lib/modules/JSX/script/atomic';

describe('Modules - JSX - script - Engine', () => {
    let engine: ScriptEngine;
    let idcount = 0;

    beforeEach(() => {
        engine = new ScriptEngine();
        idcount = 0;

        vi.spyOn(Generic, 'hexId').mockImplementation(() => `id-${++idcount}`);
        vi.spyOn(Nonce, 'nonce').mockReturnValue('abc123');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('register', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('Registers a new function and data, returns both ids', () => {
            const fn = 'function({el,data}){el.innerText="Hi";}';
            const data = '{"msg":"Hi"}';

            const result = engine.register(fn, data);
            expect(result).toEqual({fn_id: 'id-1', data_id: 'id-2'});
        });

        it('Deduplicates identical functions', () => {
            const fn = 'function(){}';

            const a = engine.register(fn, null);
            const b = engine.register(fn, null);

            expect(a.fn_id).toBe(b.fn_id);
            expect(Generic.hexId).toHaveBeenCalledTimes(1);
        });

        it('Deduplicates identical data', () => {
            const fn1 = 'function a(){}';
            const fn2 = 'function b(){}';
            const data = '{"foo":42}';

            const a = engine.register(fn1, data);
            const b = engine.register(fn2, data);

            expect(a.data_id).toBe(b.data_id);
            expect(Generic.hexId).toHaveBeenCalledTimes(3);
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

            // still assigns a data_id even if the string is not valid JSON
            expect(result).toEqual({fn_id: 'id-1', data_id: 'id-2'});
        });

        it('Registers an empty function string without throwing', () => {
            const result = engine.register('', '{"test":true}');
            expect(result).toEqual({fn_id: 'id-1', data_id: 'id-2'});
        });

        it('handles multiple null data registrations with the same function', () => {
            const fn = 'function(){}';
            const a = engine.register(fn, null);
            const b = engine.register(fn, null);

            expect(a.fn_id).toBe(b.fn_id);
            expect(a.data_id).toBeNull();
            expect(b.data_id).toBeNull();
        });
    });

    describe('flush', () => {
        it('Returns empty string if nothing is registered', () => {
            expect(engine.flush()).toBe('');
        });

        it('Outputs correct script with one function and data', () => {
            engine.register('function({el,data}){el.textContent="x";}', '{"x":1}');

            const out = engine.flush();
            expect(out).toBe(
                [
                    '<script nonce="abc123">(function(w){',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.textContent="x";}]],',
                    '[["id-2",{"x":1}]]',
                    ');',
                    'document.currentScript?.remove();',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Respects nonce being null', () => {
            vi.spyOn(Nonce, 'nonce').mockReturnValue(null);
            engine.register('function(){}', null);
            expect(engine.flush()).toBe(
                [
                    '<script>(function(w){',
                    'w.$tfarc.spark(',
                    '[["id-1",function(){}]],',
                    '[]',
                    ');',
                    'document.currentScript?.remove();',
                    '})(window);</script>',
                ].join(''),
            );
        });

        it('Deduplicates both function and data payloads correctly', () => {
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            engine.register('function({el,data}){el.id="a"}', '{"value":42}');
            expect(engine.flush()).toBe(
                [
                    '<script nonce="abc123">(function(w){',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');document.currentScript?.remove();',
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
                    '<script nonce="abc123">(function(w){',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'document.currentScript?.remove();',
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
    });

    describe('inject', () => {
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
                    ARC_GLOBAL,
                    ARC_GLOBAL_OBSERVER,
                    '</script>',
                    '<script nonce="abc123">',
                    '(function(w){',
                    'w.$tfarc.spark([["id-1",function(){}]],[]);document.currentScript?.remove();})(window);',
                    '</script>',
                    '</html>',
                ].join(''),
            );
        });

        it('Appends script to end of HTML if </html> and </body> are missing', () => {
            engine.register('function(){}', null);
            expect(engine.inject('<html><main>Stuff</main>')).toBe(
                [
                    '<html><main>Stuff</main>',
                    '<script nonce="abc123">',
                    ARC_GLOBAL,
                    ARC_GLOBAL_OBSERVER,
                    '</script>',
                    '<script nonce="abc123">',
                    '(function(w){',
                    'w.$tfarc.spark([["id-1",function(){}]],[]);document.currentScript?.remove();})(window);',
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
                    ARC_GLOBAL,
                    ARC_GLOBAL_OBSERVER,
                    '</script>',
                    '<script nonce="abc123">',
                    '(function(w){',
                    'w.$tfarc.spark([["id-1",function(){}]],[]);document.currentScript?.remove();})(window);',
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
                    '<script nonce="abc123">(function(w){',
                    'w.$tfarc.spark(',
                    '[["id-1",function(el){el.dataset.x="1"}]],',
                    '[]',
                    ');',
                    'document.currentScript?.remove();',
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
                    '<script nonce="abc123">(function(w){',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'document.currentScript?.remove();',
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
                    '<script nonce="abc123">(function(w){',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'document.currentScript?.remove();',
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
                    '<script>(function(w){',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'document.currentScript?.remove();',
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
                    ARC_GLOBAL,
                    ATOMIC_GLOBAL,
                    '</script>',
                    '<script>',
                    '(function(w){',
                    'w.$tfarc.spark(',
                    '[["id-1",function({el,data}){el.id="a"}]],',
                    '[["id-2",{"value":42}]]',
                    ');',
                    'document.currentScript?.remove();',
                    '})(window);',
                    '</script>',
                    '</body></html>',
                ].join(''),
            );
        });

        it('Gracefully handles empty html in inject()', () => {
            engine.register('function(){}', null);
            expect(engine.inject('')).toBe(
                '<script nonce="abc123">(function(w){w.$tfarc.spark([["id-1",function(){}]],[]);document.currentScript?.remove();})(window);</script>',
            );
        });

        it('Skips runtime injection for HTML fragments (not full documents)', () => {
            engine.setAtomic(false);
            const input = '<section><div>Inline</div></section>';
            engine.register('function(){}', null);

            const out = engine.inject(input);
            expect(out).toMatch(/^<section>/);
            expect(out).not.toContain(ARC_GLOBAL);
            expect(out).not.toContain(ATOMIC_GLOBAL);
            expect(out).not.toContain('<script src=');
        });

        it('Injects ARC_GLOBAL and ARC_GLOBAL_OBSERVER when atomic is disabled and no mount path', () => {
            engine.setAtomic(false);
            engine.register('function(){}', null);

            const html = '<html><body><main>Hi</main></body></html>';
            const output = engine.inject(html);

            expect(output).toContain(ARC_GLOBAL);
            expect(output).toContain(ARC_GLOBAL_OBSERVER);
            expect(output).not.toContain(ATOMIC_GLOBAL);
        });

        it('Injects ARC_GLOBAL and ATOMIC_GLOBAL when atomic is enabled and no mount path', () => {
            engine.setAtomic(true);
            engine.setRoot(true);
            engine.register('function(){}', null);

            const html = '<html><body><main>Hi</main></body></html>';
            const output = engine.inject(html);

            expect(output).toContain(ARC_GLOBAL);
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
            expect(result).toContain(ARC_GLOBAL);
            expect(result).toContain(ARC_GLOBAL_OBSERVER);
            expect(result).not.toContain('nonce=');
            expect(result).not.toContain(ATOMIC_GLOBAL);
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
