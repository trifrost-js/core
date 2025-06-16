declare namespace JSX {
    type Element = {
        type: '__TRIFROST_HYDRATED_SCRIPT__'
            | string
            | ((props: {dangerouslySetInnerHTML?: {__html: string;};} & Record<string, unknown> | null) => JSX.Element);
        props: {dangerouslySetInnerHTML?: {__html: string}} & Record<string, unknown> | null;
        key?: string | number | null;
    }

    interface IntrinsicElements {
        [elemName: string]: any;
    }
}
