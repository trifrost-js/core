import {describe, it, expect} from 'vitest';
import {render} from '../../../../lib/modules/JSX/render';
import {Fragment} from '../../../../lib/modules/JSX/runtime';

describe('JSX Runtime Renderer', () => {
    it('renders basic primitives', () => {
        expect(render('hello')).toBe('hello');
        expect(render(123)).toBe('123');
        expect(render(false)).toBe('');
        expect(render(null)).toBe('');
    /* @ts-ignore */
        expect(render(undefined)).toBe('');
    });

    it('escapes dangerous HTML entities', () => {
        expect(render('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
        expect(render('&test')).toBe('&amp;test');
        expect(render('"quoted"')).toBe('&quot;quoted&quot;');
        expect(render('\'quote\''))?.toBe('&#39;quote&#39;');
    });

    it('renders single standard HTML element', () => {
        expect(render({type: 'div', props: {children: 'content'}})).toBe('<div>content</div>');
    });

    it('renders nested elements', () => {
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

    it('renders void/self-closing tags properly', () => {
        expect(render({type: 'br', props: {}})).toBe('<br />');
        expect(render({type: 'img', props: {src: 'x.png', alt: 'test'}})).toBe('<img src="x.png" alt="test" />');
    });

    it('renders style props with kebab-cased CSS', () => {
        expect(render({
            type: 'div',
            props: {style: {backgroundColor: 'red', fontSize: '12px'}, children: ''},
        })).toBe('<div style="background-color:red;font-size:12px;"></div>');
    });

    it('renders style props with numeric and camelCase values', () => {
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
        })).toBe('<span style="line-height:1.5;padding-top:10px;border-bottom-color:blue;">Styled</span>');
    });

    it('ignores null/undefined style values', () => {
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
        })).toBe('<div style="margin:0;"></div>');
    });

    it('renders boolean props properly', () => {
        expect(render({type: 'input', props: {checked: true}})).toBe('<input checked />');
        expect(render({type: 'input', props: {disabled: true, required: true}})).toBe('<input disabled required />');
    });

    it('renders falsy-but-valid props', () => {
        expect(render({type: 'div', props: {'data-zero': 0}})).toBe('<div data-zero="0"></div>');
        expect(render({type: 'div', props: {'data-false': false}})).toBe('<div data-false="false"></div>');
        expect(render({type: 'div', props: {'data-empty': ''}})).toBe('<div data-empty=""></div>');
    });

    it('ignores invalid or function-only props like children or null', () => {
        expect(render({type: 'div', props: {children: null, onclick: null}})).toBe('<div></div>');
    });

    it('renders Fragment with multiple children', () => {
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

    it('renders mapped JSX output (e.g. list)', () => {
        const children = ['A', 'B', 'C'].map(txt => ({type: 'li', props: {children: txt}}));
        expect(render({type: 'ul', props: {children}})).toBe('<ul><li>A</li><li>B</li><li>C</li></ul>');
    });

    it('renders function components with props', () => {
        const Comp = ({text}: { text: string }) => ({type: 'p', props: {children: text}});
        /* @ts-ignore */
        expect(render({type: Comp, props: {text: 'hello'}})).toBe('<p>hello</p>');
    });

    it('renders dangerouslySetInnerHTML properly', () => {
        expect(render({
            type: 'div',
            props: {
                dangerouslySetInnerHTML: {
                    __html: '<b>bold</b>',
                },
            },
        })).toBe('<div><b>bold</b></div>');
    });

    it('renders nested Fragments inside elements', () => {
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

    it('ignores unknown types or non-object nodes gracefully', () => {
        expect(render(Symbol('test') as any)).toBe('');
        expect(render({} as any)).toBe('');
        expect(render({type: undefined, props: {}} as any)).toBe('');
    });
});
