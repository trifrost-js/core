/* eslint-disable no-underscore-dangle,no-use-before-define */

import {isObject} from '@valkyriestudios/utils/object';
import {isString} from '@valkyriestudios/utils/string';
import {type JSXElement} from './types';
import {Fragment} from './runtime';
import {styleToString} from './style/util'; 

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
  
const ESCAPE_REGEX = /(?:&(?![a-z#0-9]+;))|[<>"']/gi;
  
/**
 * Escape HTML entities in strings to prevent XSS attacks.
 * 
 * @param {string} str - Input string to escape.
 */
export function escape (str:string):string {
    return str.replace(ESCAPE_REGEX, (char:string) => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case '\'': return '&#39;';
            default: return char;
        }
    });
}

/**
 * Renders properties such as style/attributes
 * 
 * @param {string} acc - Accumulator to add to
 * @param {Record<string, unknown>} props - Props to render
 */
function renderProps (acc:string, props:Record<string, unknown>|null) {
    if (!isObject(props)) return acc;

    for (const key in props) {
        const val = props[key];
        if (key !== 'children' && val !== undefined && val !== null) {
            if (key === 'style' && isObject(val)) {
                const style = styleToString(val);
                if (style) acc += ' style="' + escape(style) + '"';
            } else if (props[key] === true && BOOL_PROPS.has(key)) {
                acc += ' ' + key;
            } else if (key !== 'dangerouslySetInnerHTML') {
                acc += ' ' + (key === 'className' ? 'class' : key) + '="' + escape(props[key] + '') + '"';
            }
        }
    }

    return acc;
}

/**
 * Renders child elements
 */
function renderChildren (children:JSXElement|string|number|boolean|null|JSXElement[]|string[]|number[]|boolean[]|null[]) {
    if (Array.isArray(children)) {
        let output = '';
        for (let i = 0; i < children.length; i++) output += render(children[i]);
        return output;
    }
    
    return children ? render(children) : '';
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
            if (Array.isArray(node)) {
                return renderChildren(node);
            } else if (!isObject(node) || !node.type) {
                return '';
            } else if (node.type === Fragment) {
                return renderChildren(node.props?.children  as JSXElement | string | number | boolean | null);
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
                    output += renderChildren(node.props?.children  as JSXElement | string | number | boolean | null);
                }

                return output + '</' + tag + '>';
            }
        }
    }
}
