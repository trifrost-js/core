import z, {type ZodTypeAny} from 'zod';
import {App, type TriFrostRouter} from './lib/';
import {type TFValidator, type TFInput} from './lib/types/validation';
import {type TriFrostContext} from './lib/types/context';

/**
 * Wrap Zod schemas into a TFValidator.
 */
export function zValidator<
    TBody extends ZodTypeAny | undefined,
    TQuery extends ZodTypeAny | undefined,
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {},
>(
    schemas: {body?: TBody; query?: TQuery},
    onInvalid?: (ctx: TriFrostContext<Env, State>, err: unknown) => void | Promise<void>,
): TFValidator<
    TFInput<TBody extends ZodTypeAny ? z.infer<TBody> : {}, TQuery extends ZodTypeAny ? z.infer<TQuery> & Record<string, unknown> : {}>,
    Env,
    State
> {
    type TInput = TFInput<
        TBody extends ZodTypeAny ? z.infer<TBody> : {},
        TQuery extends ZodTypeAny ? z.infer<TQuery> & Record<string, unknown> : {}
    >;

    return {
        parse: raw =>
            ({
                body: schemas.body ? schemas.body.parse(raw.body) : ({} as any),
                query: schemas.query ? schemas.query.parse(raw.query) : ({} as any),
            }) as TInput,
        onInvalid,
    } satisfies TFValidator<TInput, Env, State>;
}

/**
 * Example schemas
 */
const UserSchema = {
    body: z.object({name: z.string(), age: z.number()}),
    query: z.object({active: z.boolean().optional()}),
};

/**
 * Router with routes
 */
export function groupsRouter(r: TriFrostRouter) {
    return r
        .get('/submit', ctx => {
            return ctx.json({hello: 'world'});
        })
        .post('/submitForm', {
            input: zValidator(UserSchema),
            fn: ctx => {
                return ctx.json({
                    user: ctx.body.age,
                    filter: ctx.query,
                });
            },
        });
}

/**
 * Mount onto app
 */
new App().group('', groupsRouter);
