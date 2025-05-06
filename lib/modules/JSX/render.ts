/* eslint-disable no-underscore-dangle */

import {isObject} from '@valkyriestudios/utils/object/is';
import {isString} from '@valkyriestudios/utils/string/is';
import {type JSXElement} from './types';
import {Fragment} from './runtime';

const VOID_TAGS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'source',
    'track',
    'wbr',
]);

const BOOL_PROPS = new Set([
    'allowfullscreen',
    'async',
    'autofocus',
    'autoplay',
    'checked',
    'controls',
    'default',
    'defer',
    'disabled',
    'formnovalidate',
    'hidden',
    'ismap',
    'loop',
    'multiple',
    'muted',
    'nomodule',
    'novalidate',
    'open',
    'readonly',
    'required',
    'reversed',
    'selected',
]);

const KEBAB_CACHE = new Map<string, string>();
const KEBAB_REGEX = /[A-Z]/g;

/**
 * Escape HTML entities in strings to prevent XSS attacks.
 * @param str - Input string to escape.
 */
function escape (str: string): string {
    let escaped = '';
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        switch (ch) {
            case '&':
                escaped += '&amp;';
                break;
            case '<':
                escaped += '&lt;';
                break;
            case '>':
                escaped += '&gt;';
                break;
            case '"':
                escaped += '&quot;';
                break;
            case '\'':
                escaped += '&#39;';
                break;
            default:
                escaped += ch;
                break;
        }
    }
    return escaped;
}

/**
 * Converts a string to kebab case for use in styling
 *
 * @param {string} key - string to convert
 */
function toKebab (key:string):string {
    const cached = KEBAB_CACHE.get(key);
    if (cached) return cached;

    const converted = key.replace(KEBAB_REGEX, m => '-' + m.toLowerCase());
    KEBAB_CACHE.set(key, converted);
    return converted;
}

function renderProps (acc:string, props:Record<string, unknown>|null) {
    if (!isObject(props)) return acc;

    for (const key in props) {
        const val = props[key];
        if (key === 'children' || !val) {
            continue;
        } else if (key === 'style' && isObject(val)) {
            let style = '';
            for (const attr in val) style += toKebab(attr) + ':' + val[attr] + ';';
            acc += ' style="' + escape(style) + '"';
        } else if (props[key] === true && BOOL_PROPS.has(key)) {
            acc += ' ' + key;
        } else if (key !== 'dangerouslySetInnerHTML') {
            acc += ' ' + (key === 'className' ? 'class' : key) + '="' + escape(props[key] + '') + '"';
        }
    }

    return acc;
}

/**
 * Renders a JSXElement or primitive to a string.
 * @param node - JSX tree or primitive.
 */
export function render (node: JSXElement | string | number | boolean | null): string {
    if (!node) return '';

    switch (typeof node) {
        case 'string':
            return escape(node);
        case 'number':
            return node + '';
        default: {
            if (!isObject(node)) {
                return '';
            } else if (node.type === Fragment) {
                const children = node.props?.children;
                if (Array.isArray(children)) {
                    let output = '';
                    for (let i = 0; i < children.length; i++) {
                        output += render(children[i]);
                    }
                    return output;
                } else {
                    return render(children as JSXElement | string | number | boolean | null);
                }
            } else if (typeof node.type === 'function') {
                return render(node.type(node.props || {}));
            } else {
                const tag = node.type;
                let output = '<' + tag;

                /* Props */
                output = renderProps(output, node.props);

                /* Void tags like br are self-closing <br /> */
                if (VOID_TAGS.has(tag)) return output + ' />';

                output += '>';
                if (isString(node.props?.dangerouslySetInnerHTML?.__html)) {
                    output += node.props.dangerouslySetInnerHTML.__html;
                } else {
                    const children = node.props?.children;
                    if (Array.isArray(children)) {
                        for (let i = 0; i < children.length; i++) {
                            output += render(children[i]);
                        }
                    } else if (children) {
                        output += render(children as JSXElement | string | number | boolean | null);
                    }
                }

                return output + '</' + tag + '>';
            }
        }
    }
}
