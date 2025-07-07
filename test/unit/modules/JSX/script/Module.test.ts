import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {Module, MODULE_MARKER} from '../../../../../lib/modules/JSX/script/Module';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import {setActiveScriptEngine} from '../../../../../lib/modules/JSX/script/use';
import CONSTANTS from '../../../../constants';
import {MockContext} from '../../../../MockContext';

describe('Modules - JSX - script - <Module>', () => {
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

    it('Returns null if no function is provided', () => {
        for (const el of CONSTANTS.NOT_FUNCTION) {
            expect(Module({children: el as any, name: 'audio'})).toBe(null);
        }
    });

    it('Returns null if no name is provided', () => {
        for (const el of [...CONSTANTS.NOT_STRING, '']) {
            expect(Module({children: () => {}, name: el as any})).toBe(null);
        }
    });

    it('Returns null if no engine is active', () => {
        setActiveScriptEngine(null);
        expect(Module({name: 'abc', children: () => {}})).toBe(null);
    });

    it('Registers module correctly with function and data', () => {
        const out = Module({
            name: 'audio-player',
            data: {autoplay: true},
            children: ({mod, data}) => {
                mod.$publish('log', data.autoplay);
            },
        });

        expect(out).toEqual({
            key: null,
            type: MODULE_MARKER,
            props: {
                name: '6fmj1',
            },
        });

        expect(engine.flush()).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["6fmj1",({mod,data})=>{mod.$publish("log",data.autoplay);},{"autoplay":true}]',
                ']);',
                'setTimeout(()=>self?.remove?.(),0);',
                '})(window);</script>',
            ].join(''),
        );
    });

    it('Registers module correctly without data', () => {
        const out = Module({
            name: 'game',
            children: ({mod}) => {
                mod.$publish('start');
            },
        });

        expect(out).toEqual({
            key: null,
            type: MODULE_MARKER,
            props: {
                name: 'yiwydn',
            },
        });

        expect(engine.flush()).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["yiwydn",({mod})=>{mod.$publish("start");}]',
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
            children: () => {},
        });
        Module({
            name: 'foo',
            data: {msg: 'second'},
            children: () => {},
        });

        const flushed = engine.flush();
        const count = (flushed.match(/sparkModule/g) || []).length;
        expect(count).toBe(1);
        expect(flushed).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["375gv7",()=>{},{"msg":"first"}]',
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
            children: () => {},
        });

        expect(engine.flush()).toBe(
            [
                '<script nonce="my-nonce">(function(w){',
                'const self=document.currentScript;',
                'w.$tfarc.sparkModule([',
                '["1kumf3o",()=>{},{"html":"<\\/script><script>alert(1)<\\/script>"}]',
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
});
