import {type ScriptEngine} from './Engine';
import {env as ogEnv} from '../ctx/env';
import {state as ogState} from '../ctx/state';
import {nonce} from '../ctx/nonce';
import {Script as ogScript, type ScriptProps} from './Script';

let active_engine:ScriptEngine|null = null;

export function setActiveScriptEngine <T extends ScriptEngine|null> (engine:T):T {
    active_engine = engine;
    return engine;
}

export function getActiveScriptEngine () {
    return active_engine;
}

/**
 * MARK: Script Factory
 */

type ScriptConfig = {
    atomic?:boolean;
};

export function createScript<
  Env extends Record<string, any> = Record<string, any>,
  Relay extends Record<string, unknown> = Record<string, unknown>
> (config:ScriptConfig = {}) {
    /* Env proxy */
    const env = <K extends keyof Env> (key:K) => ogEnv<Env[K]>(key as string);

    /* State proxy */
    const state = <T = unknown, K extends string = string> (key:K) => ogState<T>(key);

    /* Script proxy */
    const Script = <TData = undefined> (props:ScriptProps<TData, Relay>) => {
        if ('atomic' in config) active_engine?.setAtomic(config.atomic!);
        return ogScript<TData, Relay>(props);
    };

    /* Tell the ecosystem this is the root render */
    const root = () => {
        if ('atomic' in config) active_engine?.setAtomic(config.atomic!);
        active_engine?.setRoot(true);
    };

    /* Enable/disable atomic mode */
    const atomic = (enabled:boolean = true) => active_engine?.setAtomic(enabled);

    return {
        Script,
        script: {
            env,
            state,
            nonce,
            root,
            atomic,
        },
    };
}
