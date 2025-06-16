import {
    type JSXType,
    type JSXProps,
    type JSXKey,
    type JSXElement,
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
export function jsx (type:JSXType, props:JSXProps, key?:JSXKey):JSXElement {
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
export function jsxs (type:JSXType, props:JSXProps, key?:JSXKey):JSXElement {
    return jsx(type, props, key);
}

/**
 * JSX Fragment support. Allows grouping multiple children without adding a parent DOM element.
 *
 * @param props - Props object containing `children`.
 */
export const Fragment = (props:JSXFragment) => props.children;
