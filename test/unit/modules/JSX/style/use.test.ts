import {describe, it, expect, beforeEach} from 'vitest';
import {createCss, getActiveStyleEngine, setActiveStyleEngine} from '../../../../../lib/modules/JSX/style/use';
import {StyleEngine} from '../../../../../lib/modules/JSX/style/Engine';
import CONSTANTS from '../../../../constants';
import {MARKER} from '../../../../../lib/modules/JSX/style/Style';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import {MockContext} from '../../../../MockContext';

describe('Modules - JSX - style - use', () => {
    let engine: StyleEngine;

    beforeEach(() => {
        engine = new StyleEngine();
        setActiveStyleEngine(engine);
        setActiveCtx(null);
    });

    describe('css', () => {
        let css: ReturnType<typeof createCss>;

        beforeEach(() => {
            css = createCss();
        });

        it('Handles empty object gracefully', () => {
            const cls = css({});
            const html = engine.inject(`${MARKER}<div class="${cls}">Empty</div>`);
            expect(html).toBe(`<div class="${cls}">Empty</div>`);
        });

        it('Handles a non-object rule gracefully', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                const cls = css(el as Record<string, unknown>);
                expect(cls).toBe('');
                const html = engine.inject(`${MARKER}<div class="${cls}">Blank</div>`);
                expect(html).toBe(`<div class="${cls}">Blank</div>`);
            }
        });

        it('Generates deterministic class for flat styles', () => {
            const cls = css({color: 'red', fontSize: '1rem'});
            expect(cls).toMatch(/^tf/);
            const html = engine.inject(`${MARKER}<div class="${cls}">Hello</div>`);
            expect(html).toBe(`<style>.${cls}{color:red;font-size:1rem}</style><div class="${cls}">Hello</div>`);
        });

        it('Ignores null or undefined style values', () => {
            const cls = css({
                color: 'black',
                backgroundColor: null,
                border: undefined,
                padding: '1rem',
            });

            const html = engine.inject(`${MARKER}<div class="${cls}">Sanitized</div>`);
            expect(html).toBe(`<style>.${cls}{color:black;padding:1rem}</style><div class="${cls}">Sanitized</div>`);
        });

        it('Supports :hover and span selectors', () => {
            const cls = css({
                color: 'black',
                ':hover': {color: 'red'},
                ' span': {fontWeight: 'bold'},
                ':hover span': {color: 'blue'},
            });

            const html = engine.inject(`${MARKER}<div class="${cls}">Hover</div>`);
            expect(html).toBe(
                [
                    '<style>',
                    `.${cls}:hover{color:red}`,
                    `.${cls} span{font-weight:bold}`,
                    `.${cls}:hover span{color:blue}`,
                    `.${cls}{color:black}`,
                    '</style>',
                    `<div class="${cls}">Hover</div>`,
                ].join(''),
            );
        });

        it('Supports attribute selectors', () => {
            const cls = css({
                color: 'black',
                '[data-active="true"]': {color: 'red', backgroundColor: 'white'},
                '[data-active="true"]:hover': {fontWeight: 'bold'},
                ' span': {fontWeight: 'bold', flexDirection: 'column'},
                ':hover span': {color: 'blue'},
            });

            const html = engine.inject(`${MARKER}<div class="${cls}">Hover</div>`);
            expect(html).toBe(
                [
                    '<style>',
                    `.${cls}[data-active="true"]{color:red;background-color:white}`,
                    `.${cls}[data-active="true"]:hover{font-weight:bold}`,
                    `.${cls} span{font-weight:bold;flex-direction:column}`,
                    `.${cls}:hover span{color:blue}`,
                    `.${cls}{color:black}`,
                    '</style>',
                    `<div class="${cls}">Hover</div>`,
                ].join(''),
            );
        });

        it('Handles media queries for base and selector rules', () => {
            const cls = css({
                fontSize: '1rem',
                '@media (max-width: 600px)': {
                    fontSize: '0.875rem',
                    ':hover': {fontSize: '0.75rem'},
                },
            });

            const html = engine.inject(`${MARKER}<div class="${cls}">Responsive</div>`);
            expect(html).toBe(
                [
                    '<style>',
                    `.${cls}{font-size:1rem}`,
                    '@media (max-width: 600px){',
                    `.${cls}:hover{font-size:0.75rem}`,
                    `.${cls}{font-size:0.875rem}`,
                    '}',
                    '</style>',
                    `<div class="${cls}">Responsive</div>`,
                ].join(''),
            );
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

            const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
            expect(html).toBe(
                [
                    '<style>',
                    `.${cls}{font-size:1rem}`,
                    '@media (max-width: 600px){',
                    `.${cls}:hover{font-size:0.75rem}`,
                    `.${cls} span{font-weight:bold}`,
                    `.${cls}{font-size:0.5rem}`,
                    '}',
                    '</style>',
                    `<div class="${cls}">Test</div>`,
                ].join(''),
            );
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

            const html = engine.inject(`${MARKER}<div class="${cls}">Hover</div>`);
            expect(html).toBe(
                [
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
                ].join(''),
            );
        });

        it('Deduplicates identical declarations under different selectors', () => {
            const base = {color: 'red'};
            const cls1 = css(base);
            const cls2 = css(base);
            expect(cls1).toBe(cls2);
            const html = engine.inject(`${MARKER}<div class="${cls1} ${cls2}">Hello</div>`);
            expect(html).toBe(`<style>.${cls1}{color:red}</style><div class="${cls1} ${cls2}">Hello</div>`);
        });

        it('Correctly handles background url', () => {
            const cls = css({
                backgroundImage: "url('./foo.jpg')",
            });

            const html = engine.inject(`${MARKER}<div class="${cls}">Images</div>`);
            expect(html).toBe(`<style>.${cls}{background-image:url('./foo.jpg')}</style><div class="${cls}">Images</div>`);
        });

        it('Normalizes CSS functions wrapped in quotes', () => {
            const cls = css({backgroundImage: "'url(/foo.png)'"});
            const html = engine.inject(`${MARKER}<div class="${cls}">BG</div>`);
            expect(html).toBe(`<style>.${cls}{background-image:url(/foo.png)}</style><div class="${cls}">BG</div>`);
        });

        it('Preserves quotes for valid string literals like content', () => {
            const cls = css({content: '"TriFrost"'});
            const html = engine.inject(`${MARKER}<div class="${cls}">Quoted</div>`);
            expect(html).toBe(`<style>.${cls}{content:"TriFrost"}</style><div class="${cls}">Quoted</div>`);
        });

        it('Strips quotes around url() if present', () => {
            const cls = css({backgroundImage: "'url(/bg.png)'"});
            const html = engine.inject(`${MARKER}<div class="${cls}">BG</div>`);
            expect(html).toBe(`<style>.${cls}{background-image:url(/bg.png)}</style><div class="${cls}">BG</div>`);
        });

        it('Strips quotes around calc(...) expressions', () => {
            const cls = css({width: '"calc(100% - 2rem)"'});
            const html = engine.inject(`${MARKER}<div class="${cls}">Layout</div>`);
            expect(html).toBe(`<style>.${cls}{width:calc(100% - 2rem)}</style><div class="${cls}">Layout</div>`);
        });

        it('Strips quotes around var(...) tokens', () => {
            const cls = css({margin: "'var(--space-md)'"});
            const html = engine.inject(`${MARKER}<div class="${cls}">Token</div>`);
            expect(html).toBe(`<style>.${cls}{margin:var(--space-md)}</style><div class="${cls}">Token</div>`);
        });

        it('Strips quotes around nested functions like filter()', () => {
            const cls = css({filter: "'blur(5px)'"});
            const html = engine.inject(`${MARKER}<div class="${cls}">Filter</div>`);
            expect(html).toBe(`<style>.${cls}{filter:blur(5px)}</style><div class="${cls}">Filter</div>`);
        });

        it('Leaves other string literals untouched', () => {
            const cls = css({fontFamily: '"Helvetica, sans-serif"'});
            const html = engine.inject(`${MARKER}<div class="${cls}">Font</div>`);
            expect(html).toBe(`<style>.${cls}{font-family:"Helvetica, sans-serif"}</style><div class="${cls}">Font</div>`);
        });

        it('Returns the same class for identical rule strings', () => {
            const cls1 = css({fontWeight: 'bold'});
            const cls2 = css({fontWeight: 'bold'});
            expect(cls1).toBe(cls2);
        });

        it('Returns class but does not inject when inject: false', () => {
            const cls = css({color: 'green'}, {inject: false});
            expect(cls).toMatch(/^tf/);
            const html = engine.inject(`${MARKER}<div class="${cls}">Nothing</div>`);
            expect(html).toBe(`<div class="${cls}">Nothing</div>`);
        });

        describe('Modules - JSX - style - selectors', () => {
            it('Supports :nth-child(n)', () => {
                const cls = css({[css.nthChild(2)]: {fontWeight: 'bold'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:nth-child(2){font-weight:bold}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :nth-last-child(n)', () => {
                const cls = css({
                    [css.nthLastChild(1)]: {
                        color: 'blue',
                    },
                });
                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:nth-last-child(1){color:blue}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :nth-of-type(n)', () => {
                const cls = css({
                    [css.nthOfType('3n+1')]: {
                        fontStyle: 'italic',
                    },
                });
                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:nth-of-type(3n+1){font-style:italic}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :nth-last-of-type', () => {
                const cls = css({
                    [css.nthLastOfType(2)]: {
                        borderBottom: '1px solid gray',
                    },
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:nth-last-of-type(2){border-bottom:1px solid gray}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :not(selector)', () => {
                const cls = css({
                    [css.not(':last-child')]: {
                        marginBottom: '1rem',
                    },
                });
                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:not(:last-child){margin-bottom:1rem}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :is(selector)', () => {
                const cls = css({
                    [css.is('a, button')]: {
                        cursor: 'pointer',
                    },
                });
                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:is(a, button){cursor:pointer}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :where(...)', () => {
                const cls = css({
                    [css.where('section, article')]: {
                        lineHeight: 1.5,
                    },
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:where(section, article){line-height:1.5}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :has(selector)', () => {
                const cls = css({
                    [css.has('img')]: {
                        display: 'flex',
                    },
                });
                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
                expect(html).toBe(`<style>.${cls}:has(img){display:flex}</style><div class="${cls}">Test</div>`);
            });

            it('Supports :dir(ltr)', () => {
                const cls = css({
                    [css.dir('ltr')]: {
                        paddingLeft: '1rem',
                    },
                });
                const html = engine.inject(`${MARKER}<div class="${cls}">Test</div>`);
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

                const html = engine.inject(`${MARKER}<div class="${cls}">Media</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls}{font-size:1rem}`,
                        '@media (min-width: 601px) and (max-width: 1199px){',
                        `.${cls}:nth-child(2){font-size:0.75rem}`,
                        `.${cls}:not(:last-child){margin-bottom:0.5rem}`,
                        '}',
                        '</style>',
                        '<div class="tf1ng9lfv">Media</div>',
                    ].join(''),
                );
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

                const html = engine.inject(`${MARKER}<div class="${cls}">Nested</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls}{font-size:1rem}`,
                        '@media (max-width: 600px){',
                        `.${cls}:nth-child(3):where(span, strong){color:tomato}`,
                        '}',
                        '</style>',
                        `<div class="${cls}">Nested</div>`,
                    ].join(''),
                );
            });

            describe('root', () => {
                it('Injects nada if passed a non/empty object', () => {
                    for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                        css.root(el as Record<string, unknown>);

                        const html = engine.inject(`${MARKER}<div>Root Vars</div>`);
                        expect(html).toBe('<div>Root Vars</div>');
                    }
                });

                it('Creates a new engine if no active engine', () => {
                    setActiveStyleEngine(null);
                    css.root({
                        '--color-primary': 'blue',
                        '--spacing': '1rem',
                    });

                    const html = getActiveStyleEngine()!.inject(`${MARKER}<div>Root Vars</div>`);
                    expect(html).toBe('<style>:root{--color-primary:blue;--spacing:1rem}</style><div>Root Vars</div>');
                });

                it('Injects simple CSS variables under :root', () => {
                    css.root({
                        '--color-primary': 'blue',
                        '--spacing': '1rem',
                    });

                    const html = engine.inject(`${MARKER}<div>Root Vars</div>`);
                    expect(html).toBe(
                        ['<style>', ':root{--color-primary:blue;--spacing:1rem}', '</style>', '<div>Root Vars</div>'].join(''),
                    );
                });

                it('Supports media queries with root-level variables', () => {
                    css.root({
                        '--color': 'black',
                        [css.media.dark]: {
                            '--color': 'white',
                        },
                    });

                    const html = engine.inject(`${MARKER}<div>Media Root</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            ':root{--color:black}',
                            '@media (prefers-color-scheme: dark){:root{--color:white}}',
                            '</style>',
                            '<div>Media Root</div>',
                        ].join(''),
                    );
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

                    const html = engine.inject(`${MARKER}<div>Media Root</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            ':root[data-enabled]{opacity:1}',
                            ':root{--color:black}',
                            '@media (prefers-color-scheme: dark){',
                            ':root[data-enabled]{opacity:.5}',
                            ':root{--color:white}',
                            '}',
                            '</style>',
                            '<div>Media Root</div>',
                        ].join(''),
                    );
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

                    const html = engine.inject(`${MARKER}<div>Nested Root</div>`);
                    expect(html).toBe(
                        [
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
                        ].join(''),
                    );
                });
            });

            describe('combinations', () => {
                it(':not() and :nth-child()', () => {
                    const cls = css({
                        [css.not(css.nthChild(1))]: {opacity: 0.75},
                    });
                    const html = engine.inject(`${MARKER}<div class="${cls}">List</div>`);
                    expect(html).toBe(`<style>.${cls}:not(:nth-child(1)){opacity:0.75}</style><div class="${cls}">List</div>`);
                });

                it('Uses :is() inside :not()', () => {
                    const cls = css({
                        [css.not(css.is('a, button'))]: {color: 'gray'},
                    });
                    const html = engine.inject(`${MARKER}<div class="${cls}">Filtered</div>`);
                    expect(html).toBe(`<style>.${cls}:not(:is(a, button)){color:gray}</style><div class="${cls}">Filtered</div>`);
                });

                it('Uses :where() with :nth-last-child()', () => {
                    const cls = css({
                        [css.where(css.nthLastChild(2))]: {paddingBottom: '0.5rem'},
                    });
                    const html = engine.inject(`${MARKER}<div class="${cls}">Scoped</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            `.${cls}:where(:nth-last-child(2)){padding-bottom:0.5rem}`,
                            '</style>',
                            `<div class="${cls}">Scoped</div>`,
                        ].join(''),
                    );
                });

                it('Has support for lastOfType, firstOfType', () => {
                    const cls = css({
                        [` div${css.firstOfType}`]: {paddingTop: '0.5rem'},
                        [` div${css.lastOfType}`]: {paddingBottom: '0.5rem'},
                    });
                    const html = engine.inject(`${MARKER}<div class="${cls}">Scoped</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            `.${cls} div:first-of-type{padding-top:0.5rem}`,
                            `.${cls} div:last-of-type{padding-bottom:0.5rem}`,
                            '</style>',
                            `<div class="${cls}">Scoped</div>`,
                        ].join(''),
                    );
                });

                it('Uses :dir() with media query', () => {
                    const cls = css({
                        [css.media.tabletOnly]: {
                            [css.dir('rtl')]: {textAlign: 'right'},
                        },
                    });
                    const html = engine.inject(`${MARKER}<div class="${cls}">RTL</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            '@media (min-width: 601px) and (max-width: 1199px){',
                            `.${cls}:dir(rtl){text-align:right}`,
                            '}',
                            '</style>',
                            `<div class="${cls}">RTL</div>`,
                        ].join(''),
                    );
                });

                it(':nth-child() with :dir()', () => {
                    const cls = css({
                        [css.nthChild(3)]: {
                            [css.dir('ltr')]: {marginLeft: '1rem'},
                        },
                    });
                    const html = engine.inject(`${MARKER}<div class="${cls}">Nested</div>`);
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
                    const html = engine.inject(`${MARKER}<div class="${cls}">Combo</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            '@media (max-width: 600px){',
                            `.${cls}:not(:is(:last-child)):where(span, b){color:red}`,
                            '}',
                            '</style>',
                            `<div class="${cls}">Combo</div>`,
                        ].join(''),
                    );
                });

                it('Supports pseudo-classes and pseudo-elements', () => {
                    const cls = css({
                        color: 'black',
                        [css.hover]: {color: 'red'},
                        [css.focus]: {outline: '2px solid blue'},
                        [css.before]: {content: '">>"'},
                        [css.after]: {content: '"<<"'},
                    });

                    const html = engine.inject(`${MARKER}<div class="${cls}">Fancy</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            `.${cls}:hover{color:red}`,
                            `.${cls}:focus{outline:2px solid blue}`,
                            `.${cls}::before{content:">>"}`,
                            `.${cls}::after{content:"<<"}`,
                            `.${cls}{color:black}`,
                            '</style>',
                            `<div class="${cls}">Fancy</div>`,
                        ].join(''),
                    );
                });

                it('Supports pseudo-classes inside media queries', () => {
                    const cls = css({
                        color: 'black',
                        [css.media.tablet]: {
                            [css.hover]: {color: 'green'},
                            [css.focus]: {color: 'blue'},
                        },
                    });

                    const html = engine.inject(`${MARKER}<div class="${cls}">Responsive</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            `.${cls}{color:black}`,
                            '@media (max-width: 1199px){',
                            `.${cls}:hover{color:green}`,
                            `.${cls}:focus{color:blue}`,
                            '}',
                            '</style>',
                            `<div class="${cls}">Responsive</div>`,
                        ].join(''),
                    );
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

                    const html = engine.inject(`${MARKER}<div class="${cls}">Theme</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            `.${cls}[data-theme="light"]{color:black}`,
                            '@media (prefers-color-scheme: dark){',
                            `.${cls}[data-theme="light"]:hover{color:white}`,
                            '}',
                            '</style>',
                            `<div class="${cls}">Theme</div>`,
                        ].join(''),
                    );
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

                    const html = engine.inject(`${MARKER}<div class="${cls}">Multimedia</div>`);
                    expect(html).toBe(
                        [
                            '<style>',
                            `.${cls}{font-size:1rem;padding:1rem;background-color:white}`,
                            `@media (prefers-color-scheme: dark){.${cls}{background-color:black;color:white}}`,
                            `@media (prefers-color-scheme: light){.${cls}{background-color:white;color:black}}`,
                            `@media (max-width: 1199px){.${cls}{font-size:0.9rem;padding:0.75rem}}`,
                            `@media (min-width: 1200px){.${cls}{font-size:1.2rem;padding:1.5rem}}`,
                            '</style>',
                            `<div class="${cls}">Multimedia</div>`,
                        ].join(''),
                    );
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

            const html = engine.inject(`${MARKER}<div>Vars</div>`);
            expect(html).toBe(['<style>', ':root{--v-spacing_m:1rem;--v-radius_l:8px}', '</style>', '<div>Vars</div>'].join(''));
        });

        it('Does not prefix root-level CSS vars if they start with --', () => {
            const css = createCss({
                var: {
                    spacing_m: '1rem',
                    radius_l: '8px',
                    '--someLib-spacing': '2rem',
                    '--someLib--radius': '16px',
                },
                theme: {},
                reset: false,
            });

            css.root();

            const html = engine.inject(`${MARKER}<div>Vars</div>`);
            expect(html).toBe(
                [
                    '<style>',
                    ':root{--v-spacing_m:1rem;--v-radius_l:8px;--someLib-spacing:2rem;--someLib--radius:16px}',
                    '</style>',
                    '<div>Vars</div>',
                ].join(''),
            );
        });

        it('Throws when an invalid theme var is provided', () => {
            expect(() =>
                createCss({
                    var: {},
                    theme: {
                        /* @ts-expect-error this is what we're testing */
                        bg: null,
                        text: {light: '#111', dark: '#eee'},
                    },
                    reset: false,
                }),
            ).toThrowError(/Theme token 'bg' is invalid, must either be a string or define both 'light' and 'dark' values/);
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

            const html = engine.inject(`${MARKER}<div>Theme</div>`);
            expect(html).toBe(
                [
                    '<style>',
                    '@media (prefers-color-scheme: light){:root{--t-bg:#fff;--t-text:#111}}',
                    '@media (prefers-color-scheme: dark){:root{--t-bg:#000;--t-text:#eee}}',
                    '</style>',
                    '<div>Theme</div>',
                ].join(''),
            );
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

            const html = engine.inject(`${MARKER}<div>Attr Theme</div>`);
            expect(html).toBe(
                [
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
                ].join(''),
            );
        });

        it('Does not prefix theme var names if they start with --', () => {
            const css = createCss({
                var: {},
                theme: {
                    color: {light: '#ccc', dark: '#333'},
                    '--someLib-fg': {light: '#ccc', dark: '#333'},
                },
                reset: false,
                themeAttribute: true,
            });

            css.root();

            const html = engine.inject(`${MARKER}<div>Attr Theme</div>`);
            expect(html).toBe(
                [
                    '<style>',
                    '@media (prefers-color-scheme: light){',
                    ':root[data-theme="dark"]{--t-color:#333;--someLib-fg:#333}',
                    ':root{--t-color:#ccc;--someLib-fg:#ccc}',
                    '}',
                    '@media (prefers-color-scheme: dark){',
                    ':root[data-theme="light"]{--t-color:#ccc;--someLib-fg:#ccc}',
                    ':root{--t-color:#333;--someLib-fg:#333}',
                    '}',
                    '</style>',
                    '<div>Attr Theme</div>',
                ].join(''),
            );
        });

        it('Supports custom theme attribute names', () => {
            const css = createCss({
                var: {},
                theme: {border: {light: 'gray', dark: 'white'}},
                reset: false,
                themeAttribute: 'data-mode',
            });

            css.root();

            const html = engine.inject(`${MARKER}<div>Mode Theme</div>`);
            expect(html).toBe(
                [
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
                ].join(''),
            );
        });

        it('Injects reset styles when reset is true', () => {
            const css = createCss({
                var: {},
                theme: {},
                reset: true,
            });

            css.root();

            expect(engine.inject(`${MARKER}<div>Reset</div>`)).toBe(
                [
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
                ].join(''),
            );
        });

        it('Does not inject reset styles when reset is false', () => {
            const css = createCss({
                var: {},
                theme: {},
                reset: false,
            });

            css.root();

            expect(engine.inject(`${MARKER}<div>No Reset</div>`)).toBe('<div>No Reset</div>');
        });

        it('Disables root() injection if mount path is set', () => {
            const css = createCss({
                var: {size: '1rem'},
                theme: {bg: '#fff'},
                reset: true,
            });

            css.setMountPath('/styles.css');

            css.root(); /* this should NOT inject */

            const html = engine!.inject(`${MARKER}<div>Hello</div>`);
            expect(html).toBe('<div>Hello</div>');
        });

        it('Disables root() injection BUT only renders provided css', () => {
            const css = createCss({var: {}, theme: {}, reset: false});

            css.setMountPath('/styles.css');
            css.root(); /* this should not inject */

            const cls = css({
                '[data-active="true"]': {backgroundColor: 'red'},
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">OnlyAttr</div>`)).toBe(
                ['<style>', `.${cls}[data-active="true"]{background-color:red}`, '</style>', `<div class="${cls}">OnlyAttr</div>`].join(''),
            );
        });

        it('Disables root() injection BUT only renders provided css AND injects link if html is detected', () => {
            const css = createCss({var: {}, theme: {}, reset: false});

            css.setMountPath('/styles.css');
            css.root(); /* this should not inject */

            const cls = css({
                '[data-active="true"]': {backgroundColor: 'red'},
            });

            expect(engine.inject(`<html>${MARKER}<div class="${cls}">OnlyAttr</div></html>`)).toBe(
                [
                    '<html>',
                    '<link rel="stylesheet" href="/styles.css">',
                    '<style>',
                    `.${cls}[data-active="true"]{background-color:red}`,
                    '</style>',
                    `<div class="${cls}">OnlyAttr</div>`,
                    '</html>',
                ].join(''),
            );
        });

        it('Injects <link> for mount_path with nonce in full document', () => {
            setActiveCtx(new MockContext({nonce: 'abc123'}));

            const css = createCss({var: {}, theme: {}, reset: false});
            css.setMountPath('/styles.css');
            css.root(); /* this should not inject */

            const cls = css({
                '[data-active="true"]': {backgroundColor: 'red'},
            });

            expect(engine.inject(`<html>${MARKER}<div class="${cls}">OnlyAttr</div></html>`)).toBe(
                [
                    '<html>',
                    '<link rel="stylesheet" nonce="abc123" href="/styles.css">',
                    '<style nonce="abc123">',
                    `.${cls}[data-active="true"]{background-color:red}`,
                    '</style>',
                    `<div class="${cls}">OnlyAttr</div>`,
                    '</html>',
                ].join(''),
            );
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

            expect(engine.inject(`${MARKER}<div>Once</div>`)).toBe(
                [
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
                ].join(''),
            );
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

            expect(engine.inject(`${MARKER}<div>Multiple</div>`)).toBe(
                [
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
                ].join(''),
            );
        });

        it('Produces same class name for identical style objects across instances', () => {
            const style = {color: 'red', padding: '1rem'};

            const css1 = createCss({var: {}, theme: {}, reset: false});
            const css2 = createCss({var: {}, theme: {}, reset: false});

            const cls1 = css1(style);
            const cls2 = css2(style);

            expect(cls1).toBe(cls2);

            const html = engine.inject(`${MARKER}<div class="${cls1}">Test</div>`);
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

            expect(engine.inject(`${MARKER}<div class="${cls}">Deep</div>`)).toBe(
                [
                    '<style>',
                    `.${cls} [data-role="admin"]{background-color:gray}`,
                    `.${cls}{color:black}`,
                    '@media (max-width: 600px){',
                    `.${cls} [data-role="admin"]{color:blue}`,
                    '}',
                    '</style>',
                    `<div class="${cls}">Deep</div>`,
                ].join(''),
            );
        });

        it('Handles top-level attribute-only selectors', () => {
            const css = createCss({var: {}, theme: {}, reset: false});

            const cls = css({
                '[data-active="true"]': {backgroundColor: 'red'},
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">OnlyAttr</div>`)).toBe(
                ['<style>', `.${cls}[data-active="true"]{background-color:red}`, '</style>', `<div class="${cls}">OnlyAttr</div>`].join(''),
            );
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

            expect(engine.inject(`${MARKER}<div>Global</div>`)).toBe(
                [
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
                ].join(''),
            );
        });

        it('Applies defined var() and theme() references inside css styles', () => {
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

            const html = engine.inject(`${MARKER}<div class="${cls}">Vars in Use</div>`);

            expect(html).toBe(
                [
                    '<style>',
                    '.tfje8nhj{background-color:var(--t-bg);color:var(--t-fg);padding:var(--v-spacing_m);border-radius:var(--v-radius_s)}',
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
                    '<div class="tfje8nhj">Vars in Use</div>',
                ].join(''),
            );
        });

        it('Has $t and $v aliases for theme and var', () => {
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

            const html = engine.inject(`${MARKER}<div class="${cls}">Vars in Use</div>`);

            expect(html).toBe(
                [
                    '<style>',
                    '.tfje8nhj{background-color:var(--t-bg);color:var(--t-fg);padding:var(--v-spacing_m);border-radius:var(--v-radius_s)}',
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
                    '<div class="tfje8nhj">Vars in Use</div>',
                ].join(''),
            );
        });

        it('Allows the use of string-only theme tokens', () => {
            const css = createCss({
                theme: {
                    bg: '#fff',
                    fg: '#000',
                },
            });
            css.root();
            expect(engine.inject(`${MARKER}<div>Theme</div>`)).toBe('<style>:root{--t-bg:#fff;--t-fg:#000}</style><div>Theme</div>');
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
            expect(engine.inject(`${MARKER}<div>Theme</div>`)).toBe(
                [
                    '<style>',
                    ':root{--t-bg:#fff;--t-fg:#000}',
                    '@media (prefers-color-scheme: light){:root{--t-alt:#f9f9f9}}',
                    '@media (prefers-color-scheme: dark){:root{--t-alt:#333}}',
                    '</style>',
                    '<div>Theme</div>',
                ].join(''),
            );
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
            expect(engine.inject(`${MARKER}<div class="${cls}">Defined</div>`)).toBe(
                [
                    '<style>',
                    ':root{',
                    '--v-spacing:2rem;',
                    '--t-bg:#fff;',
                    '--t-fg:#222',
                    '}',
                    '.tf1c79mh8{display:flex;align-items:center;color:var(--t-fg);background:var(--t-bg);padding:var(--v-spacing)}',
                    '</style>',
                    '<div class="tf1c79mh8">Defined</div>',
                ].join(''),
            );
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

        it('mix() deeply merges nested style objects like media queries', () => {
            const css = createCss({
                breakpoints: {
                    mobile: '@media (max-width: 600px)',
                },
                definitions: mod => ({
                    base: {
                        padding: '1rem',
                        [mod.media.mobile]: {
                            padding: '.5rem',
                            color: 'black',
                        },
                    },
                }),
            });

            const mixed = css.mix('base', {
                [css.media.mobile]: {
                    color: 'red',
                },
            });

            expect(mixed).toEqual({
                padding: '1rem',
                [css.media.mobile]: {
                    padding: '.5rem',
                    color: 'red',
                },
            });
        });

        it('mix() merges inline styles and registered definitions correctly', () => {
            const css = createCss({
                var: {pad: '2rem'},
                definitions: () => ({
                    card: {
                        background: 'white',
                        borderRadius: '8px',
                    },
                }),
            });

            const mixed = css.mix('card', {
                padding: css.var.pad,
                borderRadius: '12px',
            });

            expect(mixed).toEqual({
                background: 'white',
                borderRadius: '12px',
                padding: 'var(--v-pad)',
            });
        });

        it('mix() union-merges multiple objects without losing any keys', () => {
            const css = createCss();

            const mixed = css.mix({color: 'blue', fontSize: '1rem'}, {background: 'red'}, {color: 'green'});

            expect(mixed).toEqual({
                color: 'green',
                fontSize: '1rem',
                background: 'red',
            });
        });

        it('mix() skips string keys not found in definitions', () => {
            const css = createCss({
                definitions: () => ({
                    good: {display: 'block'},
                }),
            });

            /* @ts-expect-error Should be good */
            const mixed = css.mix('good', 'bad', {opacity: 0.5});
            expect(mixed).toEqual({
                display: 'block',
                opacity: 0.5,
            });
        });

        it('mix() skips falsy values like null, undefined, false', () => {
            const css = createCss({
                definitions: () => ({
                    base: {padding: '1rem'},
                    hidden: {display: 'none'},
                }),
            });

            const mixed = css.mix('base', null, undefined, false, 'hidden');
            expect(mixed).toEqual({
                padding: '1rem',
                display: 'none',
            });
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
            expect(cls).toMatch(/^tf/);
            expect(engine.inject(`${MARKER}<div class="${cls}">Mix</div>`)).toBe(
                [
                    '<style>',
                    '.tf1ozn3bl{display:flex;flex-direction:row;justify-content:center;align-items:center;gap:var(--v-x)}',
                    '</style>',
                    '<div class="tf1ozn3bl">Mix</div>',
                ].join(''),
            );
        });

        it('use() skips falsy values like null, undefined, false', () => {
            const css = createCss({
                definitions: () => ({
                    base: {display: 'block'},
                    active: {color: 'blue'},
                }),
            });

            const cls = css.use('base', null, undefined, false, 'active');
            expect(cls).toMatch(/^tf/);

            const html = engine.inject(`${MARKER}<div class="${cls}">Falsy</div>`);
            expect(html).toBe(['<style>', `.${cls}{display:block;color:blue}`, '</style>', `<div class="${cls}">Falsy</div>`].join(''));
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

            expect(cls).toMatch(/^tf/);
            expect(engine.inject(`${MARKER}<div class="${cls}">Mix</div>`)).toBe(
                [
                    '<style>',
                    '.tf1bdiex9{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                    '@media (min-width: 1200px){',
                    '.tf1bdiex9 > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                    '.tf1bdiex9{padding:var(--v-space_xl);justify-content:center}',
                    '}',
                    '@media (max-width: 1199px){',
                    '.tf1bdiex9 > span{display:none}',
                    '.tf1bdiex9{padding:var(--v-space_l);justify-content:space-around}',
                    '}',
                    '</style>',
                    '<div class="tf1bdiex9">Mix</div>',
                ].join(''),
            );
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
                /* @ts-expect-error this is what we're testing */
                [css.media.tablet]: css.mix('sp_l', 'fj_sa', {' > span': css.mix('hode')}),
            });

            expect(cls).toMatch(/^tf/);
            expect(engine.inject(`${MARKER}<div class="${cls}">Mix</div>`)).toBe(
                [
                    '<style>',
                    '.tf1gwdlxj{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                    '@media (min-width: 1200px){',
                    '.tf1gwdlxj > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                    '.tf1gwdlxj{padding:var(--v-space_xl);justify-content:center}',
                    '}',
                    '@media (max-width: 1199px){',
                    // '.tf1gwdlxj > span{display:none}',
                    '.tf1gwdlxj{padding:var(--v-space_l);justify-content:space-around}',
                    '}',
                    '</style>',
                    '<div class="tf1gwdlxj">Mix</div>',
                ].join(''),
            );
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

            expect(cls).toMatch(/^tf/);
            expect(getActiveStyleEngine()!.inject(`${MARKER}<div class="${cls}">Mix</div>`)).toBe(
                [
                    '<style>',
                    '.tfhev09x{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                    '@media (min-width: 1200px){',
                    '.tfhev09x > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                    '.tfhev09x{padding:var(--v-space_xl);justify-content:center}',
                    '}',
                    '@media (max-width: 1199px){',
                    '.tfhev09x{padding:var(--v-space_l);justify-content:space-around}',
                    '}',
                    '</style>',
                    '<div class="tfhev09x">Mix</div>',
                ].join(''),
            );
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

            const output: string[] = [];
            const start = Date.now();
            for (let i = 0; i < 1_000; i++) {
                setActiveStyleEngine(new StyleEngine());
                output.push(
                    getActiveStyleEngine()!.inject(
                        `${MARKER}<div class="${css.use('f', 'fh', 'fa_c', 'oh', {
                            width: '100%',
                            background: css.$t.bg,
                            color: css.$t.fg,
                            [css.media.desktop]: css.mix('sp_xl', 'fj_c', {
                                ' > span': css.mix('sp_h_l', {fontSize: '1rem'}),
                            }),
                            [css.media.tablet]: css.mix('sp_l', 'fj_sa', {' > span': css.mix('hide')}),
                        })}">Mix</div>`,
                    ),
                );
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
            for (const el of output) {
                expect(el).toBe(
                    [
                        '<style>',
                        '.tf1bdiex9{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                        '@media (min-width: 1200px){',
                        '.tf1bdiex9 > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                        '.tf1bdiex9{padding:var(--v-space_xl);justify-content:center}',
                        '}',
                        '@media (max-width: 1199px){',
                        '.tf1bdiex9 > span{display:none}',
                        '.tf1bdiex9{padding:var(--v-space_l);justify-content:space-around}',
                        '}',
                        '</style>',
                        '<div class="tf1bdiex9">Mix</div>',
                    ].join(''),
                );
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

            const output: string[] = [];
            const start = Date.now();
            for (let i = 0; i < 1_000; i++) {
                setActiveStyleEngine(new StyleEngine());
                output.push(
                    getActiveStyleEngine()!.inject(
                        `${MARKER}<div class="${css(
                            css.mix('f', 'fh', 'fa_c', 'oh', {
                                width: '100%',
                                background: css.$t.bg,
                                color: css.$t.fg,
                                [css.media.desktop]: css.mix('sp_xl', 'fj_c', {
                                    ' > span': css.mix('sp_h_l', {fontSize: '1rem'}),
                                }),
                                [css.media.tablet]: css.mix('sp_l', 'fj_sa', {' > span': css.mix('hide')}),
                            }),
                            {inject: false},
                        )}">Mix</div>`,
                    ),
                );
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
            for (const el of output) {
                expect(el).toBe(['<div class="tf1bdiex9">Mix</div>'].join(''));
            }
        });

        it('cid() returns unique prefixed class', () => {
            const css = createCss();
            const id1 = css.cid();
            const id2 = css.cid();
            expect(id1).toMatch(/^tf/);
            expect(id1).not.toBe(id2);
        });

        it('cid() returns unique prefixed class (1,000 bench)', () => {
            const css = createCss();
            const set = new Set();
            for (let i = 0; i < 1000; i++) set.add(css.cid());
            expect(set.size).toBe(1000);
            for (const el of set.values()) expect(el).toMatch(/^tf/);
        });

        describe('breakpoints', () => {
            it('Allows replacing default breakpoints with custom ones while keeping fixed media queries', () => {
                const css = createCss({
                    breakpoints: {
                        sm: '@media (max-width: 640px)',
                        md: '@media (max-width: 768px)',
                        lg: '@media (max-width: 1024px)',
                        xl: '@media (max-width: 1280px)',
                    },
                });

                expect(css.media.sm).toBe('@media (max-width: 640px)');
                expect(css.media.md).toBe('@media (max-width: 768px)');
                expect(css.media.lg).toBe('@media (max-width: 1024px)');
                expect(css.media.xl).toBe('@media (max-width: 1280px)');

                /* Ensure fixed queries are still present */
                expect(css.media.dark).toBe('@media (prefers-color-scheme: dark)');
                expect(css.media.light).toBe('@media (prefers-color-scheme: light)');
                expect(css.media.reducedMotion).toBe('@media (prefers-reduced-motion: reduce)');
                expect(css.media.hover).toBe('@media (hover: hover)');
                expect(css.media.touch).toBe('@media (hover: none)');
            });

            it('Supports using custom breakpoints in style declarations', () => {
                const css = createCss({
                    breakpoints: {
                        sm: '@media (max-width: 640px)',
                        md: '@media (max-width: 768px)',
                    },
                });

                const cls = css({
                    color: 'black',
                    [css.media.sm]: {
                        color: 'red',
                    },
                    [css.media.md]: {
                        color: 'blue',
                    },
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Custom Breakpoints</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls}{color:black}`,
                        '@media (max-width: 640px){',
                        `.${cls}{color:red}`,
                        '}',
                        '@media (max-width: 768px){',
                        `.${cls}{color:blue}`,
                        '}',
                        '</style>',
                        `<div class="${cls}">Custom Breakpoints</div>`,
                    ].join(''),
                );
            });

            it('Keeps default breakpoints when no custom breakpoints are provided', () => {
                const css = createCss();

                expect(css.media.mobile).toBe('@media (max-width: 600px)');
                expect(css.media.tablet).toBe('@media (max-width: 1199px)');
                expect(css.media.tabletOnly).toBe('@media (min-width: 601px) and (max-width: 1199px)');
                expect(css.media.desktop).toBe('@media (min-width: 1200px)');

                /* Fixed ones still present */
                expect(css.media.dark).toBe('@media (prefers-color-scheme: dark)');
            });
        });

        describe('selector normalization', () => {
            let css: ReturnType<typeof createCss>;

            beforeEach(() => {
                css = createCss();
            });

            it('handles simple tag selectors', () => {
                const cls = css({
                    h1: {fontSize: '2rem'},
                    section: {padding: '1rem'},
                    footer: {marginTop: '2rem'},
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Tags</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls} h1{font-size:2rem}`,
                        `.${cls} section{padding:1rem}`,
                        `.${cls} footer{margin-top:2rem}`,
                        '</style>',
                        `<div class="${cls}">Tags</div>`,
                    ].join(''),
                );
            });

            it('handles nested tag selectors', () => {
                const cls = css({
                    section: {
                        h2: {fontWeight: 'bold'},
                        p: {lineHeight: 1.4},
                    },
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Nested Tags</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls} section h2{font-weight:bold}`,
                        `.${cls} section p{line-height:1.4}`,
                        '</style>',
                        `<div class="${cls}">Nested Tags</div>`,
                    ].join(''),
                );
            });

            it('handles combinators with tag selectors', () => {
                const cls = css({
                    '> h1': {fontSize: '3rem'},
                    '+ p': {marginTop: '1rem'},
                    '~ ul': {listStyle: 'circle'},
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Combinators</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls} > h1{font-size:3rem}`,
                        `.${cls} + p{margin-top:1rem}`,
                        `.${cls} ~ ul{list-style:circle}`,
                        '</style>',
                        `<div class="${cls}">Combinators</div>`,
                    ].join(''),
                );
            });

            it('handles combinators with nested tag selectors', () => {
                const cls = css({
                    '>': {
                        section: {
                            h2: {fontWeight: 'bold'},
                            p: {lineHeight: 1.4},
                        },
                    },
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Nested Tags</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls} > section h2{font-weight:bold}`,
                        `.${cls} > section p{line-height:1.4}`,
                        '</style>',
                        `<div class="${cls}">Nested Tags</div>`,
                    ].join(''),
                );
            });

            it('combines known tags with pseudo classes', () => {
                const cls = css({
                    a: {
                        textDecoration: 'none',
                        [css.hover]: {
                            textDecoration: 'underline',
                        },
                    },
                });

                const html = engine.inject(`${MARKER}<div class="${cls}">Pseudo Tags</div>`);
                expect(html).toBe(
                    [
                        '<style>',
                        `.${cls} a:hover{text-decoration:underline}`,
                        `.${cls} a{text-decoration:none}`,
                        '</style>',
                        `<div class="${cls}">Pseudo Tags</div>`,
                    ].join(''),
                );
            });

            it('auto-spaces HTML tag + pseudo class selectors', () => {
                const cls = css({'div:hover': {opacity: 0.5}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Hover</div>`);
                expect(html).toBe(['<style>', `.${cls} div:hover{opacity:0.5}`, '</style>', `<div class="${cls}">Hover</div>`].join(''));
            });

            it('auto-spaces HTML tag + class selector', () => {
                const cls = css({'ul.list': {listStyle: 'disc'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">List</div>`);
                expect(html).toBe(['<style>', `.${cls} ul.list{list-style:disc}`, '</style>', `<div class="${cls}">List</div>`].join(''));
            });

            it('auto-spaces HTML tag + attribute selector', () => {
                const cls = css({'a[href]': {textDecoration: 'underline'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Attr</div>`);
                expect(html).toBe(
                    ['<style>', `.${cls} a[href]{text-decoration:underline}`, '</style>', `<div class="${cls}">Attr</div>`].join(''),
                );
            });

            it('auto-spaces HTML tag + space selector', () => {
                const cls = css({'nav a': {color: 'blue'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Nested</div>`);
                expect(html).toBe(['<style>', `.${cls} nav a{color:blue}`, '</style>', `<div class="${cls}">Nested</div>`].join(''));
            });

            it('does NOT auto-space #id when used alone', () => {
                const cls = css({'#main': {display: 'grid'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">ID</div>`);
                expect(html).toContain(`.${cls}#main{display:grid}`);
                expect(html).toBe(['<style>', `.${cls}#main{display:grid}`, '</style>', `<div class="${cls}">ID</div>`].join(''));
            });

            it('does NOT auto-space .class when used alone', () => {
                const cls = css({'.box': {border: '1px solid'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Class</div>`);
                expect(html).toBe(['<style>', `.${cls}.box{border:1px solid}`, '</style>', `<div class="${cls}">Class</div>`].join(''));
            });

            it('does NOT falsely match similar-looking non-tag selectors', () => {
                const cls = css({inputy: {border: 'none'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Not Tag</div>`);
                expect(html).toBe(['<style>', `.${cls}inputy{border:none}`, '</style>', `<div class="${cls}">Not Tag</div>`].join(''));
            });

            it('auto-spaces combinator >', () => {
                const cls = css({'> p': {lineHeight: 1.2}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Combinator</div>`);
                expect(html).toBe(['<style>', `.${cls} > p{line-height:1.2}`, '</style>', `<div class="${cls}">Combinator</div>`].join(''));
            });

            it('auto-spaces combinator +', () => {
                const cls = css({'+ p': {marginTop: '1rem'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Combinator</div>`);
                expect(html).toBe(['<style>', `.${cls} + p{margin-top:1rem}`, '</style>', `<div class="${cls}">Combinator</div>`].join(''));
            });

            it('auto-spaces combinator ~', () => {
                const cls = css({'~ ul': {marginTop: '2rem'}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Combinator</div>`);
                expect(html).toBe(
                    ['<style>', `.${cls} ~ ul{margin-top:2rem}`, '</style>', `<div class="${cls}">Combinator</div>`].join(''),
                );
            });

            it('auto-spaces wildcard *', () => {
                const cls = css({div: {[`*${css.is('h1', 'h2')}`]: {marginTop: '2rem'}}});
                const html = engine.inject(`${MARKER}<div class="${cls}">Combinator</div>`);
                expect(html).toBe(
                    ['<style>', `.${cls} div *:is(h1, h2){margin-top:2rem}`, '</style>', `<div class="${cls}">Combinator</div>`].join(''),
                );
            });
        });

        describe('css.is', () => {
            let css: ReturnType<typeof createCss>;

            beforeEach(() => {
                css = createCss();
            });

            it('handles multiple arguments cleanly', () => {
                const selector = css.is('h1', 'h2', 'h3');
                expect(selector).toBe(':is(h1, h2, h3)');
            });

            it('trims and splits comma-joined strings', () => {
                const selector = css.is('h1, h2', 'h3');
                expect(selector).toBe(':is(h1, h2, h3)');
            });

            it('allows single selector', () => {
                const selector = css.is('h1');
                expect(selector).toBe(':is(h1)');
            });

            it('works in actual style declaration', () => {
                const cls = css({
                    [` *${css.is('h1', 'h2', 'h3')}`]: {
                        fontWeight: 'bold',
                    },
                });
                expect(engine.inject(`${MARKER}<div class="${cls}">Headers</div>`)).toBe(
                    ['<style>', '.tfaac61s *:is(h1, h2, h3){font-weight:bold}', '</style>', '<div class="tfaac61s">Headers</div>'].join(''),
                );
            });

            it('works combined with combinators', () => {
                const cls = css({
                    [`> ${css.is('h1', 'h2')}`]: {
                        fontSize: '2rem',
                    },
                });
                expect(engine.inject(`${MARKER}<div class="${cls}">Direct Headers</div>`)).toBe(
                    ['<style>', '.tfdtlncb > :is(h1, h2){font-size:2rem}', '</style>', '<div class="tfdtlncb">Direct Headers</div>'].join(
                        '',
                    ),
                );
            });
        });

        describe('css.attr', () => {
            let css: ReturnType<typeof createCss>;

            beforeEach(() => {
                css = createCss();
            });

            it('generates attribute equals selector with attr()', () => {
                const cls = css({
                    [css.attr('data-active', true)]: {color: 'red'},
                });

                expect(engine.inject(`${MARKER}<div class="${cls}">Attr Equals</div>`)).toBe(
                    ['<style>', '.tf1ci7xlj[data-active="true"]{color:red}', '</style>', '<div class="tf1ci7xlj">Attr Equals</div>'].join(
                        '',
                    ),
                );
            });

            it('generates attribute presence selector with attr()', () => {
                const cls = css({
                    [css.attr('disabled')]: {opacity: 0.5},
                });

                expect(engine.inject(`${MARKER}<div class="${cls}">Attr Presence</div>`)).toBe(
                    ['<style>', '.tf1kwc03l[disabled]{opacity:0.5}', '</style>', '<div class="tf1kwc03l">Attr Presence</div>'].join(''),
                );
            });

            it('generates starts-with attribute selector with attrStartsWith()', () => {
                const cls = css({
                    [css.attrStartsWith('data-role', 'adm')]: {fontWeight: 'bold'},
                });

                expect(engine.inject(`${MARKER}<div class="${cls}">Attr Starts With</div>`)).toBe(
                    [
                        '<style>',
                        '.tf1oml3hz[data-role^="adm"]{font-weight:bold}',
                        '</style>',
                        '<div class="tf1oml3hz">Attr Starts With</div>',
                    ].join(''),
                );
            });

            it('generates ends-with attribute selector with attrEndsWith()', () => {
                const cls = css({
                    [css.attrEndsWith('data-id', '42')]: {opacity: 0.5},
                });

                expect(engine.inject(`${MARKER}<div class="${cls}">Attr Ends With</div>`)).toBe(
                    ['<style>', '.tf13fuixq[data-id$="42"]{opacity:0.5}', '</style>', '<div class="tf13fuixq">Attr Ends With</div>'].join(
                        '',
                    ),
                );
            });

            it('generates contains attribute selector with attrContains()', () => {
                const cls = css({
                    [css.attrContains('data-label', 'part')]: {textDecoration: 'underline'},
                });

                expect(engine.inject(`${MARKER}<div class="${cls}">Attr Contains</div>`)).toBe(
                    [
                        '<style>',
                        '.tf1xzovwh[data-label*="part"]{text-decoration:underline}',
                        '</style>',
                        '<div class="tf1xzovwh">Attr Contains</div>',
                    ].join(''),
                );
            });

            it('allows combining multiple attr selectors', () => {
                const cls = css({
                    [css.attr('data-active', true)]: {color: 'green'},
                    [css.attrStartsWith('data-role', 'adm')]: {fontWeight: 'bold'},
                    [css.attrEndsWith('data-id', '42')]: {opacity: 0.5},
                    [css.attrContains('data-label', 'part')]: {textDecoration: 'underline'},
                });

                expect(engine.inject(`${MARKER}<div class="${cls}">Attr Combo</div>`)).toBe(
                    [
                        '<style>',
                        '.tfmqkgag[data-active="true"]{color:green}',
                        '.tfmqkgag[data-role^="adm"]{font-weight:bold}',
                        '.tfmqkgag[data-id$="42"]{opacity:0.5}',
                        '.tfmqkgag[data-label*="part"]{text-decoration:underline}',
                        '</style>',
                        '<div class="tfmqkgag">Attr Combo</div>',
                    ].join(''),
                );
            });
        });
    });

    describe('keyframes', () => {
        let css: ReturnType<typeof createCss>;

        beforeEach(() => {
            css = createCss();
        });

        it('Registers a keyframe animation and injects it', () => {
            const drop = css.keyframes({
                '0%': {top: '-50%', opacity: 1},
                '60%': {top: '110%', opacity: 0},
                '100%': {top: '110%', opacity: 0},
            });

            const cls = css({
                animation: `${drop} 10s infinite`,
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">Drop</div>`)).toBe(
                [
                    '<style>',
                    '@keyframes kftf1nm8f27 {',
                    '0%{top:-50%;opacity:1}',
                    '60%{top:110%;opacity:0}',
                    '100%{top:110%;opacity:0}',
                    '}',
                    '.tfgi3aad{animation:kftf1nm8f27 10s infinite}',
                    '</style>',
                    '<div class="tfgi3aad">Drop</div>',
                ].join(''),
            );
        });

        it('Reuses identical keyframe definitions', () => {
            const def = {
                '0%': {opacity: 1},
                '100%': {opacity: 0},
            };

            const fade1 = css.keyframes(def);
            const fade2 = css.keyframes(def);

            expect(fade1).toBe(fade2);
        });

        it('Supports complex transforms in keyframes', () => {
            const slide = css.keyframes({
                '0%': {transform: 'translateX(-100%)'},
                '50%': {transform: 'translateX(0%)'},
                '100%': {transform: 'translateX(100%)'},
            });

            const cls = css({
                animation: `${slide} 5s linear infinite`,
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">Slide</div>`)).toBe(
                [
                    '<style>',
                    '@keyframes kftfky3yn {',
                    '0%{transform:translateX(-100%)}',
                    '50%{transform:translateX(0%)}',
                    '100%{transform:translateX(100%)}',
                    '}',
                    '.tf1el6a0z{animation:kftfky3yn 5s linear infinite}',
                    '</style>',
                    '<div class="tf1el6a0z">Slide</div>',
                ].join(''),
            );
        });

        it('Supports multiple transform properties in keyframes', () => {
            const bounce = css.keyframes({
                '0%': {transform: 'translateY(0px) scale(1)'},
                '50%': {transform: 'translateY(-10px) scale(1.1)'},
                '100%': {transform: 'translateY(0px) scale(1)'},
            });

            const cls = css({
                animation: `${bounce} 2s ease-in-out infinite`,
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">Bounce</div>`)).toBe(
                [
                    '<style>',
                    '@keyframes kftfkzsft1 {',
                    '0%{transform:translateY(0px) scale(1)}',
                    '50%{transform:translateY(-10px) scale(1.1)}',
                    '100%{transform:translateY(0px) scale(1)}',
                    '}',
                    '.tf4e2llh{animation:kftfkzsft1 2s ease-in-out infinite}',
                    '</style>',
                    '<div class="tf4e2llh">Bounce</div>',
                ].join(''),
            );
        });

        it('Allows for nice curry blending', () => {
            const cls = css({
                animation: `${css.keyframes({
                    '0%': {transform: 'translateY(0px) scale(1)'},
                    '50%': {transform: 'translateY(-10px) scale(1.1)'},
                    '100%': {transform: 'translateY(0px) scale(1)'},
                })} 2s ease-in-out infinite`,
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">Bounce</div>`)).toBe(
                [
                    '<style>',
                    '@keyframes kftfkzsft1 {',
                    '0%{transform:translateY(0px) scale(1)}',
                    '50%{transform:translateY(-10px) scale(1.1)}',
                    '100%{transform:translateY(0px) scale(1)}',
                    '}',
                    '.tf4e2llh{animation:kftfkzsft1 2s ease-in-out infinite}',
                    '</style>',
                    '<div class="tf4e2llh">Bounce</div>',
                ].join(''),
            );
        });

        it('Plays nice with media queries', () => {
            const cls = css({
                [css.media.desktop]: {
                    animation: `${css.keyframes({
                        '0%': {transform: 'translateY(0px) scale(1)'},
                        '50%': {transform: 'translateY(-10px) scale(1.1)'},
                        '100%': {transform: 'translateY(0px) scale(1)'},
                    })} 2s ease-in-out infinite`,
                },
                [css.media.tablet]: {
                    animation: `${css.keyframes({
                        '0%': {transform: 'translateY(0px) scale(1)'},
                        '50%': {transform: 'translateY(-5px) scale(1.05)'},
                        '100%': {transform: 'translateY(0px) scale(1)'},
                    })} 1s ease-in-out infinite`,
                },
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">Bounce</div>`)).toBe(
                [
                    '<style>',
                    '@keyframes kftfkzsft1 {',
                    '0%{transform:translateY(0px) scale(1)}',
                    '50%{transform:translateY(-10px) scale(1.1)}',
                    '100%{transform:translateY(0px) scale(1)}',
                    '}',
                    '@keyframes kftf1dngq2t {',
                    '0%{transform:translateY(0px) scale(1)}',
                    '50%{transform:translateY(-5px) scale(1.05)}',
                    '100%{transform:translateY(0px) scale(1)}',
                    '}',
                    '@media (min-width: 1200px){',
                    '.tfh48it7{animation:kftfkzsft1 2s ease-in-out infinite}',
                    '}',
                    '@media (max-width: 1199px){',
                    '.tfh48it7{animation:kftf1dngq2t 1s ease-in-out infinite}',
                    '}',
                    '</style>',
                    '<div class="tfh48it7">Bounce</div>',
                ].join(''),
            );
        });

        it('Plays nice with media queries and does not inject the same keyframe twice', () => {
            const cls = css({
                [css.media.desktop]: {
                    animation: `${css.keyframes({
                        '0%': {transform: 'translateY(0px) scale(1)'},
                        '50%': {transform: 'translateY(-10px) scale(1.1)'},
                        '100%': {transform: 'translateY(0px) scale(1)'},
                    })} 2s ease-in-out infinite`,
                },
                [css.media.tablet]: {
                    animation: `${css.keyframes({
                        '0%': {transform: 'translateY(0px) scale(1)'},
                        '50%': {transform: 'translateY(-10px) scale(1.1)'},
                        '100%': {transform: 'translateY(0px) scale(1)'},
                    })} 1s ease-in-out infinite`,
                },
            });

            expect(engine.inject(`${MARKER}<div class="${cls}">Bounce</div>`)).toBe(
                [
                    '<style>',
                    '@keyframes kftfkzsft1 {',
                    '0%{transform:translateY(0px) scale(1)}',
                    '50%{transform:translateY(-10px) scale(1.1)}',
                    '100%{transform:translateY(0px) scale(1)}',
                    '}',
                    '@media (min-width: 1200px){',
                    '.tf1fgnlu9{animation:kftfkzsft1 2s ease-in-out infinite}',
                    '}',
                    '@media (max-width: 1199px){',
                    '.tf1fgnlu9{animation:kftfkzsft1 1s ease-in-out infinite}',
                    '}',
                    '</style>',
                    '<div class="tf1fgnlu9">Bounce</div>',
                ].join(''),
            );
        });

        it('Does not inject when inject: false', () => {
            const pulse = css.keyframes(
                {
                    '0%': {transform: 'scale(1)'},
                    '50%': {transform: 'scale(1.1)'},
                    '100%': {transform: 'scale(1)'},
                },
                {inject: false},
            );

            const cls = css(
                {
                    animation: `${pulse} 3s ease-in-out`,
                },
                {inject: false},
            );

            expect(engine.inject(`${MARKER}<div class="${cls}">Pulse</div>`)).toBe(`<div class="${cls}">Pulse</div>`);
        });

        it('Runs the same input across multiple engines successfully and swiftly', () => {
            const css2 = createCss({
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

            const output: string[] = [];
            const start = Date.now();
            for (let i = 0; i < 1_000; i++) {
                setActiveStyleEngine(new StyleEngine());
                output.push(
                    getActiveStyleEngine()!.inject(
                        `${MARKER}<div class="${css2.use('f', 'fh', 'fa_c', 'oh', {
                            width: '100%',
                            background: css2.$t.bg,
                            color: css2.$t.fg,
                            [css2.media.desktop]: css2.mix('sp_xl', 'fj_c', {
                                ' > span': css2.mix('sp_h_l', {fontSize: '1rem'}),
                                ' div': {
                                    animation: `${css2.keyframes({
                                        '0%': {transform: 'scale(1)', opacity: 0.5},
                                        '50%': {transform: 'scale(1.1)', opacity: 0.2},
                                        '100%': {transform: 'scale(1)', opacity: 0.1},
                                    })} 3s ease-in-out`,
                                },
                            }),
                            [css2.media.tablet]: css2.mix('sp_l', 'fj_sa', {
                                ' > span': css2.mix('hide'),
                                ' div': {
                                    animation: `${css2.keyframes({
                                        '0%': {transform: 'scale(1)'},
                                        '50%': {transform: 'scale(1.1)'},
                                        '100%': {transform: 'scale(1)'},
                                    })} 3s ease-in-out`,
                                },
                            }),
                        })}">Mix</div>`,
                    ),
                );
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
            for (const el of output) {
                expect(el).toBe(
                    [
                        '<style>',
                        '@keyframes kftfss8l3s {',
                        '0%{transform:scale(1);opacity:0.5}',
                        '50%{transform:scale(1.1);opacity:0.2}',
                        '100%{transform:scale(1);opacity:0.1}',
                        '}',
                        '@keyframes kftf1jxp4lb {',
                        '0%{transform:scale(1)}',
                        '50%{transform:scale(1.1)}',
                        '100%{transform:scale(1)}',
                        '}',
                        '.tf1cg6hcg{display:flex;flex-direction:row;align-items:center;overflow:hidden;width:100%;background:var(--t-bg);color:var(--t-fg)}',
                        '@media (min-width: 1200px){',
                        '.tf1cg6hcg > span{padding-left:var(--v-space_l);padding-right:var(--v-space_l);font-size:1rem}',
                        '.tf1cg6hcg div{animation:kftfss8l3s 3s ease-in-out}',
                        '.tf1cg6hcg{padding:var(--v-space_xl);justify-content:center}',
                        '}',
                        '@media (max-width: 1199px){',
                        '.tf1cg6hcg > span{display:none}',
                        '.tf1cg6hcg div{animation:kftf1jxp4lb 3s ease-in-out}',
                        '.tf1cg6hcg{padding:var(--v-space_l);justify-content:space-around}',
                        '}',
                        '</style>',
                        '<div class="tf1cg6hcg">Mix</div>',
                    ].join(''),
                );
            }
        });
    });
});
