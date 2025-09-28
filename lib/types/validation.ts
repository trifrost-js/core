import {type TriFrostContext} from './context';

export type TFInput<TBody = unknown, TQuery extends Record<string, unknown> = Record<string, unknown>> = {
    body: TBody;
    query: TQuery;
};

/**
 * Extract the input shape carried by a validator
 */
export type ExtractInput<T> = T extends {__inputType?: infer U} ? U : TFInput;

export type TFValidator<TInput, Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}> = {
    parse: (raw: {body: unknown; query: unknown}) => TInput;
    onInvalid?: (ctx: TriFrostContext<Env, State>, err: unknown) => void | Promise<void>;
    /** @internal purely for typing, never set in runtime */
    __inputType?: TInput;
};
