/// <reference lib="dom" />

import {type JSXProps} from '../types';
import {type TriFrostAtomicModule, type TriFrostAtomicProxy, type TriFrostAtomicUtils} from './atomic';
import {getActiveScriptEngine} from './use';

export const MODULE_MARKER = '__TRIFROST_HYDRATED_MODULE__';

export type ModuleProps<
    TFData = undefined,
    TFRelay extends Record<string, unknown> = Record<string, unknown>,
    TFStore extends Record<string, unknown> = Record<string, unknown>,
    TFCSSVar extends string = string,
    TFCSSTheme extends string = string,
> = JSXProps & {
    name: string;
    data?: TFData;
    children?: (opts: {
        data: TriFrostAtomicProxy<TFData>;
        mod: TriFrostAtomicModule<TFRelay, TFStore>;
        $: TriFrostAtomicUtils<TFStore, TFCSSVar, TFCSSTheme>;
    }) => void | (() => void);
    nonce?: string;
};

const RGX_DATA_SCRIPT = /<\/script>/gi;

export function Module<
    TFData = undefined,
    TFRelay extends Record<string, unknown> = Record<string, unknown>,
    TFStore extends Record<string, unknown> = Record<string, unknown>,
    TFCSSVar extends string = string,
    TFCSSTheme extends string = string,
>(options: ModuleProps<TFData, TFRelay, TFStore, TFCSSVar, TFCSSTheme> | null): JSX.Element {
    if (typeof options?.children !== 'function' || typeof options.name !== 'string' || !options.name.length)
        return null as unknown as JSX.Element;

    const engine = getActiveScriptEngine();
    if (!engine) return null as unknown as JSX.Element;

    const raw = options.children.toString().trim();
    const data = options.data ? JSON.stringify(options.data).replace(RGX_DATA_SCRIPT, '<\\/script>') : null;

    return {
        type: MODULE_MARKER,
        props: engine.registerModule(raw, data, options.name),
        key: null,
    };
}
