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
    if (typeof options.children === 'function') {
        const raw = options.children.toString();
        const start = raw.indexOf('{');
		/* Our closure looks like () => { ... }, as such we get the first index of { and then slice and dice */
        props.dangerouslySetInnerHTML = {__html: raw.slice(start + 1, -1).trim()};
    } else if (typeof options.children === 'string') {
        props.dangerouslySetInnerHTML = {__html: options.children.trim()};
    } else {
        return null as unknown as JSXElement;
    }

    return {type: 'script', props, key: null};
}
