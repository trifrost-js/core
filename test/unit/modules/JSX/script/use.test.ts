/// <reference lib="dom" />

import {describe, it, expect, beforeEach, vi, expectTypeOf} from 'vitest';
import {getActiveScriptEngine, setActiveScriptEngine, createScript} from '../../../../../lib/modules/JSX/script/use';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import * as ScriptProxy from '../../../../../lib/modules/JSX/script/Script';
import * as ModuleProxy from '../../../../../lib/modules/JSX/script/Module';
import * as EnvProxy from '../../../../../lib/modules/JSX/ctx/env';
import * as StateProxy from '../../../../../lib/modules/JSX/ctx/state';
import * as NonceProxy from '../../../../../lib/modules/JSX/ctx/nonce';

describe('Modules - JSX - Script - use', () => {
    let instance: ScriptEngine;

    beforeEach(() => {
        instance = new ScriptEngine();
        setActiveScriptEngine(null);
    });

    it('Returns null by default', () => {
        expect(getActiveScriptEngine()).toBe(null);
    });

    it('Sets and gets the active engine', () => {
        expect(setActiveScriptEngine(instance)).toBe(instance);
        expect(getActiveScriptEngine()).toBe(instance);
    });

    it('Allows setting to null', () => {
        setActiveScriptEngine(instance);
        expect(getActiveScriptEngine()).toBe(instance);
        setActiveScriptEngine(null);
        expect(getActiveScriptEngine()).toBe(null);
    });

    it('Overwrites previously set engine', () => {
        const a = new ScriptEngine();
        const b = new ScriptEngine();
        setActiveScriptEngine(a);
        expect(getActiveScriptEngine()).toBe(a);
        setActiveScriptEngine(b);
        expect(getActiveScriptEngine()).toBe(b);
    });

    describe('createScript()', () => {
        beforeEach(() => {
            setActiveScriptEngine(instance);
        });

        it('Sets atomic mode when passed in config', () => {
            const spy = vi.spyOn(instance, 'setAtomic');
            const factory = createScript({atomic: true});
            factory.Script({children: () => {}});
            expect(spy).toHaveBeenCalledWith(true);
        });

        it('Calls script.root() with setAtomic and setRoot', () => {
            const spyAtomic = vi.spyOn(instance, 'setAtomic');
            const spyRoot = vi.spyOn(instance, 'setRoot');
            const {script} = createScript({atomic: true});
            script.root();
            expect(spyAtomic).toHaveBeenCalledWith(true);
            expect(spyRoot).toHaveBeenCalledWith(true);
        });

        it('Delegates env/state/nonce access', () => {
            const envSpy = vi.spyOn(EnvProxy, 'env');
            const stateSpy = vi.spyOn(StateProxy, 'state');
            const nonceSpy = vi.spyOn(NonceProxy, 'nonce');

            const {script} = createScript();
            script.env('FOO');
            script.state('bar');
            script.nonce();

            expect(envSpy).toHaveBeenCalledWith('FOO');
            expect(stateSpy).toHaveBeenCalledWith('bar');
            expect(nonceSpy).toHaveBeenCalled();
        });

        it('Proxies Script to original implementation', () => {
            const spy = vi.spyOn(ScriptProxy, 'Script').mockImplementation(() => 'MockScript' as any);
            const {Script} = createScript();
            const out = Script({children: () => {}});
            expect(spy).toHaveBeenCalled();
            expect(out).toBe('MockScript');
        });

        it('Proxies Module to original implementation', () => {
            const spy = vi.spyOn(ModuleProxy, 'Module').mockImplementation(() => 'MockModule' as any);
            const {Module} = createScript();
            const out = Module({name: 'abc', children: () => {}});
            expect(spy).toHaveBeenCalled();
            expect(out).toBe('MockModule');
        });

        it('Forwards mount path to ScriptEngine in root()', () => {
            const spy = vi.spyOn(instance, 'setMountPath');
            const {script} = createScript();
            script.setMountPath('/runtime.js');
            script.root();
            expect(spy).toHaveBeenCalledWith('/runtime.js');
        });

        it('Skips setMountPath if null passed', () => {
            const spy = vi.spyOn(instance, 'setMountPath');
            const {script} = createScript();
            script.setMountPath(null);
            script.root();
            expect(spy).not.toHaveBeenCalled();
        });

        it('Auto-instantiates ScriptEngine on Script call if none is set', () => {
            setActiveScriptEngine(null);
            const {Script} = createScript();
            const out = Script({children: () => {}});
            expect(getActiveScriptEngine()).toBeInstanceOf(ScriptEngine);
            expect(out).not.toBeNull();
        });

        it('Auto-instantiates ScriptEngine on root() if none is set', () => {
            setActiveScriptEngine(null);
            const {script} = createScript();
            script.root();
            expect(getActiveScriptEngine()).toBeInstanceOf(ScriptEngine);
        });

        it('Auto-instantiates ScriptEngine on Module call if none is set', () => {
            setActiveScriptEngine(null);
            const {Module} = createScript();
            const out = Module({name: 'abc', children: () => {}});
            expect(getActiveScriptEngine()).toBeInstanceOf(ScriptEngine);
            expect(out).not.toBeNull();
        });

        it('Infers CSS var and theme types from config correctly', () => {
            const config = {
                css: {
                    var: {
                        fontSize: '16px',
                        gap: '8px',
                    },
                    theme: {
                        light: '#fff',
                        dark: '#000',
                    },
                },
                atomic: true,
            } as const;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {Script, Module} = createScript<typeof config>(config);

            type ScriptProps = Parameters<typeof Script>[0];
            type ModuleProps = Parameters<typeof Module>[0];

            // expectTypeOf() ensures correct key inference for both
            expectTypeOf<ScriptProps>().toMatchTypeOf<ScriptProxy.ScriptProps<any, any, any, 'fontSize' | 'gap', 'light' | 'dark'>>();

            expectTypeOf<ModuleProps>().toMatchTypeOf<ModuleProxy.ModuleProps<any, any, any, 'fontSize' | 'gap', 'light' | 'dark'>>();
        });
    });
});
