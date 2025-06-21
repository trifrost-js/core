/* eslint-disable @typescript-eslint/no-empty-object-type */

import {type Router} from '../../../routing/Router';
import {MimeTypes} from '../../../types';
import {setActiveCtx} from '../ctx/use';
import {StyleEngine} from './Engine';
import {setActiveStyleEngine, type CssInstance} from './use';
import {isDevMode} from '../../../utils/Generic';

export function mount<
    V extends Record<string, string> = {},
    T extends Record<string, any> = {},
    R extends Record<string, Record<string, unknown>> = {},
    B extends Record<string, string> = {}
> (
    router:Router,
    path:string,
    module:CssInstance<V, T, R, B>
) {
    /* We cache root content in mem*/
    let content:string;

    /* Set mount path on module */
    module.setMountPath(path);

    router.get(path, ctx => {
        if (!content) {
            const style_engine = setActiveStyleEngine(new StyleEngine());
            setActiveCtx(ctx);
            /* We wrap in setMountPath(path) and setMountPath(null) to tell the module we're rendering our mounted parts */
            module.setMountPath(null);
            module.root();
            module.setMountPath(path);
            content = style_engine.flush(true);
            setActiveCtx(null);
            setActiveStyleEngine(null);
        }

        /* Set css mime */
        ctx.setType(MimeTypes.CSS);

        return ctx.text(
            content,
            /* If not in dev mode add cache control */
            !isDevMode(ctx.env)
                ? {status: 200, cacheControl: {type: 'public', maxage: 86400, immutable: true}}
                : {status: 200}
        );
    });
}
