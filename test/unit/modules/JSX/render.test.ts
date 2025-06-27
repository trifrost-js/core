/* eslint-disable no-console */
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {render, escape, rootRender} from '../../../../lib/modules/JSX/render';
import {Fragment} from '../../../../lib/modules/JSX/runtime';
import {createCss} from '../../../../lib/modules/JSX/style/use';
import {nonce} from '../../../../lib/modules/JSX/ctx/nonce';
import {env} from '../../../../lib/modules/JSX/ctx/env';
import {state} from '../../../../lib/modules/JSX/ctx/state';
import {Style} from '../../../../lib/modules/JSX/style/Style';
import {Script} from '../../../../lib/modules/JSX/script/Script';
import * as Generic from '../../../../lib/utils/Generic';
import {MockContext} from '../../../MockContext';
import {createScript} from '../../../../lib/modules/JSX/script/use';
import {ATOMIC_GLOBAL, ATOMIC_VM_AFTER, ATOMIC_VM_BEFORE} from '../../../../lib/modules/JSX/script/atomic';

describe('Modules - JSX - Renderer', () => {
    describe('escape()', () => {
        it('Escapes & to &amp;', () => {
            expect(escape('Fish & Chips')).toBe('Fish &amp; Chips');
        });

        it('Escapes < and > to &lt; and &gt;', () => {
            expect(escape('<div>')).toBe('&lt;div&gt;');
            expect(escape('</script>')).toBe('&lt;/script&gt;');
        });

        it('Escapes double and single quotes', () => {
            expect(escape('"quote"')).toBe('&quot;quote&quot;');
            expect(escape("'quote'")).toBe('&#39;quote&#39;');
        });

        it('Escapes multiple entities in one string', () => {
            expect(escape('5 > 3 && 2 < 4')).toBe('5 &gt; 3 &amp;&amp; 2 &lt; 4');
        });

        it('Returns original string if no escapable characters are present', () => {
            const clean = 'hello world';
            expect(escape(clean)).toBe(clean);
        });

        it('Handles empty string', () => {
            expect(escape('')).toBe('');
        });

        it('Is idempotent (double escape does nothing more)', () => {
            const once = escape('<>&\'"');
            const twice = escape(once);
            expect(once).toBe(twice);
        });
    });

    describe('render', () => {
        it('Renders basic primitives', () => {
            expect(render('hello')).toBe('hello');
            expect(render('')).toBe('');
            expect(render(0)).toBe('0');
            expect(render(123)).toBe('123');
            expect(render(false)).toBe('');
            expect(render(null)).toBe('');
            expect(render(undefined)).toBe('');
        });

        it('Escapes dangerous HTML entities', () => {
            expect(render('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
            expect(render('&test')).toBe('&amp;test');
            expect(render('"quoted"')).toBe('&quot;quoted&quot;');
            expect(render("'quote'"))?.toBe('&#39;quote&#39;');
        });

        it('Renders single standard HTML element', () => {
            expect(render({type: 'div', props: {children: 'content'}})).toBe('<div>content</div>');
        });

        it('Renders nested elements', () => {
            expect(
                render({
                    type: 'section',
                    props: {
                        children: {
                            type: 'div',
                            props: {
                                children: {
                                    type: 'p',
                                    props: {children: 'Deep'},
                                },
                            },
                        },
                    },
                }),
            ).toBe('<section><div><p>Deep</p></div></section>');
        });

        it('Renders void/self-closing tags properly', () => {
            expect(render({type: 'br', props: {}})).toBe('<br />');
            expect(render({type: 'img', props: {src: 'x.png', alt: 'test'}})).toBe('<img src="x.png" alt="test" />');
        });

        it('Renders style props with kebab-cased CSS', () => {
            expect(
                render({
                    type: 'div',
                    props: {style: {backgroundColor: 'red', fontSize: '12px'}, children: ''},
                }),
            ).toBe('<div style="background-color:red;font-size:12px"></div>');
        });

        it('Renders style props with numeric and camelCase values', () => {
            expect(
                render({
                    type: 'span',
                    props: {
                        style: {
                            lineHeight: 1.5,
                            paddingTop: '10px',
                            borderBottomColor: 'blue',
                        },
                        children: 'Styled',
                    },
                }),
            ).toBe('<span style="line-height:1.5;padding-top:10px;border-bottom-color:blue">Styled</span>');
        });

        it('Renders an array of JSX elements', () => {
            const out = render([
                {type: 'span', props: {children: 'one'}},
                {type: 'span', props: {children: 'two'}},
            ]);

            expect(out).toBe('<span>one</span><span>two</span>');
        });

        it('should handle element with empty props', () => {
            const out = render({type: 'div', props: {}});
            expect(out).toBe('<div></div>');
        });

        it('Ignores null/undefined style values', () => {
            expect(
                render({
                    type: 'div',
                    props: {
                        style: {
                            color: null,
                            display: undefined,
                            margin: '0',
                        },
                        children: '',
                    },
                }),
            ).toBe('<div style="margin:0"></div>');
        });

        it('Renders boolean props properly', () => {
            expect(render({type: 'input', props: {checked: true}})).toBe('<input checked />');
            expect(render({type: 'input', props: {disabled: true, required: true}})).toBe('<input disabled required />');
        });

        it('Renders falsy-but-valid props', () => {
            expect(render({type: 'div', props: {'data-zero': 0}})).toBe('<div data-zero="0"></div>');
            expect(render({type: 'div', props: {'data-false': false}})).toBe('<div data-false="false"></div>');
            expect(render({type: 'div', props: {'data-empty': ''}})).toBe('<div data-empty=""></div>');
        });

        it('Ignores invalid or function-only props like children or null', () => {
            expect(render({type: 'div', props: {children: null, onclick: null}})).toBe('<div></div>');
        });

        it('Renders Fragment with multiple children', () => {
            expect(
                render({
                    type: Fragment,
                    props: {
                        children: [
                            {type: 'span', props: {children: 'One'}},
                            {type: 'span', props: {children: 'Two'}},
                        ],
                    },
                }),
            ).toBe('<span>One</span><span>Two</span>');
        });

        it('Renders mapped JSX output (e.g. list)', () => {
            const children = ['A', 'B', 'C'].map(txt => ({type: 'li', props: {children: txt}}));
            expect(render({type: 'ul', props: {children}})).toBe('<ul><li>A</li><li>B</li><li>C</li></ul>');
        });

        it('Renders function components with props', () => {
            const Comp = ({text}: {text: string}) => ({type: 'p', props: {children: text}});
            expect(render({type: Comp, props: {text: 'hello'}})).toBe('<p>hello</p>');
        });

        it('Renders dangerouslySetInnerHTML properly', () => {
            expect(
                render({
                    type: 'div',
                    props: {
                        dangerouslySetInnerHTML: {
                            __html: '<b>bold</b>',
                        },
                    },
                }),
            ).toBe('<div><b>bold</b></div>');
        });

        it('Renders nested Fragments inside elements', () => {
            const nested = {
                type: 'div',
                props: {
                    children: {
                        type: Fragment,
                        props: {
                            children: [
                                {type: 'span', props: {children: 'one'}},
                                {type: 'span', props: {children: 'two'}},
                            ],
                        },
                    },
                },
            };
            expect(render(nested)).toBe('<div><span>one</span><span>two</span></div>');
        });

        it('Ignores unknown types or non-object nodes gracefully', () => {
            expect(render(Symbol('test') as any)).toBe('');
            expect(render({} as any)).toBe('');
            expect(render({type: undefined, props: {}} as any)).toBe('');
        });
    });

    describe('rootRender', () => {
        let css: ReturnType<typeof createCss>;

        beforeEach(() => {
            css = createCss();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('Injects styles correctly from inside the render tree', () => {
            const Component = () => {
                const cls = css({padding: '1rem', backgroundColor: 'blue'});
                return {type: 'div', props: {className: cls, children: 'Hello'}};
            };

            const ctx = new MockContext();

            const html = rootRender(ctx, ['__TRIFROST_STYLE_MARKER__', {type: Component, props: {}}]);
            expect(html).toBe(
                [
                    `<style nonce="${ctx.nonce}">.tf15g6c60{padding:1rem;background-color:blue}</style>`,
                    '<div class="tf15g6c60">Hello</div>',
                ].join(''),
            );
        });

        it('Renders with expected class name and style from inside component', () => {
            let cls = '';

            const Component = () => {
                cls = css({margin: '2rem', color: 'black'});
                return {type: 'div', props: {className: cls, children: 'Styled'}};
            };

            const ctx = new MockContext();

            const html = rootRender(ctx, ['__TRIFROST_STYLE_MARKER__', {type: Component, props: {}}]);
            expect(html).toBe(`<style nonce="${ctx.nonce}">.${cls}{margin:2rem;color:black}</style><div class="${cls}">Styled</div>`);
        });

        it('Injects full page with marker placement respected', () => {
            const Header = () => {
                const cls = css({fontSize: '1.5rem', fontWeight: 'bold'});
                return {type: 'header', props: {className: cls, children: 'Title'}};
            };
            const Body = () => {
                const cls = css({lineHeight: 1.5, padding: '2rem'});
                return {type: 'main', props: {className: cls, children: 'Content'}};
            };
            const Page = () => ({
                type: Fragment,
                props: {
                    children: [{type: Header, props: {}}, '__TRIFROST_STYLE_MARKER__', {type: Body, props: {}}],
                },
            });

            const ctx = new MockContext();
            const html = rootRender(ctx, {type: Page, props: {}});
            expect(html).toBe(
                [
                    '<header class="tfs8h0jj">Title</header>',
                    `<style nonce="${ctx.nonce}">`,
                    '.tfs8h0jj{font-size:1.5rem;font-weight:bold}',
                    '.tfy8y40d{line-height:1.5;padding:2rem}',
                    '</style>',
                    '<main class="tfy8y40d">Content</main>',
                ].join(''),
            );
        });

        it('Returns class but does not inject style when css({…}, {inject: false}) is used', () => {
            let cls = '';
            const Component = () => {
                cls = css({color: 'red'}, {inject: false});
                return {type: 'div', props: {className: cls, children: 'Not styled'}};
            };
            const html = rootRender(new MockContext(), {type: Component, props: {}});
            expect(html).toBe(`<div class="${cls}">Not styled</div>`);
        });

        it('Injects styles into head and renders a complete page', () => {
            const Button = () => {
                const cls = css({
                    padding: '0.75rem 1.25rem',
                    border: 'none',
                    backgroundColor: 'blue',
                    color: 'white',
                    fontWeight: 'bold',
                    borderRadius: '0.25rem',
                    ':hover': {backgroundColor: 'darkblue'},
                });
                return {
                    type: 'button',
                    props: {className: cls, children: 'Click Me'},
                };
            };

            const FullPage = () => ({
                type: 'html',
                props: {
                    children: [
                        {
                            type: 'head',
                            props: {
                                children: [
                                    {type: 'title', props: {children: 'TriFrost Demo'}},
                                    {type: Style, props: {}}, // style marker
                                ],
                            },
                        },
                        {
                            type: 'body',
                            props: {
                                children: [
                                    {type: 'h1', props: {children: 'Welcome to TriFrost'}},
                                    {type: Button, props: {}},
                                ],
                            },
                        },
                    ],
                },
            });

            const ctx = new MockContext();
            const output = rootRender(ctx, {type: FullPage, props: {}});
            expect(output).toBe(
                [
                    '<html>',
                    '<head>',
                    '<title>TriFrost Demo</title>',
                    `<style nonce="${ctx.nonce}">`,
                    '.tf1f9e66l:hover{background-color:darkblue}',
                    '.tf1f9e66l{padding:0.75rem 1.25rem;border:none;background-color:blue;color:white;font-weight:bold;border-radius:0.25rem}',
                    '</style>',
                    '</head>',
                    '<body>',
                    '<h1>Welcome to TriFrost</h1>',
                    '<button class="tf1f9e66l">Click Me</button>',
                    '</body>',
                    '</html>',
                ].join(''),
            );
        });

        it('Resets the StyleEngine after rendering', () => {
            let cls = '';
            const Component = () => {
                cls = css({margin: '2rem', color: 'black'});
                return {type: 'div', props: {className: cls, children: 'Styled'}};
            };

            const ctx = new MockContext();

            const html = rootRender(ctx, ['__TRIFROST_STYLE_MARKER__', {type: Component, props: {}}]);
            expect(html).toBe(`<style nonce="${ctx.nonce}">.${cls}{margin:2rem;color:black}</style><div class="${cls}">Styled</div>`);

            const ctx2 = new MockContext();

            let cls2 = '';
            const Component2 = () => {
                cls2 = css({color: 'white', fontFamily: 'sans-serif'});
                return {type: 'p', props: {className: cls2, children: 'Styled'}};
            };
            const html2 = rootRender(ctx2, ['__TRIFROST_STYLE_MARKER__', {type: Component2, props: {}}]);
            expect(html2).toBe(
                [`<style nonce="${ctx2.nonce}">.${cls2}{color:white;font-family:sans-serif}</style>`, `<p class="${cls2}">Styled</p>`].join(
                    '',
                ),
            );
        });

        it('Exposes nonce via active context during render', () => {
            const Component = () => ({type: 'script', props: {nonce: nonce(), children: 'Nonce-bound'}});

            const html = rootRender(new MockContext({nonce: 'abc-123'}), {type: Component, props: {}});
            expect(html).toBe('<script nonce="abc-123">Nonce-bound</script>');
        });

        it('Resets active ctx after render completes', () => {
            const Component = () => ({type: 'div', props: {children: nonce()}});

            const html = rootRender(new MockContext({nonce: 'abc123'}), {type: Component, props: {}});
            expect(html).toContain('abc123');

            const html2 = rootRender(new MockContext({nonce: null}), {type: Component, props: {}});
            expect(html2).not.toContain('abc123');
        });

        it('Calls script.root and css.root from options if provided', () => {
            const mockCss = {root: vi.fn(), inject: vi.fn(html => html)};
            const mockScript = {root: vi.fn(), inject: vi.fn(html => html)};
            const ctx = new MockContext();
            const Component = () => ({type: 'div', props: {children: 'Hello'}});

            /* @ts-expect-error Should be good */
            const html = rootRender(ctx, {type: Component, props: {}}, {css: mockCss, script: mockScript});

            expect(mockCss.root).toHaveBeenCalledTimes(1);
            expect(mockScript.root).toHaveBeenCalledTimes(1);
            expect(html).toBe('<div>Hello</div>');
        });

        it('calls only css.root if script is not provided', () => {
            const mockCss = {root: vi.fn(), inject: vi.fn(html => html)};
            const mockScript = {root: vi.fn(), inject: vi.fn(html => html)};
            const ctx = new MockContext();
            const Component = () => ({type: 'div', props: {children: 'Hello'}});

            /* @ts-expect-error Should be good */
            const html = rootRender(ctx, {type: Component, props: {}}, {css: mockCss});

            expect(mockCss.root).toHaveBeenCalledTimes(1);
            expect(mockScript.root).not.toHaveBeenCalled();
            expect(html).toBe('<div>Hello</div>');
        });

        it('calls only script.root if css is not provided', () => {
            const mockCss = {root: vi.fn(), inject: vi.fn(html => html)};
            const mockScript = {root: vi.fn(), inject: vi.fn(html => html)};
            const ctx = new MockContext();
            const Component = () => ({type: 'div', props: {children: 'Hello'}});

            /* @ts-expect-error Should be good */
            const html = rootRender(ctx, {type: Component, props: {}}, {script: mockScript});

            expect(mockCss.root).not.toHaveBeenCalled();
            expect(mockScript.root).toHaveBeenCalledTimes(1);
            expect(html).toBe('<div>Hello</div>');
        });

        it('Includes css root and script root when passed to render context and not in html', () => {
            let idCounter = 0;
            vi.spyOn(Generic, 'hexId').mockImplementation(() => `id-${++idCounter}`);

            const ctx = new MockContext();

            const css2 = createCss({reset: true});
            const client = createScript({atomic: true});

            const Component = () => {
                const cls = css2({margin: '2rem', color: 'black'});
                return {type: 'div', props: {className: cls, children: 'Styled'}};
            };

            const html = rootRender(
                ctx,
                {
                    type: 'ul',
                    props: {
                        children: [
                            {
                                type: Component,
                            },
                            {
                                type: 'li',
                                props: {
                                    children: [
                                        'A',
                                        {
                                            type: client.Script,
                                            props: {
                                                data: {a: 1, b: 2},
                                                children: (el, data) => (el.innerText = JSON.stringify(data)),
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'li',
                                props: {
                                    children: [
                                        'B',
                                        {
                                            type: client.Script,
                                            props: {
                                                data: {b: 2, a: 1},
                                                children: (el, data) => (el.innerText = JSON.stringify(data)),
                                            },
                                        },
                                    ],
                                },
                            },
                            '__TRIFROST_STYLE_MARKER__',
                        ],
                    },
                },
                /* @ts-expect-error Should be good */
                {css: css2, script: client.script},
            );

            /* Note: order in json stringification matters */
            expect(html).toBe(
                [
                    '<ul>',
                    '<div class="tf15fd003">Styled</div>',
                    '<li data-tfhf="id-3" data-tfhd="id-4">A</li>',
                    '<li data-tfhf="id-3" data-tfhd="id-5">B</li>',
                    '<style nonce="aWQtMQ==">*, *::before, *::after{box-sizing:border-box}html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}footer, header, nav, section, main{display:block}ol, ul{list-style:none}q, blockquote::before{content:none}q, blockquote::after{content:none}q, blockquote{quotes:none}table{border-collapse:collapse;border-spacing:0}.tf15fd003{margin:2rem;color:black}</style>',
                    '</ul>',
                    '<script nonce="aWQtMQ==">(function(d,w){',
                    ATOMIC_GLOBAL,
                    'const TFD={"id-4":{"a":1,"b":2},"id-5":{"b":2,"a":1}};',
                    'const TFF={"id-3":(el, data) => el.innerText = JSON.stringify(data)};',
                    'for(const id in TFF){',
                    'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                    'for(let n of N){',
                    ATOMIC_VM_BEFORE,
                    'const dId=n.getAttribute("data-tfhd");',
                    'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                    ATOMIC_VM_AFTER,
                    '}}})(document,window);</script>',
                ].join(''),
            );
        });

        it('Includes css root and script root when passed to render context and in html', () => {
            let idCounter = 0;
            vi.spyOn(Generic, 'hexId').mockImplementation(() => `id-${++idCounter}`);

            const ctx = new MockContext();

            const css2 = createCss({reset: true});
            const client = createScript({atomic: true});

            const Component = () => {
                const cls = css2({margin: '2rem', color: 'black'});
                return {type: 'div', props: {className: cls, children: 'Styled'}};
            };

            const html = rootRender(
                ctx,
                {
                    type: 'html',
                    props: {
                        children: [
                            {
                                type: 'body',
                                props: {
                                    children: [
                                        {
                                            type: 'ul',
                                            props: {
                                                children: [
                                                    {
                                                        type: Component,
                                                    },
                                                    {
                                                        type: 'li',
                                                        props: {
                                                            children: [
                                                                'A',
                                                                {
                                                                    type: client.Script,
                                                                    props: {
                                                                        data: {a: 1, b: 2},
                                                                        children: (el, data) => (el.innerText = JSON.stringify(data)),
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                    },
                                                    {
                                                        type: 'li',
                                                        props: {
                                                            children: [
                                                                'B',
                                                                {
                                                                    type: client.Script,
                                                                    props: {
                                                                        data: {b: 2, a: 1},
                                                                        children: (el, data) => (el.innerText = JSON.stringify(data)),
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                    },
                                                    '__TRIFROST_STYLE_MARKER__',
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
                /* @ts-expect-error Should be good */
                {css: css2, script: client.script},
            );

            /* Note: order in json stringification matters */
            expect(html).toBe(
                [
                    '<html><body><ul>',
                    '<div class="tf15fd003">Styled</div>',
                    '<li data-tfhf="id-3" data-tfhd="id-4">A</li>',
                    '<li data-tfhf="id-3" data-tfhd="id-5">B</li>',
                    '<style nonce="aWQtMQ==">',
                    '*, *::before, *::after{box-sizing:border-box}html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}footer, header, nav, section, main{display:block}ol, ul{list-style:none}q, blockquote::before{content:none}q, blockquote::after{content:none}q, blockquote{quotes:none}table{border-collapse:collapse;border-spacing:0}',
                    '.tf15fd003{margin:2rem;color:black}',
                    '</style>',
                    '</ul>',
                    '<script nonce="aWQtMQ==">(function(d,w){',
                    ATOMIC_GLOBAL,
                    'const TFD={"id-4":{"a":1,"b":2},"id-5":{"b":2,"a":1}};',
                    'const TFF={"id-3":(el, data) => el.innerText = JSON.stringify(data)};',
                    'for(const id in TFF){',
                    'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                    'for(let n of N){',
                    ATOMIC_VM_BEFORE,
                    'const dId=n.getAttribute("data-tfhd");',
                    'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                    ATOMIC_VM_AFTER,
                    '}}})(document,window);</script></body></html>',
                ].join(''),
            );
        });

        it('Includes css root and script root when passed to render context and in html BUT with mount paths set', () => {
            let idCounter = 0;
            vi.spyOn(Generic, 'hexId').mockImplementation(() => `id-${++idCounter}`);

            const ctx = new MockContext();

            const css2 = createCss({reset: true});
            const client = createScript({atomic: true});

            css2.setMountPath('/static.css');
            client.script.setMountPath('/static.js');

            const Component = () => {
                const cls = css2({margin: '2rem', color: 'black'});
                return {type: 'div', props: {className: cls, children: 'Styled'}};
            };

            const html = rootRender(
                ctx,
                {
                    type: 'html',
                    props: {
                        children: [
                            {
                                type: 'body',
                                props: {
                                    children: [
                                        {
                                            type: 'ul',
                                            props: {
                                                children: [
                                                    {
                                                        type: Component,
                                                    },
                                                    {
                                                        type: 'li',
                                                        props: {
                                                            children: [
                                                                'A',
                                                                {
                                                                    type: client.Script,
                                                                    props: {
                                                                        data: {a: 1, b: 2},
                                                                        children: (el, data) => (el.innerText = JSON.stringify(data)),
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                    },
                                                    {
                                                        type: 'li',
                                                        props: {
                                                            children: [
                                                                'B',
                                                                {
                                                                    type: client.Script,
                                                                    props: {
                                                                        data: {b: 2, a: 1},
                                                                        children: (el, data) => (el.innerText = JSON.stringify(data)),
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                    },
                                                    '__TRIFROST_STYLE_MARKER__',
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
                /* @ts-expect-error Should be good */
                {css: css2, script: client.script},
            );

            /* Note: order in json stringification matters */
            expect(html).toBe(
                [
                    '<html><body><ul>',
                    '<div class="tf15fd003">Styled</div>',
                    '<li data-tfhf="id-3" data-tfhd="id-4">A</li>',
                    '<li data-tfhf="id-3" data-tfhd="id-5">B</li>',
                    '<link rel="stylesheet" nonce="aWQtMQ==" href="/static.css">',
                    '<style nonce="aWQtMQ==">.tf15fd003{margin:2rem;color:black}</style>',
                    '</ul>',
                    '<script nonce="aWQtMQ==" src="/static.js" defer></script>',
                    '<script nonce="aWQtMQ==">(function(d,w){',
                    'const run=()=>{',
                    'const TFD={"id-4":{"a":1,"b":2},"id-5":{"b":2,"a":1}};',
                    'const TFF={"id-3":(el, data) => el.innerText = JSON.stringify(data)};',
                    'for(const id in TFF){',
                    'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                    'for(let n of N){',
                    ATOMIC_VM_BEFORE,
                    'const dId=n.getAttribute("data-tfhd");',
                    'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                    ATOMIC_VM_AFTER,
                    '}',
                    '}};',
                    'if(!w.$tfhydra){const wait=()=>{w.$tfhydra?run():setTimeout(wait,1)};wait();}else{run()}',
                    '})(document,window);</script></body></html>',
                ].join(''),
            );
        });

        describe('JSX - render - ctx access (env/state/nonce)', () => {
            it('accesses env variables using env()', () => {
                const Component = () => ({
                    type: 'div',
                    props: {
                        children: env<string>('HELLO'),
                    },
                });

                const ctx = new MockContext({env: {HELLO: 'from-env'}});
                const html = rootRender(ctx, {type: Component, props: {}});
                expect(html).toBe('<div>from-env</div>');
            });

            it('accesses state variables using state()', () => {
                const Component = () => ({
                    type: 'div',
                    props: {
                        children: state<number>('count')?.toString(),
                    },
                });

                const ctx = new MockContext({state: {count: 42}});
                const html = rootRender(ctx, {type: Component, props: {}});
                expect(html).toBe('<div>42</div>');
            });

            it('returns undefined/null for missing env/state/nonce', () => {
                const Component = () => ({
                    type: 'div',
                    props: {
                        children: [String(env('missing')), String(state('nope')), String(nonce())],
                    },
                });

                const ctx = new MockContext({env: {}, state: {}, nonce: null});
                const html = rootRender(ctx, {type: Component, props: {}});
                expect(html).toBe('<div>undefinedundefinednull</div>');
            });

            it('env/state/nonce reset after render ends', () => {
                const ctx = new MockContext({env: {key: 'val'}, state: {n: 123}, nonce: 'abc123'});

                const html = rootRender(ctx, {
                    type: () => ({
                        type: 'span',
                        props: {children: [env('key'), String(state('n')), nonce()]},
                    }),
                    props: {},
                });

                expect(html).toBe('<span>val123abc123</span>');

                // after render completes
                expect(env('key')).toBeUndefined();
                expect(state('n')).toBeUndefined();
                expect(nonce()).toBeNull();
            });
        });

        describe('Script', () => {
            let idCounter = 0;

            beforeEach(() => {
                idCounter = 0;
                vi.spyOn(Generic, 'hexId').mockImplementation(() => `id-${++idCounter}`);
            });

            afterEach(() => {
                vi.restoreAllMocks();
            });

            it('Injects data-tfhf and data-tfhd into parent', () => {
                const ctx = new MockContext();
                const html = rootRender(ctx, {
                    type: () => ({
                        type: 'button',
                        props: {
                            children: [
                                'Click me',
                                {
                                    type: Script,
                                    props: {
                                        data: {foo: 'bar'},
                                        children: (el, data) => console.log('Hydrated:', el, data),
                                    },
                                },
                            ],
                        },
                    }),
                    props: {},
                });

                expect(html).toBe(
                    [
                        '<button data-tfhf="id-2" data-tfhd="id-3">Click me</button>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"foo":"bar"}};',
                        'const TFF={"id-2":(el, data) => console.log("Hydrated:", el, data)};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Deduplicates identical functions', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: Fragment,
                    props: {
                        children: Array.from({length: 3}).map(() => ({
                            type: 'span',
                            props: {
                                children: [
                                    'Item',
                                    {
                                        type: Script,
                                        props: {
                                            data: {x: 1},
                                            children: el => (el.dataset.bound = 'true'),
                                        },
                                    },
                                ],
                            },
                        })),
                    },
                });

                expect(html).toBe(
                    [
                        '<span data-tfhf="id-2" data-tfhd="id-3">Item</span><span data-tfhf="id-2" data-tfhd="id-3">Item</span><span data-tfhf="id-2" data-tfhd="id-3">Item</span>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"x":1}};',
                        'const TFF={"id-2":(el) => el.dataset.bound = "true"};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Handles no data payloads', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: 'div',
                    props: {
                        children: [
                            'No Data',
                            {
                                type: Script,
                                props: {
                                    children: el => (el.id = 'injected'),
                                },
                            },
                        ],
                    },
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="id-2">No Data</div>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={};',
                        'const TFF={"id-2":(el) => el.id = "injected"};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Works when nested inside components', () => {
                const Inner = () => ({
                    type: 'div',
                    props: {
                        children: [
                            'Nested',
                            {
                                type: Script,
                                props: {
                                    data: {enabled: true},
                                    children: (el, data) => el.setAttribute('data-enabled', data.enabled),
                                },
                            },
                        ],
                    },
                });

                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: () => ({type: Inner, props: {}}),
                    props: {},
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="id-2" data-tfhd="id-3">Nested</div>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"enabled":true}};',
                        'const TFF={"id-2":(el, data) => el.setAttribute("data-enabled", data.enabled)};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Supports multiple distinct scripts with separate ids', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: Fragment,
                    props: {
                        children: [
                            {
                                type: 'div',
                                props: {
                                    children: [
                                        'First',
                                        {
                                            type: Script,
                                            props: {
                                                data: {count: 1},
                                                children: (el, data) => (el.textContent = `count:${data.count}`),
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    children: [
                                        'Second',
                                        {
                                            type: Script,
                                            props: {
                                                data: {count: 2},
                                                children: (el, data) => (el.textContent = `count is ${data.count}`),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="id-2" data-tfhd="id-3">First</div><div data-tfhf="id-4" data-tfhd="id-5">Second</div>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"count":1},"id-5":{"count":2}};',
                        'const TFF={"id-2":(el, data) => el.textContent = `count:${data.count}`,"id-4":(el, data) => el.textContent = `count is ${data.count}`};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Supports multiple distinct scripts with separate ids but same data', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: Fragment,
                    props: {
                        children: [
                            {
                                type: 'div',
                                props: {
                                    children: [
                                        'First',
                                        {
                                            type: Script,
                                            props: {
                                                data: {count: 1},
                                                children: (el, data) => (el.textContent = `count:${data.count}`),
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    children: [
                                        'Second',
                                        {
                                            type: Script,
                                            props: {
                                                data: {count: 1},
                                                children: (el, data) => (el.textContent = `count is ${data.count}`),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="id-2" data-tfhd="id-3">First</div><div data-tfhf="id-4" data-tfhd="id-3">Second</div>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"count":1}};',
                        'const TFF={"id-2":(el, data) => el.textContent = `count:${data.count}`,"id-4":(el, data) => el.textContent = `count is ${data.count}`};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Supports same scripts with same data', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: Fragment,
                    props: {
                        children: [
                            {
                                type: 'div',
                                props: {
                                    children: [
                                        'First',
                                        {
                                            type: Script,
                                            props: {
                                                data: {count: 1},
                                                children: (el, data) => (el.textContent = `count is ${data.count}`),
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    children: [
                                        'Second',
                                        {
                                            type: Script,
                                            props: {
                                                data: {count: 1},
                                                children: (el, data) => (el.textContent = `count is ${data.count}`),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="id-2" data-tfhd="id-3">First</div><div data-tfhf="id-2" data-tfhd="id-3">Second</div>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"count":1}};',
                        'const TFF={"id-2":(el, data) => el.textContent = `count is ${data.count}`};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Handles deep nested script markers correctly', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: 'section',
                    props: {
                        children: [
                            {
                                type: 'article',
                                props: {
                                    children: [
                                        {
                                            type: 'header',
                                            props: {
                                                children: [
                                                    'Header',
                                                    {
                                                        type: Script,
                                                        props: {
                                                            data: {active: true},
                                                            children: (el, data) => (el.dataset.active = String(data.active)),
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                        {
                                            type: 'footer',
                                            props: {
                                                children: [
                                                    'Footer',
                                                    {
                                                        type: Script,
                                                        props: {
                                                            children: el => (el.dataset.foot = 'true'),
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                });

                expect(html).toBe(
                    [
                        '<section><article><header data-tfhf="id-2" data-tfhd="id-3">Header</header><footer data-tfhf="id-4">Footer</footer></article></section>',
                        '<script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"active":true}};',
                        'const TFF={"id-2":(el, data) => el.dataset.active = String(data.active),"id-4":(el) => el.dataset.foot = "true"};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Works with fragments as children and still injects on parent', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: 'div',
                    props: {
                        children: {
                            type: Fragment,
                            props: {
                                children: [
                                    'Hello',
                                    {
                                        type: Script,
                                        props: {
                                            data: {x: 5},
                                            children: (el, data) => el.setAttribute('data-value', data.x),
                                        },
                                    },
                                ],
                            },
                        },
                    },
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="id-2" data-tfhd="id-3">Hello</div><script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"x":5}};',
                        'const TFF={"id-2":(el, data) => el.setAttribute("data-value", data.x)};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Skips script engine entirely if no Script is used', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: 'main',
                    props: {
                        children: 'Just content',
                    },
                });

                expect(html).toBe('<main>Just content</main>');
            });

            it('Normalizes and deduplicates equal JSON payloads', () => {
                const ctx = new MockContext();

                const html = rootRender(ctx, {
                    type: 'ul',
                    props: {
                        children: [
                            {
                                type: 'li',
                                props: {
                                    children: [
                                        'A',
                                        {
                                            type: Script,
                                            props: {
                                                data: {a: 1, b: 2},
                                                children: (el, data) => (el.innerText = JSON.stringify(data)),
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'li',
                                props: {
                                    children: [
                                        'B',
                                        {
                                            type: Script,
                                            props: {
                                                data: {b: 2, a: 1},
                                                children: (el, data) => (el.innerText = JSON.stringify(data)),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                });

                /* Note: order in json stringification matters */
                expect(html).toBe(
                    [
                        '<ul><li data-tfhf="id-2" data-tfhd="id-3">A</li><li data-tfhf="id-2" data-tfhd="id-4">B</li></ul><script nonce="aWQtMQ==">(function(d,w){const TFD={"id-3":{"a":1,"b":2},"id-4":{"b":2,"a":1}};',
                        'const TFF={"id-2":(el, data) => el.innerText = JSON.stringify(data)};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Normalizes and deduplicates equal JSON payloads as well as embeds atomic', () => {
                const ctx = new MockContext();

                const client = createScript({atomic: true});

                const Component = () => {
                    client.script.root();
                    const cls = css({margin: '2rem', color: 'black'});
                    return {type: 'div', props: {className: cls, children: 'Styled'}};
                };

                const html = rootRender(ctx, {
                    type: 'ul',
                    props: {
                        children: [
                            {
                                type: Component,
                            },
                            {
                                type: 'li',
                                props: {
                                    children: [
                                        'A',
                                        {
                                            type: client.Script,
                                            props: {
                                                data: {a: 1, b: 2},
                                                children: (el, data) => (el.innerText = JSON.stringify(data)),
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'li',
                                props: {
                                    children: [
                                        'B',
                                        {
                                            type: client.Script,
                                            props: {
                                                data: {b: 2, a: 1},
                                                children: (el, data) => (el.innerText = JSON.stringify(data)),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                });

                /* Note: order in json stringification matters */
                expect(html).toBe(
                    [
                        '<ul><div class="tf15fd003">Styled</div><li data-tfhf="id-2" data-tfhd="id-3">A</li><li data-tfhf="id-2" data-tfhd="id-4">B</li></ul><script nonce="aWQtMQ==">(function(d,w){',
                        ATOMIC_GLOBAL,
                        'const TFD={"id-3":{"a":1,"b":2},"id-4":{"b":2,"a":1}};',
                        'const TFF={"id-2":(el, data) => el.innerText = JSON.stringify(data)};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        ATOMIC_VM_BEFORE,
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        ATOMIC_VM_AFTER,
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );
            });

            it('Flushes and resets between render calls', () => {
                const ctx = new MockContext();
                const html1 = rootRender(ctx, {
                    type: 'div',
                    props: {
                        children: [
                            'Reset me',
                            {
                                type: Script,
                                props: {
                                    children: el => (el.id = 'reset'),
                                },
                            },
                        ],
                    },
                });

                expect(html1).toBe(
                    [
                        '<div data-tfhf="id-2">Reset me</div><script nonce="aWQtMQ==">(function(d,w){const TFD={};',
                        'const TFF={"id-2":(el) => el.id = "reset"};',
                        'for(const id in TFF){',
                        'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                        'for(let n of N){',
                        'const dId=n.getAttribute("data-tfhd");',
                        'try{TFF[id](n,w.$tfdr(n,dId?TFD[dId]:{}))}catch{}',
                        '}',
                        '}',
                        '})(document,window);</script>',
                    ].join(''),
                );

                const html2 = rootRender(new MockContext(), {
                    type: 'div',
                    props: {children: 'Fresh'},
                });

                expect(html2).toBe('<div>Fresh</div>');
            });
        });
    });
});
