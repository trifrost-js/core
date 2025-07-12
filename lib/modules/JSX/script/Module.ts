/// <reference lib="dom" />

import {type TriFrostAtomicModule, type TriFrostAtomicProxy, type TriFrostAtomicUtils} from './atomic';
import {getActiveScriptEngine} from './use';

const RGX_DATA_SCRIPT = /<\/script>/gi;

export type ModuleOptions<
    TName extends string,
    TData = unknown,
    TReturn = unknown,
    TRelay extends Record<string, unknown> = Record<string, unknown>,
    TStore extends Record<string, unknown> = Record<string, unknown>,
    TFCSSVar extends string = string,
    TFCSSTheme extends string = string,
> = {
    name: TName;
    data?: TData;
    mod: (args: {
        data: TriFrostAtomicProxy<TData>;
        mod: TriFrostAtomicModule<TRelay, TStore>;
        $: TriFrostAtomicUtils<TStore, TFCSSVar, TFCSSTheme>;
    }) => TReturn;
};

export function Module<
    TName extends string,
    TData = unknown,
    TReturn = unknown,
    TRelay extends Record<string, unknown> = Record<string, unknown>,
    TStore extends Record<string, unknown> = Record<string, unknown>,
    TFCSSVar extends string = string,
    TFCSSTheme extends string = string,
>(options: ModuleOptions<TName, TData, TReturn, TRelay, TStore, TFCSSVar, TFCSSTheme>): TReturn {
    const engine = getActiveScriptEngine();
    if (!engine) throw new Error('No active script engine');

    const raw = options.mod.toString().trim();
    const data = options.data ? JSON.stringify(options.data).replace(RGX_DATA_SCRIPT, '<\\/script>') : null;

    engine.registerModule(raw, data, options.name);

    return undefined as unknown as TReturn;
}
