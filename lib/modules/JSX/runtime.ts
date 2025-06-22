/* eslint-disable @typescript-eslint/no-unused-vars */

import {
    type JSXType,
    type JSXProps,
    type JSXKey,
    type JSXFragment,
} from './types';

/**
 * Creates a JSX element representation.
 * @note This function is called when JSX is used and compiled with `jsx` mode.
 *
 * @param {JSXType} type - The tag/component type (e.g., 'div' or MyComponent).
 * @param {JSXProps} props - The properties/attributes for the element.
 * @param {JSXKey} key - An optional key for element identity in a list.
 */
export function jsx (type:JSXType, props:JSXProps, key?:JSXKey):JSX.Element {
    return {type, props: props || {}, key};
}

/**
 * Identical to `jsx`, but used when a JSX element has multiple children.
 * @note This function is called by the compiler in `jsxs` mode.
 *
 * @param {JSXType} type - The tag/component type (e.g., 'div' or MyComponent).
 * @param {JSXProps} props - The properties/attributes for the element.
 * @param {JSXKey} key - An optional key for element identity in a list.
 */
export function jsxs (type:JSXType, props:JSXProps, key?:JSXKey):JSX.Element {
    return jsx(type, props, key);
}

/**
 * Dev-mode JSX function. Used by Bun, TypeScript, Vite etc. when compiling JSX in development.
 *
 * TriFrost does not currently use dev metadata like `source` or `self` for traceability,
 * but this function exists to maintain compatibility with modern JSX pipelines.
 *
 * Internally, it aliases `jsx()`, discarding the extra parameters.
 *
 * @future Consider emitting debug info (filename, line) for error boundaries or logging.
 *
 * @param {JSXType} type - The tag/component type (e.g., 'div' or MyComponent).
 * @param {JSXProps} props - The properties/attributes for the element.
 * @param {JSXKey} key - Optional key for list reconciliation (not currently used).
 * @param {boolean} _isStaticChildren - Indicates if children are statically analyzed (unused).
 * @param {{fileName: string;lineNumber:number}} _source - Metadata about the JSX origin location (file + line).
 * @param {any} _self - The lexical 'this' in source (unused).
 */
export function jsxDEV (
    type:JSXType,
    props:JSXProps,
    key:JSXKey|undefined,
    _isStaticChildren: boolean,
    _source: {fileName: string; lineNumber: number},
    _self: any
):JSX.Element {
    return jsx(type, props, key);
}

/**
 * JSX Fragment support. Allows grouping multiple children without adding a parent DOM element.
 *
 * @param props - Props object containing `children`.
 */
export const Fragment = (props:JSXFragment) => props.children;
