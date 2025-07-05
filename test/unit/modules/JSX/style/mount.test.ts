// tests/style/mount.test.ts
import {describe, it, vi, expect, beforeEach} from 'vitest';
import {mount} from '../../../../../lib/modules/JSX/style/mount';
import {createCss} from '../../../../../lib/modules/JSX/style/use';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';

describe('style.mount', () => {
    const ctx = {
        env: {},
        setType: vi.fn(),
        text: vi.fn(),
    };

    const ctxDev = {
        env: {TRIFROST_DEV: 'true'},
        setType: vi.fn(),
        text: vi.fn(),
    };

    const router = {
        get: vi.fn(),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Registers a route and returns flushed css', async () => {
        mount(
            router,
            '/styles.css',
            createCss({
                reset: true,
                var: {
                    fontSizeS: '1.8rem',
                    fontSizeM: '2rem',
                    fontSizeL: '2.2rem',
                },
                theme: {
                    bg: {light: '#fff', dark: '#000'},
                    fg: {light: '#000', dark: '#fff'},
                },
                /* These should not be flushed */
                definitions: () => ({
                    /* Flex */
                    f: () => ({display: 'flex'}),
                    fi: () => ({display: 'inline-flex'}),
                    fh: () => ({flexDirection: 'row'}),
                    fv: () => ({flexDirection: 'column'}),
                    fa_l: () => ({alignItems: 'flex-start'}),
                    fa_c: () => ({alignItems: 'center'}),
                    fa_r: () => ({alignItems: 'flex-end'}),
                    fj_l: () => ({justifyContent: 'flex-start'}),
                    fj_c: () => ({justifyContent: 'center'}),
                    fj_r: () => ({justifyContent: 'flex-end'}),
                    fj_sa: () => ({justifyContent: 'space-around'}),
                    fj_sb: () => ({justifyContent: 'space-between'}),
                    fw: () => ({flexWrap: 'wrap'}),
                    fg: () => ({flexGrow: 1}),
                    fg0: () => ({flexGrow: 0}),
                    fs: () => ({flexShrink: 1}),
                    fs0: () => ({flexShrink: 0}),
                }),
            }),
        );

        expect(router.get).toHaveBeenCalledWith('/styles.css', expect.any(Function));

        const handler = router.get.mock.calls[0][1];
        await handler(ctx);

        expect(ctx.setType).toHaveBeenCalledWith('text/css');
        expect(ctx.text).toHaveBeenCalledWith(
            [
                '*, *::before, *::after{box-sizing:border-box}',
                'html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}',
                'footer, header, nav, section, main{display:block}',
                'ol, ul{list-style:none}',
                'q, blockquote::before{content:none}',
                'q, blockquote::after{content:none}',
                'q, blockquote{quotes:none}',
                'table{border-collapse:collapse;border-spacing:0}',
                ':root{--v-fontSizeS:1.8rem;--v-fontSizeM:2rem;--v-fontSizeL:2.2rem}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000;--t-fg:#fff}',
                ':root{--t-bg:#fff;--t-fg:#000}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root{--t-bg:#000;--t-fg:#fff}',
                ':root[data-theme="light"]{--t-bg:#fff;--t-fg:#000}',
                '}',
            ].join(''),
            {status: 200, cacheControl: {immutable: true, maxage: 86400, type: 'public'}},
        );
    });

    it('Memoizes the result after first call', async () => {
        const spy = vi.spyOn(StyleEngine.prototype, 'flush');
        mount(
            router,
            '/cached.css',
            createCss({
                reset: true,
                var: {
                    fontSizeS: '1.8rem',
                    fontSizeM: '2rem',
                    fontSizeL: '2.2rem',
                },
                theme: {
                    bg: {light: '#fff', dark: '#000'},
                    fg: {light: '#000', dark: '#fff'},
                },
                /* These should not be flushed */
                definitions: () => ({
                    /* Flex */
                    f: () => ({display: 'flex'}),
                }),
            }),
        );

        const handler = router.get.mock.calls[0][1];

        await handler(ctx);
        await handler(ctx);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(ctx.setType).toHaveBeenCalledWith('text/css');
        expect(ctx.text).toHaveBeenCalledWith(
            [
                '*, *::before, *::after{box-sizing:border-box}',
                'html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}',
                'footer, header, nav, section, main{display:block}',
                'ol, ul{list-style:none}',
                'q, blockquote::before{content:none}',
                'q, blockquote::after{content:none}',
                'q, blockquote{quotes:none}',
                'table{border-collapse:collapse;border-spacing:0}',
                ':root{--v-fontSizeS:1.8rem;--v-fontSizeM:2rem;--v-fontSizeL:2.2rem}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000;--t-fg:#fff}',
                ':root{--t-bg:#fff;--t-fg:#000}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root{--t-bg:#000;--t-fg:#fff}',
                ':root[data-theme="light"]{--t-bg:#fff;--t-fg:#000}',
                '}',
            ].join(''),
            {status: 200, cacheControl: {immutable: true, maxage: 86400, type: 'public'}},
        );
    });

    it('Does not include reset if reset is false', async () => {
        const spy = vi.spyOn(StyleEngine.prototype, 'flush');
        mount(
            router,
            '/cached.css',
            createCss({
                reset: false,
                var: {
                    fontSizeS: '1.8rem',
                    fontSizeM: '2rem',
                    fontSizeL: '2.2rem',
                },
                theme: {
                    bg: {light: '#fff', dark: '#000'},
                    fg: {light: '#000', dark: '#fff'},
                },
                /* These should not be flushed */
                definitions: () => ({
                    /* Flex */
                    f: () => ({display: 'flex'}),
                }),
            }),
        );

        const handler = router.get.mock.calls[0][1];

        await handler(ctx);
        await handler(ctx);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(ctx.setType).toHaveBeenCalledWith('text/css');
        expect(ctx.text).toHaveBeenCalledWith(
            [
                ':root{--v-fontSizeS:1.8rem;--v-fontSizeM:2rem;--v-fontSizeL:2.2rem}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000;--t-fg:#fff}',
                ':root{--t-bg:#fff;--t-fg:#000}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root{--t-bg:#000;--t-fg:#fff}',
                ':root[data-theme="light"]{--t-bg:#fff;--t-fg:#000}',
                '}',
            ].join(''),
            {status: 200, cacheControl: {immutable: true, maxage: 86400, type: 'public'}},
        );
    });

    it('Does not include cache control if in dev mode', async () => {
        const spy = vi.spyOn(StyleEngine.prototype, 'flush');
        mount(
            router,
            '/cached.css',
            createCss({
                reset: false,
                var: {
                    fontSizeS: '1.8rem',
                    fontSizeM: '2rem',
                    fontSizeL: '2.2rem',
                },
                theme: {
                    bg: {light: '#fff', dark: '#000'},
                    fg: {light: '#000', dark: '#fff'},
                },
                /* These should not be flushed */
                definitions: () => ({
                    /* Flex */
                    f: () => ({display: 'flex'}),
                }),
            }),
        );

        const handler = router.get.mock.calls[0][1];

        await handler(ctxDev);
        await handler(ctxDev);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(ctxDev.setType).toHaveBeenCalledWith('text/css');
        expect(ctxDev.text).toHaveBeenCalledWith(
            [
                ':root{--v-fontSizeS:1.8rem;--v-fontSizeM:2rem;--v-fontSizeL:2.2rem}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000;--t-fg:#fff}',
                ':root{--t-bg:#fff;--t-fg:#000}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root{--t-bg:#000;--t-fg:#fff}',
                ':root[data-theme="light"]{--t-bg:#fff;--t-fg:#000}',
                '}',
            ].join(''),
            {status: 200},
        );
    });

    it('Calls mount path on module', async () => {
        const spy = vi.spyOn(StyleEngine.prototype, 'flush');
        const css = createCss({
            reset: false,
            var: {
                fontSizeS: '1.8rem',
                fontSizeM: '2rem',
                fontSizeL: '2.2rem',
            },
            theme: {
                bg: {light: '#fff', dark: '#000'},
                fg: {light: '#000', dark: '#fff'},
            },
            /* These should not be flushed */
            definitions: () => ({
                /* Flex */
                f: () => ({display: 'flex'}),
            }),
        });
        const mountSpy = vi.spyOn(css, 'setMountPath');
        mount(router, '/cached.css', css);

        const handler = router.get.mock.calls[0][1];

        await handler(ctxDev);
        await handler(ctxDev);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(ctxDev.setType).toHaveBeenCalledWith('text/css');
        expect(ctxDev.text).toHaveBeenCalledWith(
            [
                ':root{--v-fontSizeS:1.8rem;--v-fontSizeM:2rem;--v-fontSizeL:2.2rem}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000;--t-fg:#fff}',
                ':root{--t-bg:#fff;--t-fg:#000}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root{--t-bg:#000;--t-fg:#fff}',
                ':root[data-theme="light"]{--t-bg:#fff;--t-fg:#000}',
                '}',
            ].join(''),
            {status: 200},
        );
        expect(mountSpy).toHaveBeenCalledWith('/cached.css');
    });
});
