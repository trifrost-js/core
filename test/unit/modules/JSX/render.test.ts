import {describe, it, expect, beforeEach} from 'vitest';
import {render, escape, rootRender} from '../../../../lib/modules/JSX/render';
import {Fragment} from '../../../../lib/modules/JSX/runtime';
import {createCss} from '../../../../lib/modules/JSX/style/use';
import {nonce} from '../../../../lib/modules/JSX/nonce/use';
import {Style} from '../../../../lib/modules/JSX/style/Style';
import {MockContext} from '../../../MockContext';

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
            expect(escape('\'quote\'')).toBe('&#39;quote&#39;');
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
            /* @ts-ignore */
            expect(render(undefined)).toBe('');
        });

        it('Escapes dangerous HTML entities', () => {
            expect(render('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
            expect(render('&test')).toBe('&amp;test');
            expect(render('"quoted"')).toBe('&quot;quoted&quot;');
            expect(render('\'quote\''))?.toBe('&#39;quote&#39;');
        });

        it('Renders single standard HTML element', () => {
            expect(render({type: 'div', props: {children: 'content'}})).toBe('<div>content</div>');
        });

        it('Renders nested elements', () => {
            expect(render({
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
            })).toBe('<section><div><p>Deep</p></div></section>');
        });

        it('Renders void/self-closing tags properly', () => {
            expect(render({type: 'br', props: {}})).toBe('<br />');
            expect(render({type: 'img', props: {src: 'x.png', alt: 'test'}})).toBe('<img src="x.png" alt="test" />');
        });

        it('Renders style props with kebab-cased CSS', () => {
            expect(render({
                type: 'div',
                props: {style: {backgroundColor: 'red', fontSize: '12px'}, children: ''},
            })).toBe('<div style="background-color:red;font-size:12px"></div>');
        });

        it('Renders style props with numeric and camelCase values', () => {
            expect(render({
                type: 'span',
                props: {
                    style: {
                        lineHeight: 1.5,
                        paddingTop: '10px',
                        borderBottomColor: 'blue',
                    },
                    children: 'Styled',
                },
            })).toBe('<span style="line-height:1.5;padding-top:10px;border-bottom-color:blue">Styled</span>');
        });

        it('Renders an array of JSX elements', () => {
            /* @ts-ignore this is what we're testing */
            const out = render([
                {type: 'span', props: {children: 'one'}},
                {type: 'span', props: {children: 'two'}},
            ]);

            expect(out).toBe('<span>one</span><span>two</span>');
        });

        it('should handle element with no props', () => {
            /* @ts-ignore this is what we're testing */
            const out = render({type: 'div'});
            expect(out).toBe('<div></div>');
        });

        it('Ignores null/undefined style values', () => {
            expect(render({
                type: 'div',
                props: {
                    style: {
                        color: null,
                        display: undefined,
                        margin: '0',
                    },
                    children: '',
                },
            })).toBe('<div style="margin:0"></div>');
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
            expect(render({
                /* @ts-ignore */
                type: Fragment,
                props: {
                    children: [
                        {type: 'span', props: {children: 'One'}},
                        {type: 'span', props: {children: 'Two'}},
                    ],
                },
            })).toBe('<span>One</span><span>Two</span>');
        });

        it('Renders mapped JSX output (e.g. list)', () => {
            const children = ['A', 'B', 'C'].map(txt => ({type: 'li', props: {children: txt}}));
            expect(render({type: 'ul', props: {children}})).toBe('<ul><li>A</li><li>B</li><li>C</li></ul>');
        });

        it('Renders function components with props', () => {
            const Comp = ({text}: { text: string }) => ({type: 'p', props: {children: text}});
            /* @ts-ignore */
            expect(render({type: Comp, props: {text: 'hello'}})).toBe('<p>hello</p>');
        });

        it('Renders dangerouslySetInnerHTML properly', () => {
            expect(render({
                type: 'div',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: '<b>bold</b>',
                    },
                },
            })).toBe('<div><b>bold</b></div>');
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
        let css:ReturnType<typeof createCss>;

        beforeEach(() => {
            css = createCss();
        });

        it('Injects styles correctly from inside the render tree', () => {
            const Component = () => {
                const cls = css({padding: '1rem', backgroundColor: 'blue'});
                return {type: 'div', props: {className: cls, children: 'Hello'}};
            };

            const ctx = new MockContext();

            /* @ts-ignore */
            const html = rootRender(ctx, ['__TRIFROST_STYLE_MARKER__', {type: Component, props: {}}]);
            expect(html).toBe([
                `<style nonce="${ctx.nonce}">.tf-46gioo{padding:1rem;background-color:blue}</style>`,
                '<div class="tf-46gioo">Hello</div>',
            ].join(''));
        });

        it('Renders with expected class name and style from inside component', () => {
            let cls = '';

            const Component = () => {
                cls = css({margin: '2rem', color: 'black'});
                return {type: 'div', props: {className: cls, children: 'Styled'}};
            };

            const ctx = new MockContext();

            /* @ts-ignore */
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
                    children: [
                        {type: Header, props: {}},
                        '__TRIFROST_STYLE_MARKER__',
                        {type: Body, props: {}},
                    ],
                },
            });

            const ctx = new MockContext();
            /* @ts-ignore */
            const html = rootRender(ctx, {type: Page, props: {}});
            expect(html).toBe([
                '<header class="tf-iypj3">Title</header>',
                `<style nonce="${ctx.nonce}">`,
                '.tf-iypj3{font-size:1.5rem;font-weight:bold}',
                '.tf-rnr4jx{line-height:1.5;padding:2rem}',
                '</style>',
                '<main class="tf-rnr4jx">Content</main>',
            ].join(''));
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
            expect(output).toBe([
                '<html>',
                '<head>',
                '<title>TriFrost Demo</title>',
                `<style nonce="${ctx.nonce}">`,
                '.tf-gz38p9:hover{background-color:darkblue}',
                '.tf-gz38p9{padding:0.75rem 1.25rem;border:none;background-color:blue;color:white;font-weight:bold;border-radius:0.25rem}',
                '</style>',
                '</head>',
                '<body>',
                '<h1>Welcome to TriFrost</h1>',
                '<button class="tf-gz38p9">Click Me</button>',
                '</body>',
                '</html>',
            ].join(''));
        });

        it('Resets the StyleEngine after rendering', () => {
            let cls = '';
            const Component = () => {
                cls = css({margin: '2rem', color: 'black'});
                return {type: 'div', props: {className: cls, children: 'Styled'}};
            };

            const ctx = new MockContext();

            /* @ts-ignore */
            const html = rootRender(ctx, ['__TRIFROST_STYLE_MARKER__', {type: Component, props: {}}]);
            expect(html).toBe(`<style nonce="${ctx.nonce}">.${cls}{margin:2rem;color:black}</style><div class="${cls}">Styled</div>`);

            const ctx2 = new MockContext();

            let cls2 = '';
            const Component2 = () => {
                cls2 = css({color: 'white', fontFamily: 'sans-serif'});
                return {type: 'p', props: {className: cls2, children: 'Styled'}};
            };
            /* @ts-ignore */
            const html2 = rootRender(ctx2, ['__TRIFROST_STYLE_MARKER__', {type: Component2, props: {}}]);
            expect(html2).toBe([
                `<style nonce="${ctx2.nonce}">.${cls2}{color:white;font-family:sans-serif}</style>`,
                `<p class="${cls2}">Styled</p>`,
            ].join(''));
        });

        it('Exposes nonce via active context during render', () => {
            const Component = () => ({type: 'script', props: {nonce: nonce(), children: 'Nonce-bound'}});

            // @ts-ignore
            const html = rootRender(new MockContext({nonce: 'abc-123'}), {type: Component, props: {}});
            expect(html).toBe('<script nonce="abc-123">Nonce-bound</script>');
        });

        it('Throws if nonce is accessed outside render lifecycle', () => {
            expect(() => nonce()).toThrowError('No active nonce is set');
        });

        it('Resets nonce after render completes', () => {
            const Component = () => ({type: 'div', props: {children: nonce()}});

            // @ts-ignore
            const html = rootRender(new MockContext({nonce: 'abc123'}), {type: Component, props: {}});
            expect(html).toContain('abc123');

            // after render, calling nonce again should throw
            expect(() => nonce()).toThrowError('No active nonce is set');
        });

        it('Replaces TRIFROST_ENV markers inside inline script', () => {
            const Component = () => ({
                type: 'script',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: 'console.log("env:", "__TRIFROST_ENV__.APP_NAME");',
                    },
                },
            });

            const ctx = new MockContext({
                env: {APP_NAME: 'TriFrost'},
            });

            const html = rootRender(ctx, {type: Component, props: {}});
            expect(html).toBe('<script>console.log("env:", "TriFrost");</script>');
        });

        it('Replaces TRIFROST_STATE markers inside inline script', () => {
            const Component = () => ({
                type: 'script',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: 'console.log("locale:", "__TRIFROST_STATE__.locale");',
                    },
                },
            });

            const ctx = new MockContext({
                state: {locale: 'en'},
            });

            const html = rootRender(ctx, {type: Component, props: {}});
            expect(html).toBe('<script>console.log("locale:", "en");</script>');
        });

        it('Handles both ENV and STATE replacements in one go', () => {
            const Component = () => ({
                type: 'script',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: 'console.log("env:", "__TRIFROST_ENV__.APP_NAME");console.log("locale:", "__TRIFROST_STATE__.locale");',
                    },
                },
            });

            const ctx = new MockContext({
                env: {APP_NAME: 'TriFrost'},
                state: {locale: 'en-US'},
            });

            const html = rootRender(ctx, {type: Component, props: {}});
            expect(html).toBe('<script>console.log("env:", "TriFrost");console.log("locale:", "en-US");</script>');
        });

        it('Defaults missing env/state values to empty strings', () => {
            const Component = () => ({
                type: 'script',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: 'console.log("__TRIFROST_ENV__.MISSING", "__TRIFROST_STATE__.missing");',
                    },
                },
            });

            const ctx = new MockContext();

            const html = rootRender(ctx, {type: Component, props: {}});
            expect(html).toBe('<script>console.log("", "");</script>');
        });

        it('Replaces env/state values with correct JSON types', () => {
            const Component = () => ({
                type: 'script',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: 'console.log("__TRIFROST_ENV__.ENABLED","__TRIFROST_STATE__.count");',
                    },
                },
            });

            const ctx = new MockContext({
                env: {ENABLED: true},
                state: {count: 42},
            });

            const html = rootRender(ctx, {type: Component, props: {}});
            expect(html).toBe('<script>console.log(true,42);</script>');
        });

        it('Replaces env/state values with correct JSON types even if they are rich', () => {
            const Component = () => ({
                type: 'script',
                props: {
                    dangerouslySetInnerHTML: {
                        __html: `
                            console.log("__TRIFROST_ENV__.ENABLED", "__TRIFROST_STATE__.list");
                            const globalSettings = "__TRIFROST_STATE__.settings";
                        `.trim(),
                    },
                },
            });

            const ctx = new MockContext({
                env: {ENABLED: true},
                state: {list: [{name: 'Peter'}, {name: 'Bob'}], settings: {something: true, somethingElse: false}},
            });

            const html = rootRender(ctx, {type: Component, props: {}});
            expect(html).toBe(`<script>console.log(true, [{"name":"Peter"},{"name":"Bob"}]);
                            const globalSettings = {"something":true,"somethingElse":false};</script>`);
        });
    });
});
