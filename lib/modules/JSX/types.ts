export type JSXType = '__TRIFROST_HYDRATED_SCRIPT__' | string | ((props: JSXProps | null) => JSX.Element);
export type JSXProps = {dangerouslySetInnerHTML?: {__html: string}} & Record<string, unknown>;
export type JSXKey = string | number | null;
export type JSXFragment = {children: JSX.Element | string | number | boolean | null};
