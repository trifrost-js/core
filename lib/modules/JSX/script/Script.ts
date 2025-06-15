import {nonce} from '../nonce/use';
import {type JSXElement, type JSXProps} from '../types';

type ScriptProps = {
  children?: any;
  nonce?: string;
  src?: string;
  async?: boolean;
  defer?: boolean;
  type?: string;
};

const RGX_PARAM_CLEANER = /[()]/g;
const RGX_PARAM_VALID = /^[a-zA-Z_$][\w$]*$/;

export function Script (options:ScriptProps):JSXElement {
    if (Object.prototype.toString.call(options) !== '[object Object]') return null as unknown as JSXElement;

    const {src, async, defer, type = 'text/javascript'} = options;

    /* Formulate props */
    const props:JSXProps = {type};

    /* Source */
    if (typeof src === 'string' && src.length) props.src = src;

    /* Add async */
    if (async === true) props.async = true;

    /* Add defer */
    if (defer) props.defer = true;

    /* Nonce */
    let n_nonce = options.nonce;
    if (!n_nonce) {
        try {
            n_nonce = nonce();
        } catch {
            /* Nothing to do here */
        }
    }
    if (typeof n_nonce === 'string' && n_nonce.length) props.nonce = n_nonce;

	/* If we have a source, early escape now */
    if (src) return {type: 'script', props, key: null};

	/* Determine body */
    let body:string;
    let param = 'node';
    if (typeof options.children === 'function') {
        const raw = options.children.toString();

        /* Our closure looks like (something) => { ... }, as such we get name the end-user gave the first param */
        const arrow_idx = raw.indexOf('=>');
        if (arrow_idx > -1) {
            const paramStr = raw.slice(0, arrow_idx).trim();
            const cleaned = paramStr.replace(RGX_PARAM_CLEANER, '').trim();
            if (cleaned.length && RGX_PARAM_VALID.test(cleaned)) param = cleaned;
        }

        /* Our closure looks like (node) => { ... }, as such we get the first index of { and then slice and dice */
        const start = raw.indexOf('{');
        body = raw.slice(start + 1, -1).trim();
    } else if (typeof options.children === 'string') {
        body = options.children.trim();
    } else {
        return null as unknown as JSXElement;
    }

    props.dangerouslySetInnerHTML = {__html: [
        '(function(' + param + '){',
        body,
        '}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
    ].join('')};

    return {type: 'script', props, key: null};
}
