import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import * as Generic from '../../../../../lib/utils/Generic';
import * as Nonce from '../../../../../lib/modules/JSX/ctx/nonce';
import CONSTANTS from '../../../../constants';

describe('ScriptEngine', () => {
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
            const fn = 'function(el,data){el.innerText="Hi";}';
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
            const fn = 'function(el,data){el.textContent=data.value;}';

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
            engine.register('function(el,data){el.textContent="x";}', '{"x":1}');

            const out = engine.flush();
            expect(out).toBe(
                '<script nonce="abc123">(function(){' +
                'const TFD = {"id-2":{"x":1}};' +
                'const TFF = {"id-1":function(el,data){el.textContent="x";}};' +
                'for (const id in TFF) {const n = document.querySelectorAll(`[data-tfhf="${id}"]`);' +
                'for (let i = 0; i < n.length; i++) {' +
                'const d = n[i].getAttribute("data-tfhd");' +
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}' +
                '}}})();</script>'
            );
        });

        it('Respects nonce being null', () => {
            vi.spyOn(Nonce, 'nonce').mockReturnValue(null);
            engine.register('function(){}', null);
            const result = engine.flush();
            expect(result.startsWith('<script>')).toBe(true);
        });

        it('Returns empty script if only data is registered without any functions', () => {
            /* @ts-ignore */
            engine.map_data.set('{"a":1}', 'id-1');

            expect(engine.flush()).toBe('');
        });
    });

    describe('inject', () => {
        it('Returns input unchanged if no script is registered', () => {
            const html = '<div>Hello</div>';
            expect(engine.inject(html)).toBe(html);
        });

        it('Appends script to end of HTML if </body> is missing', () => {
            engine.register('function(){}', null);
            expect(engine.inject('<html><main>Stuff</main></html>')).toBe([
                '<html><main>Stuff</main></html>',
                '<script nonce="abc123">',
                '(function(){',
                'const TFD = {};',
                'const TFF = {"id-1":function(){}};',
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

        it('Inserts script before </body> if present', () => {
            engine.register('function(){}', null);
            expect(engine.inject('<html><body><main>Content</main></body></html>')).toBe([
                '<html>',
                '<body>',
                '<main>Content</main>',
                '<script nonce="abc123">',
                '(function(){',
                'const TFD = {};',
                'const TFF = {"id-1":function(){}};',
                'for (const id in TFF) {',
                'const n = document.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for (let i = 0; i < n.length; i++) {',
                'const d = n[i].getAttribute("data-tfhd");',
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}',
                '}',
                '}',
                '})();',
                '</script>',
                '</body>',
                '</html>',
            ].join(''));
        });

        it('Inserts script at end if </body> is not present', () => {
            engine.register('function(el){el.dataset.x="1"}', null);

            expect(engine.inject('<div>Partial content</div>')).toBe([
                '<div>Partial content</div>',
                '<script nonce="abc123">',
                '(function(){',
                'const TFD = {};',
                'const TFF = {"id-1":function(el){el.dataset.x="1"}};',
                'for (const id in TFF) {',
                'const n = document.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for (let i = 0; i < n.length; i++) {',
                'const d = n[i].getAttribute("data-tfhd");',
                'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}',
                '}',
                '}',
                '})();',
                '</script>',
            ].join(''));
        });

        it('Returns an empty string if not passed a string html', () => {
            engine.register('function(el){el.dataset.x="1"}', null);
            for (const el of CONSTANTS.NOT_STRING) {
                expect(engine.inject(el as string)).toBe('');
            }
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
