/* eslint-disable no-use-before-define */

export type JSXType = string|((props:JSXProps) => JSXElement);
export type JSXProps = {dangerouslySetInnerHTML?: {__html: string;}} & Record<string, unknown> | null;
export type JSXKey = string|number|null;
export type JSXFragment = {children: JSXElement | string | number | boolean | null};
export type JSXElement = {
    type: JSXType;
    props: JSXProps;
    key?: JSXKey;
};
