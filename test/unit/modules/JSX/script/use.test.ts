/// <reference lib="dom" />

/* eslint-disable indent */

import {describe, it, expect, beforeEach, vi, expectTypeOf} from 'vitest';
import {getActiveScriptEngine, setActiveScriptEngine, createScript, createModule} from '../../../../../lib/modules/JSX/script/use';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';
import * as ScriptProxy from '../../../../../lib/modules/JSX/script/Script';
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

    describe('createModule', () => {
        it('Returns a Module factory function', () => {
            const {Module} = createModule();
            expect(typeof Module).toBe('function');
        });

        it('Registers module with active script engine', () => {
            setActiveScriptEngine(instance);
            const spy = vi.spyOn(instance, 'registerModule');

            const {Module} = createModule();
            Module({
                name: 'logger',
                data: {msg: 'hello'},
                mod: ({mod, data}) => {
                    /* @ts-expect-error should be good */
                    mod.$publish('log', data.msg);
                    return {
                        hello: true,
                    };
                },
            });

            expect(spy).toHaveBeenCalled();
        });

        it('Throws if no engine is active', () => {
            setActiveScriptEngine(null);
            const {Module} = createModule();
            expect(() =>
                Module({
                    name: 'foo',
                    mod: () => ({}),
                }),
            ).toThrow('No active script engine');
        });

        it('Correctly infers module return type', () => {
            setActiveScriptEngine(instance);
            const {Module} = createModule<{
                css: {
                    var: {
                        padding: string;
                    };
                    theme: {
                        dark: string;
                    };
                };
            }>();

            const output = Module({
                name: 'audio',
                mod: ({mod, data}) => {
                    return {
                        play: () => {
                            /* @ts-expect-error should be good */
                            mod.$publish('play', data?.track ?? []);
                        },
                    };
                },
                data: {
                    track: ['track1', 'track2'],
                },
            });

            expectTypeOf(output).toMatchTypeOf<{
                play: () => void;
            }>();
        });

        it('Escapes </script> in data correctly', () => {
            setActiveScriptEngine(instance);
            const spy = vi.spyOn(instance, 'registerModule');

            const {Module} = createModule();
            Module({
                name: 'example',
                data: {
                    html: '</script><script>alert("oops")</script>',
                },
                mod: () => ({}),
            });

            const [fn, data] = [...spy.mock.calls[0]].slice(0, 2);
            expect(typeof fn).toBe('string');
            expect(data).toContain('<\\/script>');
        });

        it('Deduplicates module registration by name', () => {
            setActiveScriptEngine(instance);
            const spy = vi.spyOn(instance, 'registerModule');

            const {Module} = createModule();
            Module({
                name: 'dupe',
                data: {a: 1},
                mod: () => ({a: true}),
            });

            Module({
                name: 'dupe',
                data: {a: 2},
                mod: () => ({a: true}),
            });

            expect(spy).toHaveBeenCalledTimes(2);
            /* @ts-expect-error should be good */
            expect([...instance.map_modules.entries()]).toEqual([
                [
                    'yis70h',
                    {
                        data: '{"a":1}',
                        fn: '()=>({a:true})',
                        ogname: 'dupe',
                    },
                ],
            ]);
        });
    });

    describe('createScript()', () => {
        beforeEach(() => {
            setActiveScriptEngine(instance);
        });

        it('Sets atomic mode when passed in config', () => {
            const spy = vi.spyOn(instance, 'setAtomic');
            const factory = createScript({
                atomic: true,
                css: {
                    var: {foo: 'bar'},
                    theme: {dark: 'yes'},
                },
            });
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

            const {script} = createScript({});
            /* @ts-expect-error should be good */
            script.env('FOO');
            script.state('bar');
            script.nonce();

            expect(envSpy).toHaveBeenCalledWith('FOO');
            expect(stateSpy).toHaveBeenCalledWith('bar');
            expect(nonceSpy).toHaveBeenCalled();
        });

        it('Proxies Script to original implementation', () => {
            const spy = vi.spyOn(ScriptProxy, 'Script').mockImplementation(() => 'MockScript' as any);
            const {Script} = createScript({});
            const out = Script({children: () => {}});
            expect(spy).toHaveBeenCalled();
            expect(out).toBe('MockScript');
        });

        it('Forwards mount path to ScriptEngine in root()', () => {
            const spy = vi.spyOn(instance, 'setMountPath');
            const {script} = createScript({});
            script.setMountPath('/runtime.js');
            script.root();
            expect(spy).toHaveBeenCalledWith('/runtime.js');
        });

        it('Skips setMountPath if null passed', () => {
            const spy = vi.spyOn(instance, 'setMountPath');
            const {script} = createScript({});
            script.setMountPath(null);
            script.root();
            expect(spy).not.toHaveBeenCalled();
        });

        it('Auto-instantiates ScriptEngine on Script call if none is set', () => {
            setActiveScriptEngine(null);
            const {Script} = createScript({});
            const out = Script({children: () => {}});
            expect(getActiveScriptEngine()).toBeInstanceOf(ScriptEngine);
            expect(out).not.toBeNull();
        });

        it('Auto-instantiates ScriptEngine on root() if none is set', () => {
            setActiveScriptEngine(null);
            const {script} = createScript({});
            script.root();
            expect(getActiveScriptEngine()).toBeInstanceOf(ScriptEngine);
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

            const {Script} = createScript<typeof config, {FOO: string}>(config); // eslint-disable-line @typescript-eslint/no-unused-vars

            type ScriptProps = Parameters<typeof Script>[0];
            expectTypeOf<ScriptProps>().toMatchTypeOf<ScriptProxy.ScriptProps<any, any, any, 'fontSize' | 'gap', 'light' | 'dark'>>();
        });

        it('Instantiates and sets a new ScriptEngine if none is active when Script is called', () => {
            const {Script} = createScript({});
            setActiveScriptEngine(null);

            const out = Script({children: () => {}});

            const engine = getActiveScriptEngine();
            expect(engine).toBeInstanceOf(ScriptEngine);
            expect(out).not.toBeNull();
        });

        it('Infers module shape and keys', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {Script} = createScript<
                {
                    css: {
                        var: {x: string};
                        theme: {y: string};
                    };
                    atomic: true;
                    modules: {
                        audio: () => {play: () => void};
                        modal: () => {open: () => void};
                    };
                },
                {FOO: string}
            >({
                css: {
                    var: {x: '1px'},
                    theme: {y: 'white'},
                },
                atomic: true,
                modules: {
                    audio: () => ({play: () => {}}),
                    modal: () => ({open: () => {}}),
                },
            });

            type ScriptProps = Parameters<typeof Script>[0];

            expectTypeOf<ScriptProps>().toMatchTypeOf<
                ScriptProxy.ScriptProps<any, any, any, 'x', 'y', {audio: {play: () => void}; modal: {open: () => void}}>
            >();
        });
    });
});
