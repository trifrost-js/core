/* eslint-disable no-underscore-dangle,no-use-before-define */

import {isObject} from '@valkyriestudios/utils/object';
import {type JSXElement} from './types';
import {Fragment} from './runtime';
import {StyleEngine} from './style/Engine';
import {setActiveStyleEngine, getActiveStyleEngine} from './style/use';
import {styleToString} from './style/util'; 

const VOID_TAGS = {
    area: true,
    base: true,
    br: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    link: true,
    meta: true,
    source: true,
    track: true,
    wbr: true,
} as const;

const BOOL_PROPS = {
    allowfullscreen: true,
    async: true,
    autofocus: true,
    autoplay: true,
    checked: true,
    controls: true,
    default: true,
    defer: true,
    disabled: true,
    formnovalidate: true,
    hidden: true,
    ismap: true,
    loop: true,
    multiple: true,
    muted: true,
    nomodule: true,
    novalidate: true,
    open: true,
    readonly: true,
    required: true,
    reversed: true,
    selected: true,
} as const;

const ESCAPE_LOOKUP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
} as const;
  
const ESCAPE_REGEX = /(?:&(?![a-z#0-9]+;))|[<>"']/gi;
  
/**
 * Escape HTML entities in strings to prevent XSS attacks.
 * 
 * @param {string} str - Input string to escape.
 */
export function escape (str:string):string {
    return str.replace(ESCAPE_REGEX, (ch:string) => ESCAPE_LOOKUP[ch as keyof typeof ESCAPE_LOOKUP]);
}

/**
 * Renders properties such as style/attributes
 * 
 * @param {Record<string, unknown>} props - Props to render
 */
function renderProps (props:Record<string, unknown>|null) {
    let acc = '';
    for (const key in props) {
        const val = props[key];
        switch (key) {
            case 'style':
                if (isObject(val)) {
                    const style = styleToString(val);
                    if (style) acc += ' style="' + escape(style) + '"';
                }
                break;
            case 'children':
            case 'dangerouslySetInnerHTML':
                break;
            case 'className': {
                if (val !== undefined && val !== null) acc += ' class="' + escape(val + '') + '"';
                break;
            }
            default: {
                if (val !== undefined && val !== null) {
                    acc += ' ' + key + (val !== true || !BOOL_PROPS[key as keyof typeof BOOL_PROPS] ? '="' + escape(val + '') + '"' : '');
                }
                break;
            }
        }
    }
    return acc;
}

/**
 * Renders child elements
 */
function renderChildren (children:JSXElement|string|number|boolean|null|JSXElement[]|string[]|number[]|boolean[]|null[]) {
    if (!Array.isArray(children)) return children ? render(children) : '';

    let output = '';
    for (let i = 0; i < children.length; i++) output += render(children[i]);
    return output;
}

/**
 * Renders a JSXElement or primitive to a string.
 * @param node - JSX tree or primitive.
 */
export function render (node: JSXElement | string | number | boolean | null): string {
    switch (typeof node) {
        case 'string':
            return node ? escape(node) : '';
        case 'number':
            return node + '';
        case 'boolean':
            return '';
        default: {
            switch (typeof node?.type) {
                case 'string': {
                    const tag = (node as JSXElement).type;
                    let output = '<' + tag;

                    /* Props */
                    if ((node as JSXElement).props) output += renderProps((node as JSXElement).props);

                    /* Void tags like br are self-closing <br /> */
                    if (VOID_TAGS[tag as keyof typeof VOID_TAGS]) return output + ' />';

                    output += '>';
                    if (typeof (node as JSXElement).props?.dangerouslySetInnerHTML?.__html === 'string') {
                        output += (node as JSXElement).props!.dangerouslySetInnerHTML!.__html;
                    } else {
                        output += renderChildren((node as JSXElement).props?.children as JSXElement | string | number | boolean | null);
                    }

                    return output + '</' + tag + '>';
                }
                case 'function':
                    return (node as JSXElement).type === Fragment
                        ? renderChildren((node as JSXElement).props?.children as JSXElement | string | number | boolean | null)
                        : render(((node as JSXElement).type as any)((node as JSXElement).props));
                default: {
                    if (!node) {
                        return '';
                    } else if (Array.isArray(node)) {
                        let output = '';
                        for (let i = 0; i < node.length; i++) output += render(node[i]);
                        return output;
                    } else {
                        return '';
                    }
                }
            }
        }
    }
}

/**
 * Starts the render process for a JSX element
 */
export function rootRender (tree:JSXElement):string {
    /* Instantiate globals */
    const style_engine = getActiveStyleEngine() || setActiveStyleEngine(new StyleEngine());

    /* Render jsx to html */
    const html = style_engine.inject(render(tree));

    /* Cleanup globals */
    setActiveStyleEngine(null);

    return html;
}
