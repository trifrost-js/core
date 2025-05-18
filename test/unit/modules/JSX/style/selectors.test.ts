import {describe, it, expect, beforeEach} from 'vitest';
import {css, setActiveStyleEngine} from '../../../../../lib/modules/JSX/style/use';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';
import {
    NTH_CHILD,
    NTH_LAST_CHILD,
    NTH_OF_TYPE,
    NTH_LAST_OF_TYPE,
    NOT,
    IS,
    WHERE,
    HAS,
    DIR,
    MEDIA,
    HOVER,
    FOCUS,
    BEFORE,
    AFTER,
} from '../../../../../lib/modules/JSX/style/selectors';

describe('Modules - JSX - style - selectors', () => {
    let engine: StyleEngine;

    beforeEach(() => {
        engine = new StyleEngine();
        setActiveStyleEngine(engine);
    });

    it('Supports :nth-child(n)', () => {
        const cls = css({[NTH_CHILD(2)]: {fontWeight: 'bold'}});
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:nth-child(2){font-weight:bold}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :nth-last-child(n)', () => {
        const cls = css({
            [NTH_LAST_CHILD(1)]: {
                color: 'blue',
            },
        });
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:nth-last-child(1){color:blue}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :nth-of-type(n)', () => {
        const cls = css({
            [NTH_OF_TYPE('3n+1')]: {
                fontStyle: 'italic',
            },
        });
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:nth-of-type(3n+1){font-style:italic}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :nth-last-of-type', () => {
        const cls = css({
            [NTH_LAST_OF_TYPE(2)]: {
                borderBottom: '1px solid gray',
            },
        });
    
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:nth-last-of-type(2){border-bottom:1px solid gray}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :not(selector)', () => {
        const cls = css({
            [NOT(':last-child')]: {
                marginBottom: '1rem',
            },
        });
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:not(:last-child){margin-bottom:1rem}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :is(selector)', () => {
        const cls = css({
            [IS('a, button')]: {
                cursor: 'pointer',
            },
        });
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:is(a, button){cursor:pointer}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :where(...)', () => {
        const cls = css({
            [WHERE('section, article')]: {
                lineHeight: 1.5,
            },
        });
    
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:where(section, article){line-height:1.5}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :has(selector)', () => {
        const cls = css({
            [HAS('img')]: {
                display: 'flex',
            },
        });
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:has(img){display:flex}</style><div class="${cls}">Test</div>`);
    });

    it('Supports :dir(ltr)', () => {
        const cls = css({
            [DIR('ltr')]: {
                paddingLeft: '1rem',
            },
        });
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe(`<style>.${cls}:dir(ltr){padding-left:1rem}</style><div class="${cls}">Test</div>`);
    });

    it('Works inside media queries', () => {
        const cls = css({
            fontSize: '1rem',
            [MEDIA.tabletOnly]: {
                [NTH_CHILD(2)]: {
                    fontSize: '0.75rem',
                },
                [NOT(':last-child')]: {
                    marginBottom: '0.5rem',
                },
            },
        });

        const html = engine.inject(`<div class="${cls}">Media</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}{font-size:1rem}`,
            '@media (min-width: 601px) and (max-width: 1199px){',
            `.${cls}:nth-child(2){font-size:0.75rem}`,
            `.${cls}:not(:last-child){margin-bottom:0.5rem}`,
            '}',
            '</style>',
            '<div class="tf-tipekr">Media</div>',
        ].join(''));
    });

    it('Works inside media queries with deeper nesting', () => {
        const cls = css({
            fontSize: '1rem',
            [MEDIA.mobile]: {
                [NTH_CHILD(3)]: {
                    [WHERE('span, strong')]: {
                        color: 'tomato',
                    },
                },
            },
        });
    
        const html = engine.inject(`<div class="${cls}">Nested</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}{font-size:1rem}`,
            '@media (max-width: 600px){',
            `.${cls}:nth-child(3):where(span, strong){color:tomato}`,
            '}',
            '</style>',
            `<div class="${cls}">Nested</div>`,
        ].join(''));
    });

    describe('combinations', () => {
        it(':not() and :nth-child()', () => {
            const cls = css({
                [NOT(NTH_CHILD(1))]: {opacity: 0.75},
            });
            const html = engine.inject(`<div class="${cls}">List</div>`);
            expect(html).toBe(`<style>.${cls}:not(:nth-child(1)){opacity:0.75}</style><div class="${cls}">List</div>`);
        });
        
        it('Uses :is() inside :not()', () => {
            const cls = css({
                [NOT(IS('a, button'))]: {color: 'gray'},
            });
            const html = engine.inject(`<div class="${cls}">Filtered</div>`);
            expect(html).toBe(`<style>.${cls}:not(:is(a, button)){color:gray}</style><div class="${cls}">Filtered</div>`);
        });
        
        it('Uses :where() with :nth-last-child()', () => {
            const cls = css({
                [WHERE(NTH_LAST_CHILD(2))]: {paddingBottom: '0.5rem'},
            });
            const html = engine.inject(`<div class="${cls}">Scoped</div>`);
            expect(html).toBe(`<style>.${cls}:where(:nth-last-child(2)){padding-bottom:0.5rem}</style><div class="${cls}">Scoped</div>`);
        });
        
        it('Uses :dir() with media query', () => {
            const cls = css({
                [MEDIA.tabletOnly]: {
                    [DIR('rtl')]: {textAlign: 'right'},
                },
            });
            const html = engine.inject(`<div class="${cls}">RTL</div>`);
            expect(html).toBe([
                '<style>',
                '@media (min-width: 601px) and (max-width: 1199px){',
                `.${cls}:dir(rtl){text-align:right}`,
                '}',
                '</style>',
                `<div class="${cls}">RTL</div>`,
            ].join(''));
        });
        
        it(':nth-child() with :dir()', () => {
            const cls = css({
                [NTH_CHILD(3)]: {
                    [DIR('ltr')]: {marginLeft: '1rem'},
                },
            });
            const html = engine.inject(`<div class="${cls}">Nested</div>`);
            expect(html).toBe(`<style>.${cls}:nth-child(3):dir(ltr){margin-left:1rem}</style><div class="${cls}">Nested</div>`);
        });
        
        it('Multiple combinators inside a media query', () => {
            const cls = css({
                [MEDIA.mobile]: {
                    [NOT(IS(':last-child'))]: {
                        [WHERE('span, b')]: {color: 'red'},
                    },
                },
            });
            const html = engine.inject(`<div class="${cls}">Combo</div>`);
            expect(html).toBe([
                '<style>',
                '@media (max-width: 600px){',
                `.${cls}:not(:is(:last-child)):where(span, b){color:red}`,
                '}',
                '</style>',
                `<div class="${cls}">Combo</div>`,
            ].join(''));
        });

        it('Supports pseudo-classes and pseudo-elements', () => {
            const cls = css({
                color: 'black',
                [HOVER]: {color: 'red'},
                [FOCUS]: {outline: '2px solid blue'},
                [BEFORE]: {content: '">>"'},
                [AFTER]: {content: '"<<"'},
            });

            const html = engine.inject(`<div class="${cls}">Fancy</div>`);
            expect(html).toBe([
                '<style>',
                `.${cls}:hover{color:red}`,
                `.${cls}:focus{outline:2px solid blue}`,
                `.${cls}::before{content:">>"}`,
                `.${cls}::after{content:"<<"}`,
                `.${cls}{color:black}`,
                '</style>',
                `<div class="${cls}">Fancy</div>`,
            ].join(''));
        });

        it('Supports pseudo-classes inside media queries', () => {
            const cls = css({
                color: 'black',
                [MEDIA.tablet]: {
                    [HOVER]: {color: 'green'},
                    [FOCUS]: {color: 'blue'},
                },
            });

            const html = engine.inject(`<div class="${cls}">Responsive</div>`);
            expect(html).toBe([
                '<style>',
                `.${cls}{color:black}`,
                '@media (max-width: 1199px){',
                `.${cls}:hover{color:green}`,
                `.${cls}:focus{color:blue}`,
                '}',
                '</style>',
                `<div class="${cls}">Responsive</div>`,
            ].join(''));
        });

        it('Combines attribute selectors with pseudo and media', () => {
            const cls = css({
                '[data-theme="light"]': {color: 'black'},
                [MEDIA.dark]: {
                    '[data-theme="light"]': {
                        [HOVER]: {color: 'white'},
                    },
                },
            });

            const html = engine.inject(`<div class="${cls}">Theme</div>`);
            expect(html).toBe([
                '<style>',
                `.${cls}[data-theme="light"]{color:black}`,
                '@media (prefers-color-scheme: dark){',
                `.${cls}[data-theme="light"]:hover{color:white}`,
                '}',
                '</style>',
                `<div class="${cls}">Theme</div>`,
            ].join(''));
        });

        it('Supports multiple media queries with distinct style scopes', () => {
            const cls = css({
                fontSize: '1rem',
                padding: '1rem',
                backgroundColor: 'white',
                [MEDIA.dark]: {
                    backgroundColor: 'black',
                    color: 'white',
                },
                [MEDIA.light]: {
                    backgroundColor: 'white',
                    color: 'black',
                },
                [MEDIA.tablet]: {
                    fontSize: '0.9rem',
                    padding: '0.75rem',
                },
                [MEDIA.desktop]: {
                    fontSize: '1.2rem',
                    padding: '1.5rem',
                },
            });
    
            const html = engine.inject(`<div class="${cls}">Multimedia</div>`);
            expect(html).toBe([
                '<style>',
                `.${cls}{font-size:1rem;padding:1rem;background-color:white}`,
                `@media (prefers-color-scheme: dark){.${cls}{background-color:black;color:white}}`,
                `@media (prefers-color-scheme: light){.${cls}{background-color:white;color:black}}`,
                `@media (max-width: 1199px){.${cls}{font-size:0.9rem;padding:0.75rem}}`,
                `@media (min-width: 1200px){.${cls}{font-size:1.2rem;padding:1.5rem}}`,
                '</style>',
                `<div class="${cls}">Multimedia</div>`,
            ].join(''));
        });
    });
});
