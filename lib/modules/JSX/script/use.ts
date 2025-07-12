// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../atomic.d.ts" />

import {ScriptEngine} from './Engine';
import {env as ogEnv} from '../ctx/env';
import {state as ogState} from '../ctx/state';
import {nonce} from '../ctx/nonce';
import {Script as ogScript, type ScriptProps} from './Script';
import {Module as ogModule, type ModuleOptions} from './Module';

let active_engine: ScriptEngine | null = null;

export function setActiveScriptEngine<T extends ScriptEngine | null>(engine: T): T {
    active_engine = engine;
    return engine;
}

export function getActiveScriptEngine() {
    return active_engine;
}

/**
 * MARK: Script Factory
 */

export function createScript<
    const Config extends {
        css?: {
            var?: Record<string, string>;
            theme?: Record<string, string>;
        };
        atomic?: boolean;
        modules?: Record<string, () => Record<string, any>>;
    },
    Env extends Record<string, any> = {},
    TFCSSVarKeys extends string = Config['css'] extends {var: infer V} ? keyof V & string : string,
    TFCSSThemeKeys extends string = Config['css'] extends {theme: infer T} ? keyof T & string : string,
    TFModules extends Record<string, any> = Config['modules'] extends Record<string, any>
        ? {[K in keyof Config['modules']]: ReturnType<Config['modules'][K]>}
        : {},
    TFRelay extends Record<string, unknown> = AtomicRelay,
    TFStore extends Record<string, unknown> = AtomicStore,
>(config: {
    atomic?: boolean;
    css?: {
        var?: Record<TFCSSVarKeys, string>;
        theme?: Record<TFCSSThemeKeys, string>;
    };
    modules?: {[K in keyof TFModules]: () => TFModules[K]};
}) {
    let mountPath: string | null = null;
    const isAtomic = 'atomic' in config && config.atomic === true;

    if (!active_engine) setActiveScriptEngine(new ScriptEngine());
    if (isAtomic) active_engine!.setAtomic(true);

    const modMap = config.modules ?? {};

    const env = <K extends keyof Env>(key: K) => ogEnv<Env[K]>(key as string);
    const state = <T = unknown, K extends string = string>(key: K) => ogState<T>(key);

    const Script = <TFData = unknown>(
        props: ScriptProps<TFData, TFRelay, TFStore, TFCSSVarKeys, TFCSSThemeKeys, TFModules>,
    ): JSX.Element => {
        if (!active_engine) setActiveScriptEngine(new ScriptEngine());
        if (!active_engine!.known_modules_rgx) active_engine?.setModules(modMap);
        return ogScript<TFData, TFRelay, TFStore, TFCSSVarKeys, TFCSSThemeKeys, TFModules>(props);
    };

    const root = () => {
        if (mountPath) active_engine!.setMountPath(mountPath);
        active_engine!.setRoot(true);
    };

    const setMountPath = (path: string | null) => {
        mountPath = typeof path === 'string' ? path : null;
    };

    return {
        Script,
        script: {
            env,
            state,
            nonce,
            root,
            isAtomic,
            setMountPath,
        },
    };
}

/**
 * MARK: Module Factory
 */

export function createModule<
    Config extends {
        css?: {var: Record<string, string>; theme: Record<string, string>};
        atomic?: boolean;
    } = {},
    TFRelay extends Record<string, unknown> = AtomicRelay,
    TFStore extends Record<string, unknown> = AtomicStore,
    TFCSSVarKeys extends string = Config['css'] extends {var: infer V} ? keyof V & string : string,
    TFCSSThemeKeys extends string = Config['css'] extends {theme: infer T} ? keyof T & string : string,
>(config: Config = {} as Config) { // eslint-disable-line @typescript-eslint/no-unused-vars,prettier/prettier
    function Module<TName extends string, TFData = unknown, TReturn = unknown>(
        props: ModuleOptions<TName, TFData, TReturn, TFRelay, TFStore, TFCSSVarKeys, TFCSSThemeKeys>,
    ): TReturn {
        return ogModule<TName, TFData, TReturn, TFRelay, TFStore, TFCSSVarKeys, TFCSSThemeKeys>(props);
    }

    return {Module};
}
