import {ctx as getCtx} from '../../utils/Als';
import {type TriFrostLogger} from './types';

type Fn = (...args: any[]) => any;

/**
 * Symbol attached to methods to prevent duplicate span wraps
 */
export const Sym_TriFrostSpan = Symbol('trifrost.logger.is_span');

function hasLogger(val: any) {
    return typeof val?.logger?.span === 'function';
}

/**
 * Resolve a TriFrost logger instance from any combination of:
 * - ALS-bound context (if available)
 * - First argument (if it's a TriFrostContext)
 * - `this.logger` or `this.ctx.logger` (for instance methods)
 */
function resolveLogger(self: any, args: any[]) {
    // ALS-bound context
    const ctxAls = getCtx();
    if (hasLogger(ctxAls)) return ctxAls?.logger as TriFrostLogger;

    // First argument
    const ctxArg = Array.isArray(args) && args.length ? args[0] : undefined;
    if (hasLogger(ctxArg)) return ctxArg?.logger as TriFrostLogger;

    // Fallback to self.logger
    if (hasLogger(self)) return self.logger as TriFrostLogger;

    // Fallback to self.ctx.logger
    if (hasLogger(self?.ctx)) return self.ctx.logger as TriFrostLogger;

    return null;
}

export function span(name?: string) {
    return function <This, Args extends any[], Ret>(
        method: (this: This, ...args: Args) => Ret,
        context: ClassMethodDecoratorContext,
    ): typeof method {
        /* Prevent re-decoration */
        if (Reflect.get(method, Sym_TriFrostSpan)) return method;

        /* Define span name */
        const span_name = typeof name === 'string' && name.length ? name : String(context.name);

        const wrapped = function (this: This, ...fn_args: Args): Ret {
            const logger = resolveLogger(this, fn_args);
            if (!logger) return method.call(this, ...fn_args);
            return logger.span(span_name, () => method.call(this, ...fn_args)) as Ret;
        };

        /* Set to prevent re-decoration */
        Reflect.set(wrapped, Sym_TriFrostSpan, true);

        return wrapped;
    };
}

/**
 * Wraps a function (sync or async) in a logger span if available.
 * Can be used as: spanFn(fn) or spanFn('name', fn)
 */
export function spanFn<T extends Fn>(name: string, fn: T): T;
export function spanFn<T extends Fn>(fn: T): T;
export function spanFn<T extends Fn>(...args: [string, T] | [T]): T {
    const [name_or_fn, maybe_fn] = args;

    /* Define function */
    const fn = typeof name_or_fn === 'function' ? name_or_fn : maybe_fn!;

    /* Prevent re-decoration */
    if (Reflect.get(fn, Sym_TriFrostSpan)) return fn;

    /* Define name */
    // eslint-disable-next-line prettier/prettier
    const span_name = typeof name_or_fn === 'string' && name_or_fn.length ? name_or_fn : typeof fn.name === 'string' && fn.name.length ? fn.name : 'anonymous';

    /* Span function */
    const fn_span = function (this: any, ...fn_args: Parameters<T>): ReturnType<T> {
        const logger = resolveLogger(this, fn_args);
        if (!logger) return fn.apply(this, fn_args);
        return logger.span(span_name, () => fn.apply(this, fn_args)) as ReturnType<T>;
    } as T;

    /* Set to prevent re-decoration */
    Reflect.set(fn_span, Sym_TriFrostSpan, true);

    return fn_span;
}
