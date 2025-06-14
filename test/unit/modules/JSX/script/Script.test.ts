/* eslint-disable max-len, no-console */

import {describe, it, expect, afterEach} from 'vitest';
import {Script} from '../../../../../lib/modules/JSX/script/Script';
import {setActiveNonce} from '../../../../../lib/modules/JSX/nonce/use';
import CONSTANTS from '../../../../constants';

describe('JSX - <Script>', () => {
    afterEach(() => {
        setActiveNonce(null);
    });

    it('Returns external script object with src', () => {
        expect(Script({src: 'https://cdn.example.com/app.js', async: true})).toEqual({
            key: null,
            type: 'script',
            props: {
                src: 'https://cdn.example.com/app.js',
                async: true,
                type: 'text/javascript',
            },
        });
    });

    it('Returns inline script object from function body', () => {
        expect(Script({
            children: () => {
                console.log('Hello TriFrost');
            },
        })).toEqual({
            key: null,
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: '(function(node){console.log("Hello TriFrost");}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                },
                type: 'text/javascript',
            },
        });
    });

    it('Returns inline script object from raw string', () => {
        expect(Script({
            children: 'console.log("inline raw")',
        })).toEqual({
            key: null,
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: '(function(node){console.log("inline raw")}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                },
                type: 'text/javascript',
            },
        });
    });

    it('Supports type="module"', () => {
        expect(Script({
            type: 'module',
            children: 'console.log("module");',
        })).toEqual({
            key: null,
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: '(function(node){console.log("module");}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                },
                type: 'module',
            },
        });
    });

    it('Supports defer=true on external script', () => {
        expect(Script({src: '/main.js', defer: true})).toEqual({
            key: null,
            type: 'script',
            props: {
                src: '/main.js',
                defer: true,
                type: 'text/javascript',
            },
        });
    });

    it('Supports async + defer together', () => {
        expect(Script({src: '/main.js', async: true, defer: true})).toEqual({
            key: null,
            type: 'script',
            props: {
                src: '/main.js',
                async: true,
                defer: true,
                type: 'text/javascript',
            },
        });
    });

    it('Skips dangerouslySetInnerHTML if children is falsy', () => {
        expect(Script({children: undefined})).toBe(null);
    });

    it('Throws on invalid children type', () => {
        expect(Script({children: true})).toBe(null);
    });

    it('Includes nonce if specified', () => {
        expect(Script({nonce: 'abc123', src: '/x.js'})).toEqual({
            key: null,
            type: 'script',
            props: {
                src: '/x.js',
                nonce: 'abc123',
                type: 'text/javascript',
            },
        });
    });

    it('Includes nonce if active when working with src', () => {
        setActiveNonce('abc123');
        expect(Script({src: '/x.js'})).toEqual({
            key: null,
            type: 'script',
            props: {
                src: '/x.js',
                nonce: 'abc123',
                type: 'text/javascript',
            },
        });
    });

    it('Includes nonce if active when working with inline script', () => {
        setActiveNonce('abc123');
        expect(Script({children: 'console.log("inline raw")'})).toEqual({
            key: null,
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: '(function(node){console.log("inline raw")}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                },
                nonce: 'abc123',
                type: 'text/javascript',
            },
        });
    });

    it('Includes nonce if active when working with script function', () => {
        setActiveNonce('abc123');
        expect(Script({
            children: () => {
                const msg = 'hello    world';
                console.log('env:', msg);
            },
        })).toEqual({
            key: null,
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: `(function(node){const msg = "hello    world";
        console.log("env:", msg);}).call(document.currentScript.parentElement, document.currentScript.parentElement);`,
                },
                nonce: 'abc123',
                type: 'text/javascript',
            },
        });
    });

    it('Make use of the name we gave our element', () => {
        setActiveNonce('abc123');
        expect(Script({
            children: (rootEntry:HTMLElement) => {
                rootEntry.addEventListener('click', () => console.log('hello world'));
            },
        })).toEqual({
            key: null,
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: '(function(rootEntry){rootEntry.addEventListener("click", () => console.log("hello world"));}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                },
                nonce: 'abc123',
                type: 'text/javascript',
            },
        });
    });

    it('Falls back to default param when arrow function is malformed', () => {
        const fn = function badFormat () {
            console.log('non-arrow function');
        };

        expect(Script({children: fn})).toEqual({
            key: null,
            type: 'script',
            props: {
                dangerouslySetInnerHTML: {
                    __html: [
                        '(function(node){',
                        'console.log("non-arrow function");',
                        '}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                    ].join(''),
                },
                type: 'text/javascript',
            },
        });
    });

    it('Returns null when given a non/empty-object input', () => {
        for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
            expect(Script(el as any)).toBe(null);
        }
    });

    it('Returns null if children is a non-string/function', () => {
        for (const el of [...CONSTANTS.NOT_STRING, ...CONSTANTS.NOT_FUNCTION]) {
            if (typeof el === 'string' || typeof el === 'function') continue;
            expect(Script({children: el as any})).toBe(null);
        }
    });

    it('Skips nonce if empty string or invalid', () => {
        for (const el of [...CONSTANTS.NOT_STRING, '']) {
            expect(Script({src: '/x.js', nonce: el as any})).toEqual({
                key: null,
                type: 'script',
                props: {
                    src: '/x.js',
                    type: 'text/javascript',
                },
            });
        }
    });

    describe('<Script> - function body serialization', () => {
        it('Extracts single parameter name from fat arrow', () => {
            expect(Script({
                children: (foo: HTMLElement) => {
                    console.log(foo);
                },
            })).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: '(function(foo){console.log(foo);}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                    },
                    type: 'text/javascript',
                },
                type: 'script',
            });
        });

        it('Falls back to "node" if invalid param format', () => {
            const fn = Object.assign(() => {}, {toString: () => '() => { console.log("no param") }'});
            expect(Script({children: fn})).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: '(function(node){console.log("no param")}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                    },
                    type: 'text/javascript',
                },
                type: 'script',
            });
        });

        it('Strips __name() wrapper for async fat arrow', () => {
            expect(Script({
                children: (el: HTMLElement) => {
                    const load = async () => {
                        console.log(el);
                    };
                    el.addEventListener('click', load);
                },
            })).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: `(function(el){const load = async () => {
            console.log(el);
          };
          el.addEventListener("click", load);}).call(document.currentScript.parentElement, document.currentScript.parentElement);`,
                    },
                    type: 'text/javascript',
                },
                type: 'script',
            });
        });

        it('Strips __name() wrapper for async function declaration', () => {
            const fn = Object.assign(() => {}, {
                toString: () => `
                    (el) => {
                        async function load () {
                            console.log(el);
                        };
                        __name(load, "load");
                        el.addEventListener('click', load);
                    }
                `,
            });
            expect(Script({children: fn})).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: `(function(el){async function load () {
                            console.log(el);
                        };

                        el.addEventListener('click', load);
                    }}).call(document.currentScript.parentElement, document.currentScript.parentElement);`,
                    },
                    type: 'text/javascript',
                },
                type: 'script',
            });
        });

        it('Skips if children is not string or function', () => {
            expect(Script({children: 42 as any})).toBe(null);
        });

        it('Skips extraction if no arrow function present', () => {
            const fn = Object.assign(() => {}, {toString: () => '{ console.log("manual fn") }'});
            expect(Script({children: fn})).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: '(function(node){console.log("manual fn")}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                    },
                    type: 'text/javascript',
                },
                type: 'script',
            });
        });

        it('Accepts and preserves raw string body', () => {
            expect(Script({children: 'console.log("hi")'})).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: '(function(node){console.log("hi")}).call(document.currentScript.parentElement, document.currentScript.parentElement);',
                    },
                    type: 'text/javascript',
                },
                type: 'script',
            });
        });

        it('Preserves formatting if no __name or async is present', () => {
            expect(Script({
                children: (node: HTMLElement) => {
                    function greet () {
                        console.log('hi');
                    }
                    node.addEventListener('click', greet);
                },
            })).toEqual({
                key: null,
                props: {
                    dangerouslySetInnerHTML: {
                        __html: `(function(node){function greet() {
            console.log("hi");
          }
          node.addEventListener("click", greet);}).call(document.currentScript.parentElement, document.currentScript.parentElement);`,
                    },
                    type: 'text/javascript',
                },
                type: 'script',
            });
        });
    });
});
