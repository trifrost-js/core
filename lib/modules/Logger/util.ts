type Fn = (...args: any[]) => any;

/**
 * Symbol attached to methods to prevent duplicate span wraps
 */
export const Sym_TriFrostSpan = Symbol('trifrost.logger.is_span');

export function span (name?: string) {
    return function <This, Args extends any[], Ret> (
        method: (this: This, ...args: Args) => Ret,
        context: ClassMethodDecoratorContext
    ):typeof method {
		/* Prevent re-decoration */
        if (Reflect.get(method, Sym_TriFrostSpan)) return method;

        /* Define span name */
        const span_name = typeof name === 'string' && name.length ? name : String(context.name);

        const wrapped = function (this: This, ...fn_args: Args): Ret {
            /* Get our logger from the context (as first arg) OR from a potential logger getter on this */
            const logger = Array.isArray(fn_args) && fn_args.length
                ? fn_args[0]?.logger ?? (this as any)?.logger
                : (this as any)?.logger ?? (this as any)?.ctx?.logger;
            if (typeof logger?.span !== 'function') return method.call(this, ...fn_args);

            return logger.span(span_name, () => method.call(this, ...fn_args));
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
export function spanFn <T extends Fn> (name:string, fn:T):T;
export function spanFn <T extends Fn> (fn:T):T;
export function spanFn <T extends Fn> (...args:[string,T]|[T]):T {
    const [name_or_fn, maybe_fn] = args;

    /* Define function */
    const fn = typeof name_or_fn === 'function' ? name_or_fn : maybe_fn!;

    /* Prevent re-decoration */
    if (Reflect.get(fn, Sym_TriFrostSpan)) return fn;

    /* Define name */
    const name = typeof name_or_fn === 'string' && name_or_fn.length
        ? name_or_fn
        : typeof fn.name === 'string' && fn.name.length ? fn.name : 'anonymous';

    /* Span function */
    const fn_span = function (this: any, ...fn_args: Parameters<T>): ReturnType<T> {
        const logger = Array.isArray(fn_args) && fn_args.length
            ? fn_args[0]?.logger ?? this?.logger
            : this?.logger ?? this?.ctx?.logger;

        if (typeof logger?.span !== 'function') return fn.apply(this, fn_args);

        return logger.span(name, () => fn.apply(this, fn_args));
    } as T;

    /* Set to prevent re-decoration */
    Reflect.set(fn_span, Sym_TriFrostSpan, true);

    return fn_span;
}
