/* eslint-disable no-console */

import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {render, escape, rootRender, toLruCookie, fromLruCookie} from '../../../../lib/modules/JSX/render';
import {Fragment} from '../../../../lib/modules/JSX/runtime';
import {createCss} from '../../../../lib/modules/JSX/style/use';
import {nonce} from '../../../../lib/modules/JSX/ctx/nonce';
import {env} from '../../../../lib/modules/JSX/ctx/env';
import {state} from '../../../../lib/modules/JSX/ctx/state';
import {Style} from '../../../../lib/modules/JSX/style/Style';
import {Script} from '../../../../lib/modules/JSX/script/Script';
import * as Generic from '../../../../lib/utils/Generic';
import {MockContext} from '../../../MockContext';
import {createModule, createScript} from '../../../../lib/modules/JSX/script/use';
import {ARC_GLOBAL, ARC_GLOBAL_OBSERVER, ATOMIC_GLOBAL} from '../../../../lib/modules/JSX/script/atomic';
import {OBSERVER} from '../../../../lib/modules/JSX/style/Engine';

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
    });

    describe('fromLruCookie', () => {
        it('Returns empty set for null', () => {
            const out = fromLruCookie(null);
            expect(out instanceof Set).toBe(true);
            expect(out.size).toBe(0);
        });

        it('Splits a cookie string into set', () => {
            const out = fromLruCookie('a|b|c');
            expect([...out]).toEqual(['a', 'b', 'c']);
        });

        it('Ignores empty segments', () => {
            const out = fromLruCookie('a||c|');
            expect([...out]).toEqual(['a', 'c']);
        });

        it('Returns empty set for empty string', () => {
            const out = fromLruCookie('');
            expect(out.size).toBe(0);
        });

        it('Preserves order of insertion', () => {
            const out = fromLruCookie('x|y|z');
            expect([...out]).toEqual(['x', 'y', 'z']);
        });
    });

    describe('toLruCookie', () => {
        it('Returns null for empty set', () => {
            expect(toLruCookie(new Set())).toBe(null);
        });

        it('Joins entries with pipe', () => {
            const out = toLruCookie(new Set(['a', 'b', 'c']));
            expect(out).toBe('a|b|c');
        });

        it('Limits to last 64 entries', () => {
            const big = new Set<string>();
            for (let i = 0; i < 100; i++) big.add(`fn-${i}`);

            const out = toLruCookie(big)!;
            const parts = out.split('|');
            expect(parts.length).toBe(64);
            expect(parts[0]).toBe('fn-36');
            expect(parts[63]).toBe('fn-99');
        });

        it('Preserves LRU ordering', () => {
            const values = Array.from({length: 70}, (_, i) => `id${i}`);
            const lru = new Set<string>(values);
            const result = toLruCookie(lru)!;
            expect(result.startsWith('id6')).toBe(true); // first 6 trimmed
            expect(result.endsWith('id69')).toBe(true);
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
                    `<style data-tfs-s="tf252713112" nonce="${ctx.nonce}">.tf252713112{padding:1rem;background-color:blue}</style>`,
                    '<div class="tf252713112">Hello</div>',
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
            expect(html).toBe(
                `<style data-tfs-s="${cls}" nonce="${ctx.nonce}">.${cls}{margin:2rem;color:black}</style><div class="${cls}">Styled</div>`,
            );
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
                    '<header class="tf31852479">Title</header>',
                    `<style data-tfs-s="tf31852479" nonce="${ctx.nonce}">`,
                    '.tf31852479{font-size:1.5rem;font-weight:bold}',
                    '</style>',
                    `<style data-tfs-s="tf1672483533" nonce="${ctx.nonce}">`,
                    '.tf1672483533{line-height:1.5;padding:2rem}',
                    '</style>',
                    '<main class="tf1672483533">Content</main>',
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

        it('Injects styles and arc into head and renders a complete page', () => {
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
                    `<style nonce="${ctx.nonce}" data-tfs-p>`,
                    '.tf1026396621:hover{background-color:darkblue}',
                    '.tf1026396621{padding:0.75rem 1.25rem;border:none;background-color:blue;color:white;font-weight:bold;border-radius:0.25rem}',
                    '</style>',
                    `<script nonce="${ctx.nonce}">${OBSERVER}</script>`,
                    '</head>',
                    '<body>',
                    '<h1>Welcome to TriFrost</h1>',
                    '<button class="tf1026396621">Click Me</button>',
                    `<script nonce="${ctx.nonce}">${ARC_GLOBAL(false)}${ARC_GLOBAL_OBSERVER}</script>`,
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
            expect(html).toBe(
                `<style data-tfs-s="${cls}" nonce="${ctx.nonce}">.${cls}{margin:2rem;color:black}</style><div class="${cls}">Styled</div>`,
            );

            const ctx2 = new MockContext();

            let cls2 = '';
            const Component2 = () => {
                cls2 = css({color: 'white', fontFamily: 'sans-serif'});
                return {type: 'p', props: {className: cls2, children: 'Styled'}};
            };
            const html2 = rootRender(ctx2, ['__TRIFROST_STYLE_MARKER__', {type: Component2, props: {}}]);
            expect(html2).toBe(
                [
                    `<style data-tfs-s="${cls2}" nonce="${ctx2.nonce}">.${cls2}{color:white;font-family:sans-serif}</style>`,
                    `<p class="${cls2}">Styled</p>`,
                ].join(''),
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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                    '<div class="tf2811031491">Styled</div>',
                    '<li data-tfhf="4230306633" data-tfhd="59584111">A</li>',
                    '<li data-tfhf="4230306633" data-tfhd="3439148911">B</li>',
                    '<style data-tfs-s="4128691731" nonce="aWQtMQ==">*, *::before, *::after{box-sizing:border-box}</style>',
                    '<style data-tfs-s="3747817570" nonce="aWQtMQ==">',
                    'html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}',
                    '</style>',
                    '<style data-tfs-s="3189776428" nonce="aWQtMQ==">footer, header, nav, section, main{display:block}</style>',
                    '<style data-tfs-s="2757165069" nonce="aWQtMQ==">ol, ul{list-style:none}</style>',
                    '<style data-tfs-s="3413425820" nonce="aWQtMQ==">q, blockquote::before{content:none}q, blockquote::after{content:none}</style>',
                    '<style data-tfs-s="39629276" nonce="aWQtMQ==">q, blockquote{quotes:none}</style>',
                    '<style data-tfs-s="3492313455" nonce="aWQtMQ==">table{border-collapse:collapse;border-spacing:0}</style>',
                    '<style data-tfs-s="tf2811031491" nonce="aWQtMQ==">.tf2811031491{margin:2rem;color:black}</style>',
                    '</ul>',
                    '<script nonce="aWQtMQ==">(function(w){',
                    'const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["4230306633",({el,data})=>el.innerText=JSON.stringify(data)]],',
                    '[["59584111",{"a":1,"b":2}],["3439148911",{"b":2,"a":1}]],',
                    'self?.parentNode);setTimeout(()=>self?.remove?.(),0);})(window);</script>',
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
                                                                        children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                                                                        children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                    '<div class="tf2811031491">Styled</div>',
                    '<li data-tfhf="4230306633" data-tfhd="59584111">A</li>',
                    '<li data-tfhf="4230306633" data-tfhd="3439148911">B</li>',
                    '<style nonce="aWQtMQ==" data-tfs-p>',
                    '*, *::before, *::after{box-sizing:border-box}html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}footer, header, nav, section, main{display:block}ol, ul{list-style:none}q, blockquote::before{content:none}q, blockquote::after{content:none}q, blockquote{quotes:none}table{border-collapse:collapse;border-spacing:0}',
                    '.tf2811031491{margin:2rem;color:black}',
                    '</style>',
                    `<script nonce="aWQtMQ==">${OBSERVER}</script>`,
                    '</ul>',
                    '<script nonce="aWQtMQ==">',
                    ARC_GLOBAL(false),
                    ATOMIC_GLOBAL,
                    '</script>',
                    '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                    'w.$tfarc.spark(',
                    '[["4230306633",({el,data})=>el.innerText=JSON.stringify(data)]],',
                    '[["59584111",{"a":1,"b":2}],["3439148911",{"b":2,"a":1}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '})(window);</script>',
                    '</body></html>',
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
                                                                        children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                                                                        children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                    '<div class="tf2811031491">Styled</div>',
                    '<li data-tfhf="4230306633" data-tfhd="59584111">A</li>',
                    '<li data-tfhf="4230306633" data-tfhd="3439148911">B</li>',
                    '<link rel="stylesheet" nonce="aWQtMQ==" href="/static.css">',
                    '<style nonce="aWQtMQ==" data-tfs-p>.tf2811031491{margin:2rem;color:black}</style>',
                    `<script nonce="aWQtMQ==">${OBSERVER}</script>`,
                    '</ul>',
                    '<script nonce="aWQtMQ==" src="/static.js" defer></script>',
                    '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                    'const run=()=>{',
                    'w.$tfarc.spark(',
                    '[["4230306633",({el,data})=>el.innerText=JSON.stringify(data)]],',
                    '[["59584111",{"a":1,"b":2}],["3439148911",{"b":2,"a":1}]],',
                    'self?.parentNode',
                    ');',
                    'setTimeout(()=>self?.remove?.(),0);',
                    '};',
                    'if(!w.$tfarc){const wait=()=>{w.$tfarc?run():setTimeout(wait,1)};wait();}else{run()}',
                    '})(window);</script>',
                    '</body></html>',
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
                                        children: ({el, data}) => console.log('Hydrated:', el, data),
                                    },
                                },
                            ],
                        },
                    }),
                    props: {},
                });

                expect(html).toBe(
                    [
                        '<button data-tfhf="2668606616" data-tfhd="717564430">Click me</button>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["2668606616",({el,data})=>console.log("Hydrated:",el,data)]],',
                        '[["717564430",{"foo":"bar"}]],',
                        'self?.parentNode',
                        ');setTimeout(()=>self?.remove?.(),0);})(window);</script>',
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
                                            children: ({el}) => (el.dataset.bound = 'true'),
                                        },
                                    },
                                ],
                            },
                        })),
                    },
                });

                expect(html).toBe(
                    [
                        '<span data-tfhf="1096069546" data-tfhd="1846880176">Item</span>',
                        '<span data-tfhf="1096069546" data-tfhd="1846880176">Item</span>',
                        '<span data-tfhf="1096069546" data-tfhd="1846880176">Item</span>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark([["1096069546",({el})=>el.dataset.bound="true"]],[["1846880176",{"x":1}]],self?.parentNode);',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
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
                                    children: ({el}) => (el.id = 'injected'),
                                },
                            },
                        ],
                    },
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="1751593121">No Data</div>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["1751593121",({el})=>el.id="injected"]],',
                        '[],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
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
                                    children: ({el, data}) => el.setAttribute('data-enabled', data.enabled),
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
                        '<div data-tfhf="3108072451" data-tfhd="135494026">Nested</div>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["3108072451",({el,data})=>el.setAttribute("data-enabled",data.enabled)]],',
                        '[["135494026",{"enabled":true}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);})(window);</script>',
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
                                                children: ({el, data}) => (el.textContent = `count:${data.count}`),
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
                                                children: ({el, data}) => (el.textContent = `count is ${data.count}`),
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
                        '<div data-tfhf="1589452636" data-tfhd="2437096587">First</div>',
                        '<div data-tfhf="2797398140" data-tfhd="2437096616">Second</div>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[',
                        '["1589452636",({el,data})=>el.textContent=`count:${data.count}`],',
                        '["2797398140",({el,data})=>el.textContent=`count is ${data.count}`]',
                        '],',
                        '[["2437096587",{"count":1}],["2437096616",{"count":2}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);})(window);</script>',
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
                                                children: ({el, data}) => (el.textContent = `count:${data.count}`),
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
                                                children: ({el, data}) => (el.textContent = `count is ${data.count}`),
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
                        '<div data-tfhf="1589452636" data-tfhd="2437096587">First</div>',
                        '<div data-tfhf="2797398140" data-tfhd="2437096587">Second</div>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[',
                        '["1589452636",({el,data})=>el.textContent=`count:${data.count}`],',
                        '["2797398140",({el,data})=>el.textContent=`count is ${data.count}`]',
                        '],',
                        '[["2437096587",{"count":1}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);})(window);</script>',
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
                                                children: ({el, data}) => (el.textContent = `count is ${data.count}`),
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
                                                children: ({el, data}) => (el.textContent = `count is ${data.count}`),
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
                        '<div data-tfhf="2797398140" data-tfhd="2437096587">First</div>',
                        '<div data-tfhf="2797398140" data-tfhd="2437096587">Second</div>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["2797398140",({el,data})=>el.textContent=`count is ${data.count}`]],',
                        '[["2437096587",{"count":1}]],',
                        'self?.parentNode',
                        ');setTimeout(()=>self?.remove?.(),0);})(window);</script>',
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
                                                            children: ({el, data}) => (el.dataset.active = String(data.active)),
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
                        '<section><article>',
                        '<header data-tfhf="1518847672" data-tfhd="2343547331">Header</header>',
                        '<footer data-tfhf="4007713580">Footer</footer>',
                        '</article></section>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[',
                        '["1518847672",({el,data})=>el.dataset.active=String(data.active)],',
                        '["4007713580",(el)=>el.dataset.foot="true"]',
                        '],',
                        '[["2343547331",{"active":true}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
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
                                            children: ({el, data}) => el.setAttribute('data-value', data.x),
                                        },
                                    },
                                ],
                            },
                        },
                    },
                });

                expect(html).toBe(
                    [
                        '<div data-tfhf="2309044144" data-tfhd="1846880052">Hello</div>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["2309044144",({el,data})=>el.setAttribute("data-value",data.x)]],',
                        '[["1846880052",{"x":5}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                        '<ul>',
                        '<li data-tfhf="4230306633" data-tfhd="59584111">A</li>',
                        '<li data-tfhf="4230306633" data-tfhd="3439148911">B</li>',
                        '</ul>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["4230306633",({el,data})=>el.innerText=JSON.stringify(data)]],',
                        '[["59584111",{"a":1,"b":2}],["3439148911",{"b":2,"a":1}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
                    ].join(''),
                );
            });

            it('Normalizes and deduplicates equal JSON payloads as well as embeds styles', () => {
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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                        '<ul>',
                        '<div class="tf2811031491">Styled</div>',
                        '<li data-tfhf="4230306633" data-tfhd="59584111">A</li>',
                        '<li data-tfhf="4230306633" data-tfhd="3439148911">B</li>',
                        '</ul>',
                        '<style data-tfs-s="tf2811031491" nonce="aWQtMQ==">.tf2811031491{margin:2rem;color:black}</style>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["4230306633",({el,data})=>el.innerText=JSON.stringify(data)]],',
                        '[["59584111",{"a":1,"b":2}],["3439148911",{"b":2,"a":1}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
                    ].join(''),
                );
            });

            it('Normalizes and deduplicates equal JSON payloads but does not embed css if css injection is disabled', () => {
                const ctx = new MockContext();

                const client = createScript({atomic: true});

                const Component = () => {
                    css.disableInjection();

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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                                                children: ({el, data}) => (el.innerText = JSON.stringify(data)),
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
                        '<ul>',
                        '<div class="tf2811031491">Styled</div>',
                        '<li data-tfhf="4230306633" data-tfhd="59584111">A</li>',
                        '<li data-tfhf="4230306633" data-tfhd="3439148911">B</li>',
                        '</ul>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["4230306633",({el,data})=>el.innerText=JSON.stringify(data)]],',
                        '[["59584111",{"a":1,"b":2}],["3439148911",{"b":2,"a":1}]],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
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
                        '<div data-tfhf="3275206252">Reset me</div>',
                        '<script nonce="aWQtMQ==">(function(w){const self=document.currentScript;',
                        'w.$tfarc.spark([["3275206252",(el)=>el.id="reset"]],[],self?.parentNode);',
                        'setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
                    ].join(''),
                );

                const html2 = rootRender(new MockContext(), {
                    type: 'div',
                    props: {children: 'Fresh'},
                });

                expect(html2).toBe('<div>Fresh</div>');
            });

            it('Avoids duplicating function IDs seen from cookie', () => {
                const ctx = new MockContext({
                    headers: {
                        cookie: 'tfscriptlru=511480048; Secure',
                    },
                });

                const scriptCalls: string[] = [];
                const fn = ({el}: any) => {
                    scriptCalls.push(el.id);
                };

                const client = createScript({atomic: true});
                const html = rootRender(
                    ctx,
                    {
                        type: 'div',
                        props: {
                            id: 'foo',
                            children: {
                                type: client.Script,
                                props: {
                                    data: {foo: 'bar'},
                                    children: fn,
                                },
                            },
                        },
                    },
                    {script: client.script},
                );

                expect(html).toBe(
                    [
                        '<div id="foo" data-tfhf="511480048" data-tfhd="717564430"></div>',
                        '<script nonce="aWQtMQ==">(function(w){',
                        'const self=document.currentScript;',
                        'w.$tfarc.spark([["511480048"]],[["717564430",{"foo":"bar"}]],self?.parentNode);setTimeout(()=>self?.remove?.(),0);',
                        '})(window);</script>',
                    ].join(''),
                );

                expect(ctx.cookies.outgoing).toEqual([]);
            });

            it('Slices cookie values to keep LRU only', () => {
                const ctx = new MockContext({
                    headers: {
                        cookie: 'tfscriptlru=' + Array.from({length: 100}, (_, i) => `id${i}`).join('|') + '; Secure',
                    },
                });

                const html = rootRender(ctx, {
                    type: 'main',
                    props: {
                        children: {
                            type: Script,
                            props: {
                                children: el => (el.dataset.ready = 'true'),
                            },
                        },
                    },
                });

                expect(html).toBe(
                    [
                        '<main data-tfhf="3213147477"></main>',
                        '<script nonce="aWQtMQ==">(function(w){',
                        'const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["3213147477",(el)=>el.dataset.ready="true"]],',
                        '[],',
                        'self?.parentNode',
                        ');',
                        'setTimeout(()=>self?.remove?.(),0);})(window);</script>',
                    ].join(''),
                );

                expect(ctx.cookies.outgoing).toEqual([
                    'tfscriptlru=id37%7Cid38%7Cid39%7Cid40%7Cid41%7Cid42%7Cid43%7Cid44%7Cid45%7Cid46%7Cid47%7Cid48%7Cid49%7Cid50%7Cid51%7Cid52%7Cid53%7Cid54%7Cid55%7Cid56%7Cid57%7Cid58%7Cid59%7Cid60%7Cid61%7Cid62%7Cid63%7Cid64%7Cid65%7Cid66%7Cid67%7Cid68%7Cid69%7Cid70%7Cid71%7Cid72%7Cid73%7Cid74%7Cid75%7Cid76%7Cid77%7Cid78%7Cid79%7Cid80%7Cid81%7Cid82%7Cid83%7Cid84%7Cid85%7Cid86%7Cid87%7Cid88%7Cid89%7Cid90%7Cid91%7Cid92%7Cid93%7Cid94%7Cid95%7Cid96%7Cid97%7Cid98%7Cid99%7C3213147477; Secure; HttpOnly',
                ]);
            });

            it('Resets state between renders', () => {
                const ctx1 = new MockContext();
                const html1 = rootRender(ctx1, {
                    type: 'div',
                    props: {
                        children: [
                            'Reset Test',
                            {
                                type: Script,
                                props: {
                                    children: el => (el.dataset.run = 'true'),
                                },
                            },
                        ],
                    },
                });

                expect(html1).toContain('data-tfhf=');
                expect(html1).toContain('Reset Test');
                expect(ctx1.cookies.outgoing.length).toBeGreaterThan(0);

                // fresh context with no cookies and no Script, should be clean render
                const ctx2 = new MockContext();
                const html2 = rootRender(ctx2, {
                    type: 'div',
                    props: {children: 'After Reset'},
                });

                expect(html2).toBe('<div>After Reset</div>');
                expect(ctx2.cookies.outgoing).toEqual([]);
            });

            it('Injects both script and module correctly in one render', () => {
                const {Module} = createModule({});
                const client = createScript({
                    atomic: true,
                    modules: {
                        logger: () => {
                            return Module({
                                name: 'logger',
                                mod: () => {
                                    return {
                                        log: (msg: string) => console.log(msg),
                                    };
                                },
                            });
                        },
                    },
                });
                const ctx = new MockContext();

                expect(
                    rootRender(
                        ctx,
                        {
                            type: 'main',
                            props: {
                                children: [
                                    {
                                        type: client.Script,
                                        props: {
                                            children: ({el, $}) => {
                                                el.textContent = 'Hi';
                                                $.logger.log('Hello World');
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        {script: client.script},
                    ),
                ).toBe(
                    [
                        '<main data-tfhf="1777464924"></main>',
                        '<script nonce="aWQtMQ==">(function(w){',
                        'const self=document.currentScript;',
                        'w.$tfarc.sparkModule([["1422161809",()=>{return {log:(msg)=>console.log(msg)};},"logger"]]);',
                        'w.$tfarc.spark(',
                        '[["1777464924",({el,$})=>{el.textContent="Hi";$.logger.log("Hello World");}]],',
                        '[],',
                        'self?.parentNode);',
                        'setTimeout(()=>self?.remove?.(),0);})(window);</script>',
                    ].join(''),
                );

                expect(ctx.cookies.outgoing).toEqual([
                    'tfscriptlru=1777464924; Secure; HttpOnly',
                    'tfmoduleslru=1422161809; Secure; HttpOnly',
                ]);
            });

            it('Injects only script if module is not used', () => {
                const {Module} = createModule({});
                const client = createScript({
                    atomic: true,
                    modules: {
                        logger: () => {
                            return Module({
                                name: 'logger',
                                mod: () => {
                                    return {
                                        log: (msg: string) => console.log(msg),
                                    };
                                },
                            });
                        },
                    },
                });
                const ctx = new MockContext();

                expect(
                    rootRender(
                        ctx,
                        {
                            type: 'main',
                            props: {
                                children: [
                                    {
                                        type: client.Script,
                                        props: {
                                            children: ({el}) => {
                                                el.textContent = 'Hi';
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        {script: client.script},
                    ),
                ).toBe(
                    [
                        '<main data-tfhf="1784474010"></main>',
                        '<script nonce="aWQtMQ==">(function(w){',
                        'const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["1784474010",({el})=>{el.textContent="Hi";}]],',
                        '[],',
                        'self?.parentNode);',
                        'setTimeout(()=>self?.remove?.(),0);})(window);</script>',
                    ].join(''),
                );

                expect(ctx.cookies.outgoing).toEqual(['tfscriptlru=1784474010; Secure; HttpOnly']);
            });

            it('Injects only script if module is already on client', () => {
                const {Module} = createModule({});
                const client = createScript({
                    atomic: true,
                    modules: {
                        logger: () => {
                            return Module({
                                name: 'logger',
                                mod: () => {
                                    return {
                                        log: (msg: string) => console.log(msg),
                                    };
                                },
                            });
                        },
                    },
                });
                const ctx = new MockContext({
                    headers: {
                        cookie: `tfmoduleslru=1422161809`,
                    },
                });

                expect(
                    rootRender(
                        ctx,
                        {
                            type: 'main',
                            props: {
                                children: [
                                    {
                                        type: client.Script,
                                        props: {
                                            children: ({el, $}) => {
                                                el.textContent = 'Hi';
                                                $.logger.log('Hello World');
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        {script: client.script},
                    ),
                ).toBe(
                    [
                        '<main data-tfhf="1777464924"></main>',
                        '<script nonce="aWQtMQ==">(function(w){',
                        'const self=document.currentScript;',
                        'w.$tfarc.spark(',
                        '[["1777464924",({el,$})=>{el.textContent="Hi";$.logger.log("Hello World");}]],',
                        '[],',
                        'self?.parentNode);',
                        'setTimeout(()=>self?.remove?.(),0);})(window);</script>',
                    ].join(''),
                );

                expect(ctx.cookies.outgoing).toEqual(['tfscriptlru=1777464924; Secure; HttpOnly']);
            });
        });
    });
});
