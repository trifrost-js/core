import {describe, it, expect} from 'vitest';
import {render, escape} from '../../../../lib/modules/JSX/render';
import {Fragment} from '../../../../lib/modules/JSX/runtime';

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
});