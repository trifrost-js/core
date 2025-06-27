import {type Router} from '../../../routing/Router';
import {MimeTypes} from '../../../types/constants';
import {isDevMode} from '../../../utils/Generic';
import {ATOMIC_GLOBAL} from './atomic';
import {createScript} from './use';

export function mount(router: Router, path: string, module: ReturnType<typeof createScript>['script']) {
    if (!module.isAtomic) return;

    /* We cache root content in mem*/
    const content: string = ATOMIC_GLOBAL;

    /* Set mount path on module */
    module.setMountPath(path);

    router.get(path, ctx => {
        /* Set js mime */
        ctx.setType(MimeTypes.JS);

        return ctx.text(
            content,
            /* If not in dev mode add cache control */
            !isDevMode(ctx.env) ? {status: 200, cacheControl: {type: 'public', maxage: 86400, immutable: true}} : {status: 200},
        );
    });
}
