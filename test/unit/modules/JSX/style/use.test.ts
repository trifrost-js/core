/* eslint-disable max-lines */
/* eslint-disable max-len */
import {describe, it, expect, beforeEach} from 'vitest';
import {createCss, getActiveStyleEngine, setActiveStyleEngine} from '../../../../../lib/modules/JSX/style/use';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';
import CONSTANTS from '../../../../constants';

describe('Modules - JSX - style - use', () => {
    let engine: StyleEngine;

    beforeEach(() => {
        engine = new StyleEngine();
        setActiveStyleEngine(engine);
    });

    describe('css', () => {
        let css:ReturnType<typeof createCss>;

        beforeEach(() => {
            css = createCss();
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

            describe('root', () => {
                it('Injects nada if passed a non/empty object', () => {
                    for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                        css.root(el as Record<string, unknown>);
                
                        const html = engine.inject('<div>Root Vars</div>');
                        expect(html).toBe('<div>Root Vars</div>');
                    }
                });

                it('Creates a new engine if no active engine', () => {
                    setActiveStyleEngine(null);
                    css.root({
                        '--color-primary': 'blue',
                        '--spacing': '1rem',
                    });
                
                    const html = getActiveStyleEngine()!.inject('<div>Root Vars</div>');
                    expect(html).toBe('<style>:root{--color-primary:blue;--spacing:1rem}</style><div>Root Vars</div>');
                });

                it('Injects simple CSS variables under :root', () => {
                    css.root({
                        '--color-primary': 'blue',
                        '--spacing': '1rem',
                    });
            
                    const html = engine.inject('<div>Root Vars</div>');
                    expect(html).toBe([
                        '<style>',
                        ':root{--color-primary:blue;--spacing:1rem}',
                        '</style>',
                        '<div>Root Vars</div>',
                    ].join(''));
                });
            
                it('Supports media queries with root-level variables', () => {
                    css.root({
                        '--color': 'black',
                        [css.media.dark]: {
                            '--color': 'white',
                        },
                    });
            
                    const html = engine.inject('<div>Media Root</div>');
                    expect(html).toBe([
                        '<style>',
                        ':root{--color:black}',
                        '@media (prefers-color-scheme: dark){:root{--color:white}}',
                        '</style>',
                        '<div>Media Root</div>',
                    ].join(''));
                });

                it('Supports media queries with root-level variables and attribute selectors', () => {
                    css.root({
                        '--color': 'black',
                        '[data-enabled]': {opacity: '1'},
                        [css.media.dark]: {
                            '--color': 'white',
                            '[data-enabled]': {opacity: '.5'},
                        },
                    });
            
                    const html = engine.inject('<div>Media Root</div>');
                    expect(html).toBe([
                        '<style>',
                        ':root[data-enabled]{opacity:1}',
                        ':root{--color:black}',
                        '@media (prefers-color-scheme: dark){',
                        ':root[data-enabled]{opacity:.5}',
                        ':root{--color:white}',
                        '}',
                        '</style>',
                        '<div>Media Root</div>',
                    ].join(''));
                });
            
                it('can nest tag styles alongside root and media', () => {
                    css.root({
                        '--font-size': '14px',
                        html: {
                            fontFamily: 'sans-serif',
                            [css.media.tabletOnly]: {
                                fontSize: '16px',
                            },
                        },
                        [css.media.dark]: {
                            '--font-size': '16px',
                            body: {
                                backgroundColor: 'black',
                            },
                        },
                    });
            
                    const html = engine.inject('<div>Nested Root</div>');
                    expect(html).toBe([
                        '<style>',
                        'html{font-family:sans-serif}',
                        ':root{--font-size:14px}',
                        '@media (prefers-color-scheme: dark){',
                        'body{background-color:black}',
                        ':root{--font-size:16px}',
                        '}',
                        '@media (min-width: 601px) and (max-width: 1199px){',
                        'html{font-size:16px}',
                        '}',
                        '</style>',
                        '<div>Nested Root</div>',
                    ].join(''));
                });
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

    describe('createCss', () => {
        it('Injects root-level CSS vars from `var` map', () => {
            const css = createCss({
                var: {spacing_m: '1rem', radius_l: '8px'},
                theme: {},
                reset: false,
            });
    
            css.root();
    
            const html = engine.inject('<div>Vars</div>');
            expect(html).toBe([
                '<style>',
                ':root{--v-spacing_m:1rem;--v-radius_l:8px}',
                '</style>',
                '<div>Vars</div>',
            ].join(''));
        });

        it('Throws when an invalid theme var is provided', () => {
            expect(() => createCss({
                var: {},
                theme: {
                    /* @ts-ignore */
                    bg: null,
                    text: {light: '#111', dark: '#eee'},
                },
                reset: false,
            })).toThrowError(/Theme token 'bg' is invalid, must either be a string or define both 'light' and 'dark' values/);
        });
    
        it('Injects theme vars using media queries by default', () => {
            const css = createCss({
                var: {},
                theme: {
                    bg: {light: '#fff', dark: '#000'},
                    text: {light: '#111', dark: '#eee'},
                },
                reset: false,
            });
    
            css.root();
    
            const html = engine.inject('<div>Theme</div>');
            expect(html).toBe([
                '<style>',
                '@media (prefers-color-scheme: light){:root{--t-bg:#fff;--t-text:#111}}',
                '@media (prefers-color-scheme: dark){:root{--t-bg:#000;--t-text:#eee}}',
                '</style>',
                '<div>Theme</div>',
            ].join(''));
        });
    
        it('Injects theme vars using data-theme attribute when themeAttribute is true', () => {
            const css = createCss({
                var: {},
                theme: {
                    color: {light: '#ccc', dark: '#333'},
                },
                reset: false,
                themeAttribute: true,
            });
    
            css.root();
    
            const html = engine.inject('<div>Attr Theme</div>');
            expect(html).toBe([
                '<style>',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-color:#333}',
                ':root{--t-color:#ccc}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root[data-theme="light"]{--t-color:#ccc}',
                ':root{--t-color:#333}',
                '}',
                '</style>',
                '<div>Attr Theme</div>',
            ].join(''));
        });
    
        it('Supports custom theme attribute names', () => {
            const css = createCss({
                var: {},
                theme: {border: {light: 'gray', dark: 'white'}},
                reset: false,
                themeAttribute: 'data-mode',
            });
    
            css.root();
    
            const html = engine.inject('<div>Mode Theme</div>');
            expect(html).toBe([
                '<style>',                
                '@media (prefers-color-scheme: light){',
                ':root[data-mode="dark"]{--t-border:white}',
                ':root{--t-border:gray}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root[data-mode="light"]{--t-border:gray}',
                ':root{--t-border:white}',
                '}',
                '</style>',
                '<div>Mode Theme</div>',
            ].join(''));
        });
    
        it('Injects reset styles when reset is true', () => {
            const css = createCss({
                var: {},
                theme: {},
                reset: true,
            });
    
            css.root();
    
            expect(engine.inject('<div>Reset</div>')).toBe([
                '<style>',
                '*, *::before, *::after{box-sizing:border-box}',
                'html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}',
                'footer, header, nav, section, main{display:block}',
                'ol, ul{list-style:none}',
                'q, blockquote::before{content:none}',
                'q, blockquote::after{content:none}',
                'q, blockquote{quotes:none}',
                'table{border-collapse:collapse;border-spacing:0}',
                '</style>',
                '<div>Reset</div>',
            ].join(''));
        });
    
        it('Does not inject reset styles when reset is false', () => {
            const css = createCss({
                var: {},
                theme: {},
                reset: false,
            });
    
            css.root();
    
            expect(engine.inject('<div>No Reset</div>')).toBe('<div>No Reset</div>');
        });
    
        it('Deduplicates root injection per engine', () => {
            const css = createCss({
                var: {spacing: '1rem'},
                theme: {bg: {light: '#fff', dark: '#000'}},
                reset: true,
                themeAttribute: true,
            });
    
            // Call root multiple times
            css.root();
            css.root();
            css.root();
    
            expect(engine.inject('<div>Once</div>')).toBe([
                '<style>',
                '*, *::before, *::after{box-sizing:border-box}',
                'html, body, div, span, object, iframe, figure, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, code, em, img, small, strike, strong, sub, sup, tt, b, u, i, ol, ul, li, fieldset, form, label, table, caption, tbody, tfoot, thead, tr, th, td, main, canvas, embed, footer, header, nav, section, video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;text-size-adjust:none}',
                'footer, header, nav, section, main{display:block}',
                'ol, ul{list-style:none}',
                'q, blockquote::before{content:none}',
                'q, blockquote::after{content:none}',
                'q, blockquote{quotes:none}',
                'table{border-collapse:collapse;border-spacing:0}',
                ':root{--v-spacing:1rem}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000}',
                ':root{--t-bg:#fff}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root[data-theme="light"]{--t-bg:#fff}',
                ':root{--t-bg:#000}',
                '}',
                '</style>',
                '<div>Once</div>',
            ].join(''));
        });
    
        it('Multiple configured instances coexist correctly', () => {
            const cssA = createCss({
                var: {radius: '4px'},
                theme: {bg: {light: '#fff', dark: '#000'}},
                reset: false,
            });
            const cssB = createCss({
                var: {spacing: '2rem'},
                theme: {fg: {light: '#000', dark: '#fff'}},
                reset: false,
            });
    
            cssA.root();
            cssB.root();
    
            expect(engine.inject('<div>Multiple</div>')).toBe([
                '<style>',
                ':root{--v-radius:4px}',
                ':root{--v-spacing:2rem}',
                '@media (prefers-color-scheme: light){',
                ':root{--t-bg:#fff}',
                ':root{--t-fg:#000}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root{--t-bg:#000}',
                ':root{--t-fg:#fff}',
                '}',
                '</style>',
                '<div>Multiple</div>',
            ].join(''));
        });
    
        it('Produces same class name for identical style objects across instances', () => {
            const style = {color: 'red', padding: '1rem'};
    
            const css1 = createCss({var: {}, theme: {}, reset: false});
            const css2 = createCss({var: {}, theme: {}, reset: false});
    
            const cls1 = css1(style);
            const cls2 = css2(style);
    
            expect(cls1).toBe(cls2);
    
            const html = engine.inject(`<div class="${cls1}">Test</div>`);
            expect(html).toBe(`<style>.${cls1}{color:red;padding:1rem}</style><div class="${cls1}">Test</div>`);
        });

        it('Supports deeply nested attribute selectors inside media queries', () => {
            const css = createCss({var: {}, theme: {}, reset: false});
        
            const cls = css({
                color: 'black',
                ' [data-role="admin"]': {
                    backgroundColor: 'gray',
                    [css.media.mobile]: {
                        color: 'blue',
                    },
                },
            });
        
            expect(engine.inject(`<div class="${cls}">Deep</div>`)).toBe([
                '<style>',
                `.${cls} [data-role="admin"]{background-color:gray}`,
                `.${cls}{color:black}`,
                '@media (max-width: 600px){',
                `.${cls} [data-role="admin"]{color:blue}`,
                '}',
                '</style>',
                `<div class="${cls}">Deep</div>`,
            ].join(''));
        });
        
        it('Handles top-level attribute-only selectors', () => {
            const css = createCss({var: {}, theme: {}, reset: false});
        
            const cls = css({
                '[data-active="true"]': {backgroundColor: 'red'},
            });
        
            expect(engine.inject(`<div class="${cls}">OnlyAttr</div>`)).toBe([
                '<style>',
                `.${cls}[data-active="true"]{background-color:red}`,
                '</style>',
                `<div class="${cls}">OnlyAttr</div>`,
            ].join(''));
        });

        it('Separates :root and global tag styles correctly', () => {
            const css = createCss({
                var: {radius: '8px'},
                theme: {bg: {light: '#fff', dark: '#000'}},
                reset: false,
                themeAttribute: true,
            });
        
            css.root({
                html: {fontSize: '16px'},
            });
        
            expect(engine.inject('<div>Global</div>')).toBe([
                '<style>',
                'html{font-size:16px}',
                ':root{--v-radius:8px}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{',
                '--t-bg:#000}:root{--t-bg:#fff}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root[data-theme="light"]{--t-bg:#fff}',
                ':root{--t-bg:#000}',
                '}',
                '</style>',
                '<div>Global</div>',
            ].join(''));
        });
        
        it('applies defined var() and theme() references inside css styles', () => {
            const css = createCss({
                var: {
                    spacing_m: '1rem',
                    radius_s: '4px',
                },
                theme: {
                    bg: {light: '#fff', dark: '#000'},
                    fg: {light: '#111', dark: '#eee'},
                },
                reset: false,
                themeAttribute: true,
            });
        
            const cls = css({
                backgroundColor: css.theme.bg,
                color: css.theme.fg,
                padding: css.var.spacing_m,
                borderRadius: css.var.radius_s,
            });
        
            css.root();
        
            const html = engine.inject(`<div class="${cls}">Vars in Use</div>`);
        
            expect(html).toBe([
                '<style>',
                '.tf-xlk7jb{background-color:var(--t-bg);color:var(--t-fg);padding:var(--v-spacing_m);border-radius:var(--v-radius_s)}',
                ':root{--v-spacing_m:1rem;--v-radius_s:4px}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000;--t-fg:#eee}',
                ':root{--t-bg:#fff;--t-fg:#111}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root[data-theme="light"]{--t-bg:#fff;--t-fg:#111}',
                ':root{--t-bg:#000;--t-fg:#eee}',
                '}',
                '</style>',
                '<div class="tf-xlk7jb">Vars in Use</div>',
            ].join(''));
        });

        it('has $t and $v aliases for theme and var', () => {
            const css = createCss({
                var: {
                    spacing_m: '1rem',
                    radius_s: '4px',
                },
                theme: {
                    bg: {light: '#fff', dark: '#000'},
                    fg: {light: '#111', dark: '#eee'},
                },
                reset: false,
                themeAttribute: true,
            });
        
            const cls = css({
                backgroundColor: css.$t.bg,
                color: css.$t.fg,
                padding: css.$v.spacing_m,
                borderRadius: css.$v.radius_s,
            });
        
            css.root();
        
            const html = engine.inject(`<div class="${cls}">Vars in Use</div>`);
        
            expect(html).toBe([
                '<style>',
                '.tf-xlk7jb{background-color:var(--t-bg);color:var(--t-fg);padding:var(--v-spacing_m);border-radius:var(--v-radius_s)}',
                ':root{--v-spacing_m:1rem;--v-radius_s:4px}',
                '@media (prefers-color-scheme: light){',
                ':root[data-theme="dark"]{--t-bg:#000;--t-fg:#eee}',
                ':root{--t-bg:#fff;--t-fg:#111}',
                '}',
                '@media (prefers-color-scheme: dark){',
                ':root[data-theme="light"]{--t-bg:#fff;--t-fg:#111}',
                ':root{--t-bg:#000;--t-fg:#eee}',
                '}',
                '</style>',
                '<div class="tf-xlk7jb">Vars in Use</div>',
            ].join(''));
        });

        it('Allows the use of string-only theme tokens', () => {
            const css = createCss({
                theme: {
                    bg: '#fff',
                    fg: '#000',
                },
            });
            css.root();
            expect(engine.inject('<div>Theme</div>')).toBe('<style>:root{--t-bg:#fff;--t-fg:#000}</style><div>Theme</div>');
        });

        it('Allows the use of string-only theme tokens (some are string and some are full)', () => {
            const css = createCss({
                theme: {
                    bg: '#fff',
                    fg: '#000',
                    alt: {dark: '#333', light: '#f9f9f9'},
                },
            });
            css.root();
            expect(engine.inject('<div>Theme</div>')).toBe([
                '<style>',
                ':root{--t-bg:#fff;--t-fg:#000}',
                '@media (prefers-color-scheme: light){:root{--t-alt:#f9f9f9}}',
                '@media (prefers-color-scheme: dark){:root{--t-alt:#333}}',
                '</style>',
                '<div>Theme</div>',
            ].join(''));
        });

        it('Resolves definitions at setup time', () => {
            const css = createCss({
                var: {spacing: '2rem'},
                theme: {
                    bg: '#fff',
                    fg: '#222',
                },
                definitions: mod => ({
                    base: {
                        display: 'flex',
                        alignItems: 'center',
                        color: mod.$t.fg,
                        background: mod.$t.bg,
                    },
                    padded: {
                        padding: mod.$v.spacing,
                    },
                }),
            });
            css.root();
    
            const cls = css.use('base', 'padded');
            expect(engine.inject(`<div class="${cls}">Defined</div>`)).toBe([
                '<style>',
                ':root{',
                '--v-spacing:2rem;',
                '--t-bg:#fff;',
                '--t-fg:#222',
                '}',
                '.tf-cd4cfg{display:flex;align-items:center;color:var(--t-fg);background:var(--t-bg);padding:var(--v-spacing)}',
                '</style>',
                '<div class="tf-cd4cfg">Defined</div>',
            ].join(''));
        });

        it('Supports mix() to return merged style object', () => {
            const css = createCss({
                var: {x: '1rem'},
                definitions: () => ({
                    row: {display: 'flex', flexDirection: 'row'},
                    center: {justifyContent: 'center', alignItems: 'center'},
                }),
            });
    
            const mixed = css.mix('row', 'center', {gap: css.var.x});
            expect(mixed).toEqual({
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 'var(--v-x)',
            });
        });

        it('mix() returns empty object if nothing passed', () => {
            const css = createCss();
            expect(css.mix()).toEqual({});
        });
    
        it('use() returns class name for merged definitions', () => {
            const css = createCss({
                var: {x: '1rem'},
                definitions: () => ({
                    row: {display: 'flex', flexDirection: 'row'},
                    center: {justifyContent: 'center', alignItems: 'center'},
                }),
            });
    
            const cls = css.use('row', 'center', {gap: css.var.x});
            expect(cls).toMatch(/^tf-/);
            expect(engine.inject(`<div class="${cls}">Mix</div>`)).toBe([
                '<style>',
                '.tf-1v7zb4h{display:flex;flex-direction:row;justify-content:center;align-items:center;gap:var(--v-x)}',
                '</style>',
                '<div class="tf-1v7zb4h">Mix</div>',
            ].join(''));
        });

        it('Allows for a combination of mix and use', () => {
            const css = createCss({
                var: {
                    space_xl: '4rem',
                    space_l: '2rem',
                    space_m: '1rem',
                    space_s: '.5rem',
                },
                theme: {
                    bg: '#000',
                    fg: '#fff',  
                },
                definitions: mod => ({
                    f: {display: 'flex'},
                    fh: {flexDirection: 'row'},
                    fv: {flexDirection: 'column'},
                    fa_c: {alignItems: 'center'},
                    fj_c: {justifyContent: 'center'},
                    fj_sa: {justifyContent: 'space-around'},
                    oh: {overflow: 'hidden'},
                    sp_xl: {padding: mod.$v.space_xl},
                    sp_l: {padding: mod.$v.space_l},
                    sp_h_l: {paddingLeft: mod.$v.space_l, paddingRight: mod.$v.space_l},
                    hide: {display: 'none'},
                    shouldNotBeIncluded: {
                        color: 'red',
                        fontSize: '20rem',
                    },
                }),
            });

            const cls = css.use('f', 'fh', 'fa_c', 'oh', {
                width: '100%',
                background: css.$t.bg,
                color: css.$t.fg,
                [css.media.desktop]: css.mix('sp_xl', 'fj_c', {
                    ' > span': css.mix('sp_h_l', {fontSize: '1rem'}),
                }),
                [css.media.tablet]: css.mix('sp_l', 'fj_sa', {' > span': css.mix('hide')}),
            });
        
            expect(cls).toMatch(/^tf-/);
            expect(engine.inject(`<div class="${cls}">Mix</div>`)).toBe([
                '<style>',
                '.tf-oupfrh{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                '@media (min-width: 1200px){',
                '.tf-oupfrh > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                '.tf-oupfrh{padding:var(--v-space_xl);justify-content:center}',
                '}',
                '@media (max-width: 1199px){',
                '.tf-oupfrh > span{display:none}',
                '.tf-oupfrh{padding:var(--v-space_l);justify-content:space-around}',
                '}',
                '</style>',
                '<div class="tf-oupfrh">Mix</div>',
            ].join(''));
        });

        it('Does not crash when provided a definition that doesnt exist', () => {
            const css = createCss({
                var: {
                    space_xl: '4rem',
                    space_l: '2rem',
                    space_m: '1rem',
                    space_s: '.5rem',
                },
                theme: {
                    bg: '#000',
                    fg: '#fff',  
                },
                definitions: mod => ({
                    f: {display: 'flex'},
                    fh: {flexDirection: 'row'},
                    fv: {flexDirection: 'column'},
                    fa_c: {alignItems: 'center'},
                    fj_c: {justifyContent: 'center'},
                    fj_sa: {justifyContent: 'space-around'},
                    oh: {overflow: 'hidden'},
                    sp_xl: {padding: mod.$v.space_xl},
                    sp_l: {padding: mod.$v.space_l},
                    sp_h_l: {paddingLeft: mod.$v.space_l, paddingRight: mod.$v.space_l},
                    hide: {display: 'none'},
                    shouldNotBeIncluded: {
                        color: 'red',
                        fontSize: '20rem',
                    },
                }),
            });

            const cls = css.use('f', 'fh', 'fa_c', 'oh', {
                width: '100%',
                background: css.$t.bg,
                color: css.$t.fg,
                [css.media.desktop]: css.mix('sp_xl', 'fj_c', {
                    ' > span': css.mix('sp_h_l', {fontSize: '1rem'}),
                }),
                /* @ts-ignore this is what we're testing */
                [css.media.tablet]: css.mix('sp_l', 'fj_sa', {' > span': css.mix('hode')}),
            });
        
            expect(cls).toMatch(/^tf-/);
            expect(engine.inject(`<div class="${cls}">Mix</div>`)).toBe([
                '<style>',
                '.tf-1wuvp3b{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                '@media (min-width: 1200px){',
                '.tf-1wuvp3b > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                '.tf-1wuvp3b{padding:var(--v-space_xl);justify-content:center}',
                '}',
                '@media (max-width: 1199px){',
                // '.tf-1wuvp3b > span{display:none}',
                '.tf-1wuvp3b{padding:var(--v-space_l);justify-content:space-around}',
                '}',
                '</style>',
                '<div class="tf-1wuvp3b">Mix</div>',
            ].join(''));
        });

        it('Does not crash and instead proactively set an active style engine if none exists', () => {
            setActiveStyleEngine(null);

            const css = createCss({
                var: {
                    space_xl: '4rem',
                    space_l: '2rem',
                    space_m: '1rem',
                    space_s: '.5rem',
                },
                theme: {
                    bg: '#000',
                    fg: '#fff',  
                },
                definitions: mod => ({
                    f: {display: 'flex'},
                    fh: {flexDirection: 'row'},
                    fv: {flexDirection: 'column'},
                    fa_c: {alignItems: 'center'},
                    fj_c: {justifyContent: 'center'},
                    fj_sa: {justifyContent: 'space-around'},
                    oh: {overflow: 'hidden'},
                    sp_xl: {padding: mod.$v.space_xl},
                    sp_l: {padding: mod.$v.space_l},
                    sp_h_l: {paddingLeft: mod.$v.space_l, paddingRight: mod.$v.space_l},
                    hide: {display: 'none'},
                    shouldNotBeIncluded: {
                        color: 'red',
                        fontSize: '20rem',
                    },
                }),
            });

            const cls = css.use('f', 'fh', 'fa_c', 'oh', {
                width: '100%',
                background: css.$t.bg,
                color: css.$t.fg,
                [css.media.desktop]: css.mix('sp_xl', 'fj_c', {
                    ' > span': css.mix('sp_h_l', {fontSize: '1rem'}),
                }),
                [css.media.tablet]: css.mix('sp_l', 'fj_sa'),
            });
        
            expect(cls).toMatch(/^tf-/);
            expect(getActiveStyleEngine()!.inject(`<div class="${cls}">Mix</div>`)).toBe([
                '<style>',
                '.tf-kn00o5{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                '@media (min-width: 1200px){',
                '.tf-kn00o5 > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                '.tf-kn00o5{padding:var(--v-space_xl);justify-content:center}',
                '}',
                '@media (max-width: 1199px){',
                '.tf-kn00o5{padding:var(--v-space_l);justify-content:space-around}',
                '}',
                '</style>',
                '<div class="tf-kn00o5">Mix</div>',
            ].join(''));
        });

        it('Runs the same input across multiple engines successfully and swiftly', () => {
            const css = createCss({
                var: {
                    space_xl: '4rem',
                    space_l: '2rem',
                    space_m: '1rem',
                    space_s: '.5rem',
                },
                theme: {
                    bg: '#000',
                    fg: '#fff',  
                },
                definitions: mod => ({
                    f: {display: 'flex'},
                    fh: {flexDirection: 'row'},
                    fv: {flexDirection: 'column'},
                    fa_c: {alignItems: 'center'},
                    fj_c: {justifyContent: 'center'},
                    fj_sa: {justifyContent: 'space-around'},
                    oh: {overflow: 'hidden'},
                    sp_xl: {padding: mod.$v.space_xl},
                    sp_l: {padding: mod.$v.space_l},
                    sp_h_l: {paddingLeft: mod.$v.space_l, paddingRight: mod.$v.space_l},
                    hide: {display: 'none'},
                    shouldNotBeIncluded: {
                        color: 'red',
                        fontSize: '20rem',
                    },
                }),
            });

            const output:string[] = [];
            const start = Date.now();
            for (let i = 0; i < 1_000; i++) {
                setActiveStyleEngine(new StyleEngine());
                output.push(getActiveStyleEngine()!.inject(`<div class="${css.use('f', 'fh', 'fa_c', 'oh', {
                    width: '100%',
                    background: css.$t.bg,
                    color: css.$t.fg,
                    [css.media.desktop]: css.mix('sp_xl', 'fj_c', {
                        ' > span': css.mix('sp_h_l', {fontSize: '1rem'}),
                    }),
                    [css.media.tablet]: css.mix('sp_l', 'fj_sa', {' > span': css.mix('hide')}),
                })}">Mix</div>`));
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
            for (const el of output) {
                expect(el).toBe([
                    '<style>',
                    '.tf-oupfrh{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                    '@media (min-width: 1200px){',
                    '.tf-oupfrh > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                    '.tf-oupfrh{padding:var(--v-space_xl);justify-content:center}',
                    '}',
                    '@media (max-width: 1199px){',
                    '.tf-oupfrh > span{display:none}',
                    '.tf-oupfrh{padding:var(--v-space_l);justify-content:space-around}',
                    '}',
                    '</style>',
                    '<div class="tf-oupfrh">Mix</div>',
                ].join(''));
            }
        });

        it('Runs the same input across multiple engines successfully and swiftly when not injecting', () => {
            const css = createCss({
                var: {
                    space_xl: '4rem',
                    space_l: '2rem',
                    space_m: '1rem',
                    space_s: '.5rem',
                },
                theme: {
                    bg: '#000',
                    fg: '#fff',  
                },
                definitions: mod => ({
                    f: {display: 'flex'},
                    fh: {flexDirection: 'row'},
                    fv: {flexDirection: 'column'},
                    fa_c: {alignItems: 'center'},
                    fj_c: {justifyContent: 'center'},
                    fj_sa: {justifyContent: 'space-around'},
                    oh: {overflow: 'hidden'},
                    sp_xl: {padding: mod.$v.space_xl},
                    sp_l: {padding: mod.$v.space_l},
                    sp_h_l: {paddingLeft: mod.$v.space_l, paddingRight: mod.$v.space_l},
                    hide: {display: 'none'},
                    shouldNotBeIncluded: {
                        color: 'red',
                        fontSize: '20rem',
                    },
                }),
            });

            const output:string[] = [];
            const start = Date.now();
            for (let i = 0; i < 1_000; i++) {
                setActiveStyleEngine(new StyleEngine());
                output.push(getActiveStyleEngine()!.inject(`<div class="${css(css.mix('f', 'fh', 'fa_c', 'oh', {
                    width: '100%',
                    background: css.$t.bg,
                    color: css.$t.fg,
                    [css.media.desktop]: css.mix('sp_xl', 'fj_c', {
                        ' > span': css.mix('sp_h_l', {fontSize: '1rem'}),
                    }),
                    [css.media.tablet]: css.mix('sp_l', 'fj_sa', {' > span': css.mix('hide')}),
                }), {inject: false})}">Mix</div>`));
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
            for (const el of output) {
                expect(el).toBe(['<div class="tf-oupfrh">Mix</div>'].join(''));
            }
        });
    
        it('cid() returns unique prefixed class', () => {
            const css = createCss();
            const id1 = css.cid();
            const id2 = css.cid();
            expect(id1).toMatch(/^tf-/);
            expect(id1).not.toBe(id2);
        });

        it('cid() returns unique prefixed class (1,000 bench)', () => {
            const css = createCss();
            const set = new Set();
            for (let i = 0; i < 1000; i++) set.add(css.cid());
            expect(set.size).toBe(1000);
            for (const el of set.values()) expect(el).toMatch(/^tf-/);
        });
    });
});
