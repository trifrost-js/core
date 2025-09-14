import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {Module} from '../../../../../lib/modules/JSX/script/Module';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import {setActiveScriptEngine} from '../../../../../lib/modules/JSX/script/use';
import {MockContext} from '../../../../MockContext';

describe('Modules - JSX - script - Module', () => {
    let engine: ScriptEngine;

    beforeEach(() => {
        engine = new ScriptEngine();
        setActiveScriptEngine(engine);
        setActiveCtx(new MockContext({nonce: 'my-nonce'}));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        setActiveCtx(null);
        setActiveScriptEngine(null);
    });

    it('Registers module correctly with function and data', () => {
        const out = Module({
            name: 'audio-player',
            data: {autoplay: true},
            mod: ({mod, data}) => {
                mod.$publish('log', data.autoplay);
                return {ok: true};
            },
        });

        expect(out).toEqual(undefined);

        expect(engine.flush()).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["10806733",({mod,data})=>{mod.$publish("log",data.autoplay);return {ok:true};},"audio-player",{"autoplay":true}]',
                ']);',
                'setTimeout(()=>self?.remove?.(),0);',
                '})(window);</script>',
            ].join(''),
        );
    });

    it('Registers module correctly without data', () => {
        const out = Module({
            name: 'game',
            mod: ({mod}) => {
                mod.$publish('start');
                return 'done';
            },
        });

        expect(out).toEqual(undefined);

        expect(engine.flush()).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["2087620619",({mod})=>{mod.$publish("start");return "done";},"game"]',
                ']);',
                'setTimeout(()=>self?.remove?.(),0);',
                '})(window);</script>',
            ].join(''),
        );
    });

    it('Handles duplicate module names by deduping', () => {
        Module({
            name: 'foo',
            data: {msg: 'first'},
            mod: () => 'first',
        });

        Module({
            name: 'foo',
            data: {msg: 'second'},
            mod: () => 'second',
        });

        const flushed = engine.flush();
        const count = (flushed.match(/sparkModule/g) || []).length;
        expect(count).toBe(1);
        expect(flushed).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["193410979",()=>"first","foo",{"msg":"first"}]',
                ']);',
                'setTimeout(()=>self?.remove?.(),0);',
                '})(window);</script>',
            ].join(''),
        );
    });

    it('Escapes </script> in data', () => {
        Module({
            name: 'breakout',
            data: {html: '</script><script>alert(1)</script>'},
            mod: () => null,
        });

        expect(engine.flush()).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["3437540340",()=>null,"breakout",{"html":"<\\/script><script>alert(1)<\\/script>"}]',
                ']);',
                'setTimeout(()=>self?.remove?.(),0);',
                '})(window);</script>',
            ].join(''),
        );
    });

    it('Returns empty string from flush if no modules registered', () => {
        engine.reset();
        expect(engine.flush()).toBe('');
    });

    it('Throws error if no active engine', () => {
        setActiveScriptEngine(null);
        expect(() =>
            Module({
                name: 'fail',
                mod: () => 'test',
            }),
        ).toThrow('No active script engine');
    });
});
