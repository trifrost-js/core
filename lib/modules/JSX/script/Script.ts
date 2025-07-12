/// <reference lib="dom" />

import {nonce} from '../ctx/nonce';
import {type JSXProps} from '../types';
import {type TriFrostAtomicProxy, type TriFrostAtomicUtils, type TriFrostAtomicVM} from './atomic';
import {getActiveScriptEngine} from './use';
import {atomicMinify} from './util';

export const SCRIPT_MARKER = '__TRIFROST_HYDRATED_SCRIPT__';

export type ScriptProps<
    TFData = undefined,
    TFRelay extends Record<string, unknown> = Record<string, unknown>,
    TFStore extends Record<string, unknown> = Record<string, unknown>,
    TFCSSVar extends string = string,
    TFCSSTheme extends string = string,
    TFModules extends Record<string, unknown> = Record<string, unknown>,
> = JSXProps & {
    children?: (opts: {
        el: HTMLElement & TriFrostAtomicVM<TFRelay, TFStore>;
        data: TriFrostAtomicProxy<TFData>;
        $: TriFrostAtomicUtils<TFStore, TFCSSVar, TFCSSTheme> & TFModules;
    }) => void;
    nonce?: string;
    src?: string;
    async?: boolean;
    defer?: boolean;
    type?: string;
    data?: TFData;
};

const RGX_DATA_SCRIPT = /<\/script>/gi;

export function Script<
    TFData = undefined,
    TFRelay extends Record<string, unknown> = Record<string, unknown>,
    TFStore extends Record<string, unknown> = Record<string, unknown>,
    TFCSSVar extends string = string,
    TFCSSTheme extends string = string,
    TFModules extends Record<string, unknown> = Record<string, unknown>,
>(options: (JSXProps & ScriptProps<TFData, TFRelay, TFStore, TFCSSVar, TFCSSTheme, TFModules>) | null): JSX.Element {
    if (!options || Object.prototype.toString.call(options) !== '[object Object]') return null as unknown as JSX.Element;

    /* Source */
    if (typeof options.src === 'string' && options.src.length) {
        const {src, async, defer, type = 'text/javascript'} = options;

        /* Formulate props */
        const props: JSXProps = {type};

        props.src = src;

        /* Add async */
        if (async === true) props.async = true;

        /* Add defer */
        if (defer) props.defer = true;

        /* Nonce */
        let n_nonce: string | null = options.nonce || null;
        if (!n_nonce) n_nonce = nonce();
        if (typeof n_nonce === 'string' && n_nonce.length) props.nonce = n_nonce;

        return {type: 'script', props, key: null};
    }

    /* If at this point we dont have a function, do nothing */
    if (typeof options.children !== 'function') return null as unknown as JSX.Element;

    const raw = options.children.toString().trim();

    /* If pure (no args), execute eagerly (inline) as we dont need to atomify the method */
    if (options.children.length === 0) {
        const open_idx = raw.indexOf('{');
        const close_idx = raw.lastIndexOf('}');
        const body = open_idx >= 0 && close_idx >= 0 ? atomicMinify(raw.slice(open_idx + 1, close_idx)) : '';
        if (!body) return null as unknown as JSX.Element;

        return {
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: '(function(){' + body + '})();',
                },
                nonce: options.nonce || nonce(),
            },
            key: null,
        };
    } else {
        const engine = getActiveScriptEngine();
        if (!engine) return null as unknown as JSX.Element;

        /* Get data */
        const data = options.data ? JSON.stringify(options.data).replace(RGX_DATA_SCRIPT, '<\\/script>') : null;

        return {
            type: SCRIPT_MARKER,
            props: engine.register(raw, data),
            key: null,
        };
    }
}
