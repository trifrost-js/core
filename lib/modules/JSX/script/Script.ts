/// <reference lib="dom" />

import {nonce} from '../ctx/nonce';
import {type JSXProps} from '../types';
import {type TriFrostAtomicVM} from './atomic';
import {getActiveScriptEngine} from './use';

export const SCRIPT_MARKER = '__TRIFROST_HYDRATED_SCRIPT__';

export type ScriptProps<
  TFData = undefined,
  TFRelay extends Record<string, unknown> = Record<string, unknown>,
  TFStore extends Record<string, unknown> = Record<string, unknown>
> = JSXProps & {
  children?: (el: HTMLElement & TriFrostAtomicVM<TFRelay, TFStore>, data: TFData) => void;
  nonce?: string;
  src?: string;
  async?: boolean;
  defer?: boolean;
  type?: string;
  data?: TFData;
};

const RGX_ASYNC_FATARROW = /__name\((async\s*\([^)]*\)\s*=>\s*{[\s\S]*?})\s*,\s*"[^"]*"\)/g;
const RGX_ASYNC_FUNCTION = /^\s*__name\([^)]*\);\s*$/gm;
const RGX_DATA_SCRIPT = /<\/script>/gi;

export function Script <
    TFData = undefined,
    TFRelay extends Record<string, unknown> = Record<string, unknown>,
    TFStore extends Record<string, unknown> = Record<string, unknown>
> (options: JSXProps & ScriptProps<TFData, TFRelay, TFStore> | null): JSX.Element {
    if (!options || Object.prototype.toString.call(options) !== '[object Object]') return null as unknown as JSX.Element;

    /* Source */
    if (typeof options.src === 'string' && options.src.length) {
        const {src, async, defer, type = 'text/javascript'} = options;

        /* Formulate props */
        const props:JSXProps = {type};

        props.src = src;

        /* Add async */
        if (async === true) props.async = true;

        /* Add defer */
        if (defer) props.defer = true;

        /* Nonce */
        let n_nonce:string|null = options.nonce || null;
        if (!n_nonce) n_nonce = nonce();
        if (typeof n_nonce === 'string' && n_nonce.length) props.nonce = n_nonce;

        return {type: 'script', props, key: null};
    }

    /* If at this point we dont have a function, do nothing */
    if (typeof options.children !== 'function') return null as unknown as JSX.Element;

    const engine = getActiveScriptEngine();
    if (!engine) return null as unknown as JSX.Element;

    /* Normalize function body */
    const raw = options
        .children
        .toString()
        .replace(RGX_ASYNC_FATARROW, '$1')
        .replace(RGX_ASYNC_FUNCTION, '').trim();

    /* Get data */
    const data = options.data
        ? JSON.stringify(options.data).replace(RGX_DATA_SCRIPT, '<\\/script>')
        : null;

    return {
        type: SCRIPT_MARKER,
        props: engine.register(
            raw.startsWith('function') || raw.startsWith('(') ? raw : `(${raw})`,
            data
        ),
        key: null,
    };
}
