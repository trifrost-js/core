/* eslint-disable no-use-before-define */

import {type TriFrostContextRenderOptions, type TriFrostContext} from '../../types/context';
import {type JSXProps} from './types';
import {Fragment} from './runtime';
import {StyleEngine} from './style/Engine';
import {setActiveStyleEngine, getActiveStyleEngine} from './style/use';
import {styleToString} from './style/util';
import {ScriptEngine} from './script/Engine';
import {SCRIPT_MARKER} from './script/Script';
import {setActiveScriptEngine, getActiveScriptEngine} from './script/use';
import {setActiveCtx} from './ctx/use';

const SCRIPT_LRU = 'tfscriptlru';
const MODULES_LRU = 'tfmoduleslru';

const VOID_TAGS = new Set([
    /* HTML */
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
    /* SVG */
    'path',
    'circle',
    'ellipse',
    'line',
    'polygon',
    'polyline',
    'rect',
    'stop',
    'use',
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

/**
 * Escape HTML entities in strings to prevent XSS attacks.
 *
 * @param {string} str - Input string to escape.
 */
export function escape(str: string): string {
    let out = '';
    let last = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        let esc: string | undefined;
        switch (ch) {
            case 38:
                esc = '&amp;';
                break; // &
            case 60:
                esc = '&lt;';
                break; // <
            case 62:
                esc = '&gt;';
                break; // >
            case 34:
                esc = '&quot;';
                break; // "
            case 39:
                esc = '&#39;';
                break; // '
        }
        if (esc) {
            if (i > last) out += str.slice(last, i);
            out += esc;
            last = i + 1;
        }
    }
    return last === 0 ? str : out + str.slice(last);
}

/**
 * Takes an lru cookie and converts it to a set
 * @param {string|null} val - Value to convert
 */
export function fromLruCookie(val: string | null): Set<string> {
    if (!val) return new Set();

    const acc = new Set<string>();
    const parts = val.split('|');
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part) acc.add(part);
    }
    return acc;
}

/**
 * Convert a set back to an LRU cookie
 * @param {Set<string>} val - Set to convert
 */
export function toLruCookie(val: Set<string>) {
    if (!val.size) return null;

    /* We cap at 64 latest (lru) entries */
    return [...val].slice(-64).join('|');
}

/**
 * Renders properties such as style/attributes
 *
 * @param {Record<string, unknown>} props - Props to render
 */
function renderProps(props: Record<string, unknown> | null) {
    if (!props) return '';

    let acc = '';
    for (const key in props) {
        const val = props[key];
        if (val !== null && val !== undefined) {
            if (key === 'style') {
                if (Object.prototype.toString.call(val) === '[object Object]') {
                    const style = styleToString(val as Record<string, unknown>);
                    if (style) acc += ' style="' + escape(style) + '"';
                }
            } else if (key === 'className') {
                acc += ' class="' + escape(String(val)) + '"';
            } else if (key !== 'children' && key !== 'dangerouslySetInnerHTML') {
                if (val === true && BOOL_PROPS.has(key)) {
                    acc += ' ' + key;
                } else {
                    acc += ' ' + key + '="' + escape(String(val)) + '"';
                }
            }
        }
    }
    return acc;
}

/**
 * Renders child elements
 */
function renderChildren(children: any, parentProps?: JSXProps): string {
    if (!Array.isArray(children)) return children ? render(children, parentProps) : '';

    let output = '';
    for (let i = 0; i < children.length; i++) output += render(children[i], parentProps);
    return output;
}

/**
 * Renders a JSXElement or primitive to a string.
 * @param node - JSX tree or primitive.
 */
export function render(node: JSX.Element | string | number | boolean | null, parentProps: JSXProps = {}): string {
    switch (typeof node) {
        case 'string':
            return escape(node);
        case 'number':
            return node + '';
        case 'boolean':
            return '';
        default: {
            switch (typeof node?.type) {
                case 'string': {
                    const tag = node.type;
                    if (tag === SCRIPT_MARKER) {
                        if (node.props!.fn_id) {
                            parentProps['data-tfhf'] = node.props!.fn_id;
                            if (node.props!.data_id) parentProps['data-tfhd'] = node.props!.data_id;
                        }
                        return ''; /* Dont render the marker */
                    }

                    /* Render children */
                    const innerHTML =
                        typeof node.props!.dangerouslySetInnerHTML?.__html === 'string'
                            ? node.props!.dangerouslySetInnerHTML!.__html
                            : renderChildren(node.props!.children, node.props!);

                    return VOID_TAGS.has(tag)
                        ? '<' + tag + renderProps(node.props) + ' />'
                        : '<' + tag + renderProps(node.props) + '>' + innerHTML + '</' + tag + '>';
                }
                case 'function':
                    return node.type === Fragment
                        ? renderChildren(node.props!.children, parentProps)
                        : render(node.type(node.props), parentProps);
                default: {
                    if (Array.isArray(node)) {
                        let output = '';
                        for (let i = 0; i < node.length; i++) output += render(node[i], parentProps);
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
export function rootRender<Env extends Record<string, any>, State extends Record<string, unknown>>(
    ctx: TriFrostContext<Env, State>,
    tree: JSX.Element,
    options: TriFrostContextRenderOptions = {},
): string {
    /* Instantiate globals */
    const style_engine = getActiveStyleEngine() || setActiveStyleEngine(new StyleEngine());
    const script_engine = getActiveScriptEngine() || setActiveScriptEngine(new ScriptEngine());
    setActiveCtx(ctx);

    /* Known scripts on frontend */
    const script_lru_cookie = ctx.cookies.get(SCRIPT_LRU);
    const script_lru = fromLruCookie(script_lru_cookie);

    /* Known modules on frontend */
    const module_lru_cookie = ctx.cookies.get(MODULES_LRU);
    const module_lru = fromLruCookie(module_lru_cookie);

    /* Auto-call root() if script or css provided in ctx config */
    options?.script?.root?.();
    options?.css?.root?.();

    /* Render jsx to html */
    const html = script_engine.inject(style_engine.inject(render(tree)), {scripts: script_lru, modules: module_lru});

    /* Set script cookie */
    const script_cookie = toLruCookie(script_lru);
    if (script_cookie && script_cookie !== script_lru_cookie) ctx.cookies.set(SCRIPT_LRU, script_cookie, {httponly: true, secure: true});

    /* Set modules cookie */
    const module_cookie = toLruCookie(module_lru);
    if (module_cookie && module_cookie !== module_lru_cookie) ctx.cookies.set(MODULES_LRU, module_cookie, {httponly: true, secure: true});

    /* Cleanup globals */
    setActiveCtx(null);
    setActiveStyleEngine(null);
    setActiveScriptEngine(null);

    return html;
}
