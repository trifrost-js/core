import {describe, it, expect, beforeEach} from 'vitest';
import {css, setActiveStyleEngine} from '../../../../../lib/modules/JSX/style/use';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';
import CONSTANTS from '../../../../constants';

describe('Modules - JSX - style - use', () => {
    let engine: StyleEngine;

    beforeEach(() => {
        engine = new StyleEngine();
        setActiveStyleEngine(engine);
    });

    it('Handles empty object gracefully', () => {
        const cls = css({});
        const html = engine.inject(`<div class="${cls}">Empty</div>`);
        expect(html).toBe(`<div class="${cls}">Empty</div>`);
    });

    it('Handles a non-object rule gracefully', () => {
        for (const el of CONSTANTS.NOT_OBJECT) {
            const cls = css(el as Record<string, unknown>);
            expect(cls).toBe('');
            const html = engine.inject(`<div class="${cls}">Blank</div>`);
            expect(html).toBe(`<div class="${cls}">Blank</div>`);
        }
    });

    it('Generates deterministic class for flat styles', () => {
        const cls = css({color: 'red', fontSize: '1rem'});
        expect(cls).toMatch(/^tf-/);
        const html = engine.inject(`<div class="${cls}">Hello</div>`);
        expect(html).toBe(`<style>.${cls}{color:red;font-size:1rem}</style><div class="${cls}">Hello</div>`);
    });

    it('Ignores null or undefined style values', () => {
        const cls = css({
            color: 'black',
            backgroundColor: null,
            border: undefined,
            padding: '1rem',
        });
    
        const html = engine.inject(`<div class="${cls}">Sanitized</div>`);
        expect(html).toBe(`<style>.${cls}{color:black;padding:1rem}</style><div class="${cls}">Sanitized</div>`);
    });

    it('Supports :hover and span selectors', () => {
        const cls = css({
            color: 'black',
            ':hover': {color: 'red'},
            ' span': {fontWeight: 'bold'},
            ':hover span': {color: 'blue'},
        });

        const html = engine.inject(`<div class="${cls}">Hover</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}:hover{color:red}`,
            `.${cls} span{font-weight:bold}`,
            `.${cls}:hover span{color:blue}`,
            `.${cls}{color:black}`,
            '</style>',
            `<div class="${cls}">Hover</div>`,
        ].join(''));
    });

    it('Supports attribute selectors', () => {
        const cls = css({
            color: 'black',
            '[data-active="true"]': {color: 'red', backgroundColor: 'white'},
            '[data-active="true"]:hover': {fontWeight: 'bold'},
            ' span': {fontWeight: 'bold', flexDirection: 'column'},
            ':hover span': {color: 'blue'},
        });

        const html = engine.inject(`<div class="${cls}">Hover</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}[data-active="true"]{color:red;background-color:white}`,
            `.${cls}[data-active="true"]:hover{font-weight:bold}`,
            `.${cls} span{font-weight:bold;flex-direction:column}`,
            `.${cls}:hover span{color:blue}`,
            `.${cls}{color:black}`,
            '</style>',
            `<div class="${cls}">Hover</div>`,
        ].join(''));
    });

    it('Handles media queries for base and selector rules', () => {
        const cls = css({
            fontSize: '1rem',
            '@media (max-width: 600px)': {
                fontSize: '0.875rem',
                ':hover': {fontSize: '0.75rem'},
            },
        });

        const html = engine.inject(`<div class="${cls}">Responsive</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}{font-size:1rem}`,
            '@media (max-width: 600px){',
            `.${cls}:hover{font-size:0.75rem}`,
            `.${cls}{font-size:0.875rem}`,
            '}',
            '</style>',
            `<div class="${cls}">Responsive</div>`,
        ].join(''));
    });

    it('Handles multiple selectors under the same media query', () => {
        const cls = css({
            fontSize: '1rem',
            '@media (max-width: 600px)': {
                fontSize: '0.5rem',
                ':hover': {fontSize: '0.75rem'},
                ' span': {fontWeight: 'bold'},
            },
        });
    
        const html = engine.inject(`<div class="${cls}">Test</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}{font-size:1rem}`,
            '@media (max-width: 600px){',
            `.${cls}:hover{font-size:0.75rem}`,
            `.${cls} span{font-weight:bold}`,
            `.${cls}{font-size:0.5rem}`,
            '}',
            '</style>',
            `<div class="${cls}">Test</div>`,
        ].join(''));
    });

    it('Supports attribute selectors in combination with media queries', () => {
        const cls = css({
            color: 'black',
            '[data-active="true"]': {color: 'red', backgroundColor: 'white'},
            '[data-active="true"]:hover': {fontWeight: 'bold'},
            ' span': {fontWeight: 'bold', flexDirection: 'column'},
            ':hover span': {color: 'blue'},
            '@media (max-width: 600px)': {
                fontSize: '0.5rem',
                '[data-active="true"]': {color: 'black', fontSize: '0.4rem'},
                ':hover [data-active="true"]': {fontSize: '0.75rem'},
                ':active [data-active="true"]': {fontSize: '0.70rem'},
                ':hover': {fontSize: '0.75rem'},
                ' span': {fontWeight: 'bold'},
            },
        });

        const html = engine.inject(`<div class="${cls}">Hover</div>`);
        expect(html).toBe([
            '<style>',
            `.${cls}[data-active="true"]{color:red;background-color:white}`,
            `.${cls}[data-active="true"]:hover{font-weight:bold}`,
            `.${cls} span{font-weight:bold;flex-direction:column}`,
            `.${cls}:hover span{color:blue}`,
            `.${cls}{color:black}`,
            [
                '@media (max-width: 600px){',
                `.${cls}[data-active="true"]{color:black;font-size:0.4rem}`,
                `.${cls}:hover [data-active="true"]{font-size:0.75rem}`,
                `.${cls}:active [data-active="true"]{font-size:0.70rem}`,
                `.${cls}:hover{font-size:0.75rem}`,
                `.${cls} span{font-weight:bold}`,
                `.${cls}{font-size:0.5rem}`,
                '}',
            ].join(''),
            '</style>',
            `<div class="${cls}">Hover</div>`,
        ].join(''));
    });

    it('Deduplicates identical declarations under different selectors', () => {
        const base = {color: 'red'};
        const cls1 = css(base);
        const cls2 = css(base);
        expect(cls1).toBe(cls2);
        const html = engine.inject(`<div class="${cls1} ${cls2}">Hello</div>`);
        expect(html).toBe(`<style>.${cls1}{color:red}</style><div class="${cls1} ${cls2}">Hello</div>`);
    });

    it('Correctly handles background url', () => {
        const cls = css({
            backgroundImage: 'url(\'./foo.jpg\')',
        });

        const html = engine.inject(`<div class="${cls}">Images</div>`);
        expect(html).toBe(`<style>.${cls}{background-image:url('./foo.jpg')}</style><div class="${cls}">Images</div>`);
    });

    it('Normalizes CSS functions wrapped in quotes', () => {
        const cls = css({backgroundImage: '\'url(/foo.png)\''});
        const html = engine.inject(`<div class="${cls}">BG</div>`);
        expect(html).toBe(`<style>.${cls}{background-image:url(/foo.png)}</style><div class="${cls}">BG</div>`);
    });
      
    it('Preserves quotes for valid string literals like content', () => {
        const cls = css({content: '"TriFrost"'});
        const html = engine.inject(`<div class="${cls}">Quoted</div>`);
        expect(html).toBe(`<style>.${cls}{content:"TriFrost"}</style><div class="${cls}">Quoted</div>`);
    });
      
    it('Strips quotes around url() if present', () => {
        const cls = css({backgroundImage: '\'url(/bg.png)\''});
        const html = engine.inject(`<div class="${cls}">BG</div>`);
        expect(html).toBe(`<style>.${cls}{background-image:url(/bg.png)}</style><div class="${cls}">BG</div>`);
    });
      
    it('Strips quotes around calc(...) expressions', () => {
        const cls = css({width: '"calc(100% - 2rem)"'});
        const html = engine.inject(`<div class="${cls}">Layout</div>`);
        expect(html).toBe(`<style>.${cls}{width:calc(100% - 2rem)}</style><div class="${cls}">Layout</div>`);
    });
      
    it('Strips quotes around var(...) tokens', () => {
        const cls = css({margin: '\'var(--space-md)\''});
        const html = engine.inject(`<div class="${cls}">Token</div>`);
        expect(html).toBe(`<style>.${cls}{margin:var(--space-md)}</style><div class="${cls}">Token</div>`);
    });
      
    it('Strips quotes around nested functions like filter()', () => {
        const cls = css({filter: '\'blur(5px)\''});
        const html = engine.inject(`<div class="${cls}">Filter</div>`);
        expect(html).toBe(`<style>.${cls}{filter:blur(5px)}</style><div class="${cls}">Filter</div>`);
    });
      
    it('Leaves other string literals untouched', () => {
        const cls = css({fontFamily: '"Helvetica, sans-serif"'});
        const html = engine.inject(`<div class="${cls}">Font</div>`);
        expect(html).toBe(`<style>.${cls}{font-family:"Helvetica, sans-serif"}</style><div class="${cls}">Font</div>`);
    });
      
    it('Returns the same class for identical rule strings', () => {
        const cls1 = css({fontWeight: 'bold'});
        const cls2 = css({fontWeight: 'bold'});
        expect(cls1).toBe(cls2);
    });

    it('Returns class but does not inject when inject: false', () => {
        const cls = css({color: 'green'}, {inject: false});
        expect(cls).toMatch(/^tf-/);
        const html = engine.inject(`<div class="${cls}">Nothing</div>`);
        expect(html).toBe(`<div class="${cls}">Nothing</div>`);
    });

    describe('Modules - JSX - style - selectors', () => {
        it('Supports :nth-child(n)', () => {
            const cls = css({[css.nthChild(2)]: {fontWeight: 'bold'}});
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:nth-child(2){font-weight:bold}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :nth-last-child(n)', () => {
            const cls = css({
                [css.nthLastChild(1)]: {
                    color: 'blue',
                },
            });
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:nth-last-child(1){color:blue}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :nth-of-type(n)', () => {
            const cls = css({
                [css.nthOfType('3n+1')]: {
                    fontStyle: 'italic',
                },
            });
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:nth-of-type(3n+1){font-style:italic}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :nth-last-of-type', () => {
            const cls = css({
                [css.nthLastOfType(2)]: {
                    borderBottom: '1px solid gray',
                },
            });
        
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:nth-last-of-type(2){border-bottom:1px solid gray}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :not(selector)', () => {
            const cls = css({
                [css.not(':last-child')]: {
                    marginBottom: '1rem',
                },
            });
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:not(:last-child){margin-bottom:1rem}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :is(selector)', () => {
            const cls = css({
                [css.is('a, button')]: {
                    cursor: 'pointer',
                },
            });
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:is(a, button){cursor:pointer}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :where(...)', () => {
            const cls = css({
                [css.where('section, article')]: {
                    lineHeight: 1.5,
                },
            });
        
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:where(section, article){line-height:1.5}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :has(selector)', () => {
            const cls = css({
                [css.has('img')]: {
                    display: 'flex',
                },
            });
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:has(img){display:flex}</style><div class="${cls}">Test</div>`);
        });
    
        it('Supports :dir(ltr)', () => {
            const cls = css({
                [css.dir('ltr')]: {
                    paddingLeft: '1rem',
                },
            });
            const html = engine.inject(`<div class="${cls}">Test</div>`);
            expect(html).toBe(`<style>.${cls}:dir(ltr){padding-left:1rem}</style><div class="${cls}">Test</div>`);
        });
    
        it('Works inside media queries', () => {
            const cls = css({
                fontSize: '1rem',
                [css.media.tabletOnly]: {
                    [css.nthChild(2)]: {
                        fontSize: '0.75rem',
                    },
                    [css.not(':last-child')]: {
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
                [css.media.mobile]: {
                    [css.nthChild(3)]: {
                        [css.where('span, strong')]: {
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
                    [css.not(css.nthChild(1))]: {opacity: 0.75},
                });
                const html = engine.inject(`<div class="${cls}">List</div>`);
                expect(html).toBe(`<style>.${cls}:not(:nth-child(1)){opacity:0.75}</style><div class="${cls}">List</div>`);
            });
            
            it('Uses :is() inside :not()', () => {
                const cls = css({
                    [css.not(css.is('a, button'))]: {color: 'gray'},
                });
                const html = engine.inject(`<div class="${cls}">Filtered</div>`);
                expect(html).toBe(`<style>.${cls}:not(:is(a, button)){color:gray}</style><div class="${cls}">Filtered</div>`);
            });
            
            it('Uses :where() with :nth-last-child()', () => {
                const cls = css({
                    [css.where(css.nthLastChild(2))]: {paddingBottom: '0.5rem'},
                });
                const html = engine.inject(`<div class="${cls}">Scoped</div>`);
                expect(html).toBe([
                    '<style>',
                    `.${cls}:where(:nth-last-child(2)){padding-bottom:0.5rem}`,
                    '</style>',
                    `<div class="${cls}">Scoped</div>`,
                ].join(''));
            });
            
            it('Uses :dir() with media query', () => {
                const cls = css({
                    [css.media.tabletOnly]: {
                        [css.dir('rtl')]: {textAlign: 'right'},
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
                    [css.nthChild(3)]: {
                        [css.dir('ltr')]: {marginLeft: '1rem'},
                    },
                });
                const html = engine.inject(`<div class="${cls}">Nested</div>`);
                expect(html).toBe(`<style>.${cls}:nth-child(3):dir(ltr){margin-left:1rem}</style><div class="${cls}">Nested</div>`);
            });
            
            it('Multiple combinators inside a media query', () => {
                const cls = css({
                    [css.media.mobile]: {
                        [css.not(css.is(':last-child'))]: {
                            [css.where('span, b')]: {color: 'red'},
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
                    [css.hover]: {color: 'red'},
                    [css.focus]: {outline: '2px solid blue'},
                    [css.before]: {content: '">>"'},
                    [css.after]: {content: '"<<"'},
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
                    [css.media.tablet]: {
                        [css.hover]: {color: 'green'},
                        [css.focus]: {color: 'blue'},
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
                    [css.media.dark]: {
                        '[data-theme="light"]': {
                            [css.hover]: {color: 'white'},
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
                    [css.media.dark]: {
                        backgroundColor: 'black',
                        color: 'white',
                    },
                    [css.media.light]: {
                        backgroundColor: 'white',
                        color: 'black',
                    },
                    [css.media.tablet]: {
                        fontSize: '0.9rem',
                        padding: '0.75rem',
                    },
                    [css.media.desktop]: {
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
});
