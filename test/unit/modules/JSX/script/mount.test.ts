import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mount} from '../../../../../lib/modules/JSX/script/mount';
import {createScript} from '../../../../../lib/modules/JSX/script/use';
import {ATOMIC_GLOBAL, ARC_GLOBAL, ARC_GLOBAL_OBSERVER} from '../../../../../lib/modules/JSX/script/atomic';
import {MimeTypes} from '../../../../../lib/types/constants';
import * as Generic from '../../../../../lib/utils/Generic';

describe('Modules - JSX - script - mount', () => {
    const ctx = {
        setType: vi.fn(),
        text: vi.fn(),
        env: {},
    };

    const router = {
        get: vi.fn(),
    };

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('Registers route and sets correct content + cache (prod, atomic)', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(false);

        const {script} = createScript({atomic: true});
        mount(router as any, '/runtime.js', script);

        expect(script.setMountPath).toBeDefined();
        expect(router.get).toHaveBeenCalledWith('/runtime.js', expect.any(Function));

        const handler = router.get.mock.calls[0][1];
        handler(ctx as any);

        expect(ctx.setType).toHaveBeenCalledWith(MimeTypes.JS);
        expect(ctx.text).toHaveBeenCalledWith(ARC_GLOBAL + ATOMIC_GLOBAL, {
            status: 200,
            cacheControl: {type: 'public', maxage: 86400, immutable: true},
        });
    });

    it('Registers route and omits cache headers in dev mode (atomic)', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(true);

        const {script} = createScript({atomic: true});
        mount(router as any, '/dev.js', script);

        const handler = router.get.mock.calls[0][1];
        handler(ctx as any);

        expect(ctx.setType).toHaveBeenCalledWith(MimeTypes.JS);
        expect(ctx.text).toHaveBeenCalledWith(ARC_GLOBAL + ATOMIC_GLOBAL, {status: 200});
    });

    it('Registers route and serves ARC + observer when atomic is disabled', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(false);

        const {script} = createScript({atomic: false});
        mount(router as any, '/non-atomic.js', script);

        const handler = router.get.mock.calls[0][1];
        handler(ctx as any);

        expect(ctx.setType).toHaveBeenCalledWith(MimeTypes.JS);
        expect(ctx.text).toHaveBeenCalledWith(ARC_GLOBAL + ARC_GLOBAL_OBSERVER, {
            status: 200,
            cacheControl: {type: 'public', maxage: 86400, immutable: true},
        });
    });
});
