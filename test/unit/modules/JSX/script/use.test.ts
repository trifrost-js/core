import {describe, it, expect, beforeEach, vi} from 'vitest';
import {getActiveScriptEngine, setActiveScriptEngine, createScript} from '../../../../../lib/modules/JSX/script/use';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import * as ScriptProxy from '../../../../../lib/modules/JSX/script/Script';
import * as EnvProxy from '../../../../../lib/modules/JSX/ctx/env';
import * as StateProxy from '../../../../../lib/modules/JSX/ctx/state';
import * as NonceProxy from '../../../../../lib/modules/JSX/ctx/nonce';

describe('Modules - JSX - Script - use', () => {
    let instance: ScriptEngine;

    beforeEach(() => {
        instance = new ScriptEngine();
        setActiveScriptEngine(null); // always reset
    });

    it('Returns null by default', () => {
        expect(getActiveScriptEngine()).toBe(null);
    });

    it('Sets and gets the active engine', () => {
        const result = setActiveScriptEngine(instance);
        expect(result).toBe(instance);
        expect(getActiveScriptEngine()).toBe(instance);
    });

    it('Allows setting to null', () => {
        setActiveScriptEngine(instance);
        expect(getActiveScriptEngine()).toBe(instance);

        setActiveScriptEngine(null);
        expect(getActiveScriptEngine()).toBe(null);
    });

    it('Returns the same instance when set twice', () => {
        const engineA = new ScriptEngine();
        const engineB = new ScriptEngine();

        setActiveScriptEngine(engineA);
        expect(getActiveScriptEngine()).toBe(engineA);

        setActiveScriptEngine(engineB);
        expect(getActiveScriptEngine()).toBe(engineB);
    });

    describe('createScript', () => {
        let engine: ScriptEngine;

        beforeEach(() => {
            engine = new ScriptEngine();
            setActiveScriptEngine(engine);
        });

        it('initializes Script with atomic mode from config', () => {
            const spy = vi.spyOn(engine, 'setAtomic');
            const factory = createScript({atomic: true});
            factory.Script({children: () => {}});
            expect(spy).toHaveBeenCalledWith(true);
        });

        it('calls setRoot with atomic when script.root() is used', () => {
            const spyAtomic = vi.spyOn(engine, 'setAtomic');
            const spyRoot = vi.spyOn(engine, 'setRoot');

            const {script} = createScript({atomic: true});
            script.root();

            expect(spyAtomic).toHaveBeenCalledWith(true);
            expect(spyRoot).toHaveBeenCalledWith(true);
        });

        it('calls setAtomic manually when script.atomic() is used', () => {
            const {script} = createScript();
            const spy = vi.spyOn(engine, 'setAtomic');

            script.atomic();
            expect(spy).toHaveBeenCalledWith(true);

            script.atomic(false);
            expect(spy).toHaveBeenCalledWith(false);
        });

        it('env and state proxies delegate to original ctx functions', () => {
            const envSpy = vi.spyOn(EnvProxy, 'env');
            const stateSpy = vi.spyOn(StateProxy, 'state');
            const nonceSpy = vi.spyOn(NonceProxy, 'nonce');

            const {script} = createScript<{API_KEY: string}>();
            script.env('API_KEY');
            script.state('x');
            script.nonce();

            expect(envSpy).toHaveBeenCalledWith('API_KEY');
            expect(stateSpy).toHaveBeenCalledWith('x');
            expect(nonceSpy).toHaveBeenCalled();
        });

        it('Script function proxies to original ogScript()', () => {
            const fn = vi.fn();
            vi.spyOn(ScriptProxy, 'Script').mockImplementation(fn as any);

            const factory = createScript();
            const props = {children: () => {}};
            factory.Script(props);

            expect(fn).toHaveBeenCalledWith(props);
        });
    });
});
