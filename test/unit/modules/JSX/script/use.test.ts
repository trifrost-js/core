import {describe, it, expect, beforeEach, vi, expectTypeOf} from 'vitest';
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

        it('env and state proxies delegate to original ctx functions', () => {
            const envSpy = vi.spyOn(EnvProxy, 'env');
            const stateSpy = vi.spyOn(StateProxy, 'state');
            const nonceSpy = vi.spyOn(NonceProxy, 'nonce');

            const config = {} as const;
            const {script} = createScript<typeof config, {API_KEY: string}>(config);
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

        it('Forwards mount path to engine during root()', () => {
            const spy = vi.spyOn(engine, 'setMountPath');
            const {script} = createScript();
            script.setMountPath('/runtime.js');
            script.root();
            expect(spy).toHaveBeenCalledWith('/runtime.js');
        });

        it('Does not forward mount path to engine during root() if null', () => {
            const spy = vi.spyOn(engine, 'setMountPath');
            const {script} = createScript();
            script.setMountPath(null);
            script.root();
            expect(spy).not.toHaveBeenCalled();
        });

        it('Auto-instantiates ScriptEngine if none is set (Script)', () => {
            setActiveScriptEngine(null);
            const {Script} = createScript({atomic: true});
            const result = Script({children: () => {}});
            expect(getActiveScriptEngine()).toBeInstanceOf(ScriptEngine);
            expect(result).not.toBeNull();
        });

        it('Auto-instantiates ScriptEngine if none is set (root)', () => {
            setActiveScriptEngine(null);
            const {script} = createScript({atomic: true});
            script.root();
            expect(getActiveScriptEngine()).toBeInstanceOf(ScriptEngine);
        });

        it('Infers typed CSS tokens from config', () => {
            const css = {
                var: {
                    fontSizeL: '2rem',
                    padding: '1rem',
                },
                theme: {
                    dark: '#000',
                    light: '#fff',
                },
            };

            const config = {
                css,
                atomic: true,
            } as const;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {Script} = createScript<typeof config>(config);

            // simulate a TS props call to check inference
            type Props = Parameters<typeof Script>[0];

            expectTypeOf<Props>().toMatchTypeOf<ScriptProxy.ScriptProps<any, any, any, 'fontSizeL' | 'padding', 'dark' | 'light'>>();
        });
    });
});
