export type JSXType = '__TRIFROST_HYDRATED_SCRIPT__'|string|((props:JSXProps) => JSXElement);
export type JSXProps = {dangerouslySetInnerHTML?: {__html: string;}} & Record<string, unknown>;
export type JSXKey = string|number|null;
export type JSXFragment = {children: JSXElement | string | number | boolean | null};
export type JSXElement = {
    type: JSXType;
    props: JSXProps;
    key?: JSXKey;
};
