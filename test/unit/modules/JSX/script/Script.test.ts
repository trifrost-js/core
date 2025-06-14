/* eslint-disable no-console */

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
                    __html: 'console.log("Hello TriFrost");',
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
                    __html: 'console.log("inline raw")',
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
                    __html: 'console.log("module");',
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
                    __html: 'console.log("inline raw")',
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
                    __html: `const msg = "hello    world";
        console.log("env:", msg);`,
                },
                nonce: 'abc123',
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
});
