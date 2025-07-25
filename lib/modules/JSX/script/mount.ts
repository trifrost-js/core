import {type Router} from '../../../routing/Router';
import {MimeTypes} from '../../../types/constants';
import {isDevMode} from '../../../utils/Generic';
import {ARC_GLOBAL, ARC_GLOBAL_OBSERVER, ATOMIC_GLOBAL} from './atomic';
import {createScript} from './use';

export function mount(router: Router, path: string, module: ReturnType<typeof createScript>['script']) {
    /* Set mount path on module */
    module.setMountPath(path);

    router.get(path, ctx => {
        /* Set js mime */
        ctx.setType(MimeTypes.JS);

        const debug = isDevMode(ctx.env);

        return ctx.text(
            ARC_GLOBAL(debug) + (module.isAtomic ? ATOMIC_GLOBAL : ARC_GLOBAL_OBSERVER),
            /* If not in dev mode add cache control */
            !debug ? {status: 200, cacheControl: {type: 'public', maxage: 86400, immutable: true}} : {status: 200},
        );
    });
}
