import {nonce} from '../nonce/use';
import {LRU} from '@valkyriestudios/utils/caching';
import {type JSXElement, type JSXProps} from '../types';

type ScriptProps = {
  children?: any;
  nonce?: string;
  src?: string;
  async?: boolean;
  defer?: boolean;
  type?: string;
};

const SCRIPT_LRU = new LRU<string>({max_size: 100});
const RGX_STRING = /(['"`])(?:\\.|(?!\1)[^\\\n\r])*?\1/g;
const RGX_LINE_COMMENTS = /\/\/.*$/gm;
const RGX_TRIM_OPERATORS = /\s*([{};=(),:+\-*/<>])\s*/g;
const RGX_COLLAPSE_WHITESPACE = /\s+/g;
const RGX_PLACEHOLDER = /__STR(\d+)__/g;

function minify (input:string):string {
    const cached = SCRIPT_LRU.get(input);
    if (cached) return cached;

    const literals:string[] = [];
    const out = input
		/* Strip literals */
        .replace(RGX_STRING, match => {
            literals.push(match);
            return '__STR' + (literals.length - 1) + '__';
        })
        .replace(RGX_LINE_COMMENTS, '')
        .replace(RGX_TRIM_OPERATORS, '$1')
        .replace(RGX_COLLAPSE_WHITESPACE, ' ')
        .trim()
		/* Restore literals */
        .replace(RGX_PLACEHOLDER, (_, i) => literals[+i]);

    SCRIPT_LRU.set(input, out);
    return out;
}

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
        props.dangerouslySetInnerHTML = {__html: minify(raw.slice(start + 1, -1))};
    } else if (typeof options.children === 'string') {
        props.dangerouslySetInnerHTML = {__html: minify(options.children)};
    } else {
        return null as unknown as JSXElement;
    }

    return {type: 'script', props, key: null};
}
