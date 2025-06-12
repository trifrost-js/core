import {describe, it, expect} from 'vitest';
import {isAsyncFn} from '@valkyriestudios/utils/function';
import {
    ContentSecurityPolicy,
    CrossOriginEmbedderPolicy,
    CrossOriginOpenerPolicy,
    CrossOriginResourcePolicy,
    ReferrerPolicy,
    Security,
    Sym_TriFrostMiddlewareSecurity,
    XContentTypes,
    XDnsPrefetchControl,
    XDownloadOptions,
    XFrameOptions,
} from '../../../lib/middleware/Security';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    Sym_TriFrostName,
} from '../../../lib/types/constants';
import {MockContext} from '../../MockContext';
import CONSTANTS from '../../constants';

describe('Middleware - Security', () => {
    it('Returns a function that is non-async', () => {
        const fn = Security();
        expect(typeof fn).toBe('function');
        expect(isAsyncFn(fn)).toBe(false);
    });

    it('Returns a function with TriFrost symbols set', () => {
        const fn = Security();
        expect(Reflect.get(fn, Sym_TriFrostName)).toBe('TriFrostSecurity');
        expect(
            Reflect.get(fn, Sym_TriFrostDescription)
        ).toBe('Middleware for configuring Security headers and CSP on contexts passing through it');
    });

    it('Sets a specific symbol marker to identify TriFrost security', () => {
        const fn = Security();
        expect(Reflect.get(fn, Sym_TriFrostFingerPrint)).toBe(Sym_TriFrostMiddlewareSecurity);
    });

    it('Sets default headers when no options provided', () => {
        const ctx = new MockContext();
        Security()(ctx);
        expect(ctx.headers).toEqual({
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-site',
            'Origin-Agent-Cluster': '?1',
            'Referrer-Policy': 'no-referrer',
            'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
            'X-Content-Type-Options': 'nosniff',
            'X-DNS-Prefetch-Control': 'off',
            'X-Download-Options': 'noopen',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-XSS-Protection': '0',
        });
    });

    it('Sets default headers when invalid options provided', () => {
        const ctx = new MockContext();
        /* @ts-ignore */
        Security('bla')(ctx);
        expect(ctx.headers).toEqual({
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-site',
            'Origin-Agent-Cluster': '?1',
            'Referrer-Policy': 'no-referrer',
            'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
            'X-Content-Type-Options': 'nosniff',
            'X-DNS-Prefetch-Control': 'off',
            'X-Download-Options': 'noopen',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-XSS-Protection': '0',
        });
    });

    it('Skips defaults when use_defaults is false', () => {
        const ctx = new MockContext();
        Security({}, {use_defaults: false})(ctx);
        expect(ctx.headers).toEqual({});
    });

    it('Sets no headers when invalid options provided and use_defaults is false', () => {
        const ctx = new MockContext();
        /* @ts-ignore */
        Security('bla', {use_defaults: false})(ctx);
        expect(ctx.headers).toEqual({});
    });

    it('Allows building config manually from defaults', () => {
        const ctx = new MockContext();
        Security({crossOriginOpenerPolicy: 'unsafe-none'}, {use_defaults: false})(ctx);
        expect(ctx.headers).toEqual({
            'Cross-Origin-Opener-Policy': 'unsafe-none',
        });
    });

    describe('contentSecurityPolicy', () => {
        it('Sets a single valid directive (string)', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.DefaultSrc]: '"self"',
                },
            })(ctx);
            expect(ctx.headers['Content-Security-Policy']).toBe('default-src "self"');
        });

        it('Sets multiple directives from string arrays (deduped)', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"', 'cdn.com', 'cdn.com'],
                    [ContentSecurityPolicy.StyleSrc]: ['"self"', 'fonts.com'],
                },
            })(ctx);
            expect(ctx.headers['Content-Security-Policy']).toBe('script-src "self" cdn.com; style-src "self" fonts.com');
        });

        it('Handles base-uri as a special single string', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.BaseUri]: '"self"',
                },
            })(ctx);
            expect(ctx.headers['Content-Security-Policy']).toBe('base-uri "self"');
        });

        it('Trims and dedupes multiple array values', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ConnectSrc]: [' api.com ', 'api.com', '"self"'],
                },
            })(ctx);
            expect(ctx.headers['Content-Security-Policy']).toBe('connect-src api.com "self"');
        });

        it('Throws on invalid array values', () => {
            expect(
                () => Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.ConnectSrc]: [' api.com ', ...CONSTANTS.NOT_STRING_WITH_EMPTY] as string[],
                    },
                })
            ).toThrow(/TriFrostMiddleware@Security: Invalid value for directive "connect-src" in contentSecurityPolicy/);
        });

        it('Throws on unknown directive keys', () => {
            expect(() => {
                Security({
                    contentSecurityPolicy: {
                        'foo-src': '"self"',
                    } as any,
                });
            }).toThrow(/TriFrostMiddleware@Security: Invalid directive "foo-src" in contentSecurityPolicy/);
        });

        it('Throws when base-uri is not a valid string', () => {
            expect(() => {
                Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.BaseUri]: 123 as any,
                    },
                });
            }).toThrow(/TriFrostMiddleware@Security: Invalid value for directive "base-uri"/);
        });

        it('Throws when directive value is not a string or array', () => {
            expect(() => {
                Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.StyleSrc]: {foo: 'bar'} as any,
                    },
                });
            }).toThrow(/TriFrostMiddleware@Security: Invalid value for directive "style-src"/);
        });

        it('Throws when directive array is empty', () => {
            expect(() => {
                Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.ImgSrc]: [],
                    },
                });
            }).toThrow(/TriFrostMiddleware@Security: Invalid value for directive "img-src"/);
        });

        it('Omits header when passed null', () => {
            const ctx = new MockContext();
            Security({contentSecurityPolicy: null})(ctx);
            expect('Content-Security-Policy' in ctx.headers).toBe(false);
        });

        it('Builds full CSP with all directives set', () => {
            const ctx = new MockContext();

            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.DefaultSrc]: '"self"',
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"', 'cdn.scripts.com'],
                    [ContentSecurityPolicy.StyleSrc]: ['cdn.styles.com'],
                    [ContentSecurityPolicy.ImgSrc]: ['"self"', 'img.cdn.com'],
                    [ContentSecurityPolicy.ConnectSrc]: ['api.example.com'],
                    [ContentSecurityPolicy.FontSrc]: ['fonts.example.com'],
                    [ContentSecurityPolicy.ObjectSrc]: ['"none"'],
                    [ContentSecurityPolicy.MediaSrc]: ['media.example.com'],
                    [ContentSecurityPolicy.FrameSrc]: ['frame.example.com'],
                    [ContentSecurityPolicy.BaseUri]: '"self"',
                    [ContentSecurityPolicy.FormAction]: ['forms.example.com'],
                    [ContentSecurityPolicy.FrameAncestors]: ['"none"'],
                    [ContentSecurityPolicy.PluginTypes]: ['application/pdf'],
                    [ContentSecurityPolicy.ReportUri]: ['/csp-report'],
                },
            })(ctx);

            expect(ctx.headers['Content-Security-Policy']).toEqual([
                'default-src "self"',
                'script-src "self" cdn.scripts.com',
                'style-src cdn.styles.com',
                'img-src "self" img.cdn.com',
                'connect-src api.example.com',
                'font-src fonts.example.com',
                'object-src "none"',
                'media-src media.example.com',
                'frame-src frame.example.com',
                'base-uri "self"',
                'form-action forms.example.com',
                'frame-ancestors "none"',
                'plugin-types application/pdf',
                'report-uri /csp-report',
            ].join('; '));
        });

        it('Replaces nonce placeholder in script-src and sets ctx.nonce', () => {
            const ctx = new MockContext();

            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"', '\'nonce\''],
                },
            })(ctx);

            const nonce = ctx.nonce;
            expect(() => atob(nonce)).not.toThrow();
            expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);

            const csp = ctx.headers['Content-Security-Policy'];
            expect(csp).toBe(`script-src "self" 'nonce-${nonce}'`);
        });

        it('Does not replace substrings containing "nonce" like hello.nonce.com', () => {
            const ctx = new MockContext();

            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"', 'hello.nonce.com'],
                },
            })(ctx);

            expect(ctx.state).not.toHaveProperty('nonce');
            expect(ctx.headers['Content-Security-Policy']).toBe('script-src "self" hello.nonce.com');
        });

        it('Replaces nonce placeholder in script-src and sets ctx.nonce but leaves things like hello.nonce.com intact', () => {
            const ctx = new MockContext();

            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"', '\'nonce\''],
                    [ContentSecurityPolicy.StyleSrc]: ['"self"', 'hello.nonce.com', '\'nonce\''],
                },
            })(ctx);

            const nonce = ctx.nonce;
            expect(() => atob(nonce)).not.toThrow();
            expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);

            const csp = ctx.headers['Content-Security-Policy'];
            expect(csp).toBe(`script-src "self" 'nonce-${nonce}'; style-src "self" hello.nonce.com 'nonce-${nonce}'`);
        });

        it('Does not generate a nonce if no directive uses it', () => {
            const ctx = new MockContext();

            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"'],
                },
            })(ctx);

            expect(ctx.state).not.toHaveProperty('nonce');
        });

        it('Replaces nonce in multiple directives and uses same ctx.nonce', () => {
            const ctx = new MockContext();

            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"', '\'nonce\''],
                    [ContentSecurityPolicy.StyleSrc]: ['"self"', '\'nonce\''],
                },
            })(ctx);

            const nonce = ctx.nonce;
            const csp = ctx.headers['Content-Security-Policy'];
            const expected = `'nonce-${nonce}'`;

            expect(csp).toBe(`script-src "self" ${expected}; style-src "self" ${expected}`);
        });
    });

    describe('crossOriginEmbedderPolicy', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(CrossOriginEmbedderPolicy)) {
                const ctx = new MockContext();
                Security({crossOriginEmbedderPolicy: el})(ctx);
                expect(ctx.headers['Cross-Origin-Embedder-Policy']).toEqual(el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({crossOriginEmbedderPolicy: null})(ctx);
            expect('Cross-Origin-Embedder-Policy' in ctx.headers).toBe(false);
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                expect(
                    () => Security({crossOriginEmbedderPolicy: el as any})(new MockContext())
                ).toThrow(/TriFrostMiddleware@Security: Invalid configuration for crossOriginEmbedderPolicy/);
            }
        });
    });

    describe('crossOriginOpenerPolicy', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(CrossOriginOpenerPolicy)) {
                const ctx = new MockContext();
                Security({crossOriginOpenerPolicy: el})(ctx);
                expect(ctx.headers['Cross-Origin-Opener-Policy']).toEqual(el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({crossOriginOpenerPolicy: null})(ctx);
            expect('Cross-Origin-Opener-Policy' in ctx.headers).toBe(false);
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                expect(
                    () => Security({crossOriginOpenerPolicy: el as any})(new MockContext())
                ).toThrow(/TriFrostMiddleware@Security: Invalid configuration for crossOriginOpenerPolicy/);
            }
        });
    });

    describe('crossOriginResourcePolicy', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(CrossOriginResourcePolicy)) {
                const ctx = new MockContext();
                Security({crossOriginResourcePolicy: el})(ctx);
                expect(ctx.headers['Cross-Origin-Resource-Policy']).toEqual(el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({crossOriginResourcePolicy: null})(ctx);
            expect('Cross-Origin-Resource-Policy' in ctx.headers).toBe(false);
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                expect(
                    () => Security({crossOriginResourcePolicy: el as any})(new MockContext())
                ).toThrow(/TriFrostMiddleware@Security: Invalid configuration for crossOriginResourcePolicy/);
            }
        });
    });

    describe('originAgentCluster', () => {
        it('Sets "?1" when value is true', () => {
            const ctx = new MockContext();
            Security({originAgentCluster: true})(ctx);
            expect(ctx.headers['Origin-Agent-Cluster']).toBe('?1');
        });

        it('Sets "?0" when value is false', () => {
            const ctx = new MockContext();
            Security({originAgentCluster: false})(ctx);
            expect(ctx.headers['Origin-Agent-Cluster']).toBe('?0');
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({originAgentCluster: null})(ctx);
            expect('Origin-Agent-Cluster' in ctx.headers).toBe(false);
        });

        it('Throws on non-boolean, non-null values', () => {
            for (const el of CONSTANTS.NOT_BOOLEAN) {
                if (el === null || el === undefined) continue;
                expect(() => {
                    Security({originAgentCluster: el as any});
                }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for originAgentCluster/);
            }
        });
    });

    describe('referrerPolicy', () => {
        it('Sets header from a valid single string', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: 'no-referrer'})(ctx);
            expect(ctx.headers['Referrer-Policy']).toBe('no-referrer');
        });

        it('Sets header from a valid array of strings', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: ['origin', 'same-origin']})(ctx);
            expect(ctx.headers['Referrer-Policy']).toBe('origin, same-origin');
        });

        it('Deduplicates repeated values in array', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: ['strict-origin', 'strict-origin']})(ctx);
            expect(ctx.headers['Referrer-Policy']).toBe('strict-origin');
        });

        it('Trims and deduplicates strings with whitespace', () => {
            const ctx = new MockContext();
            /* @ts-ignore */
            Security({referrerPolicy: [' strict-origin ', 'strict-origin']})(ctx);
            expect(ctx.headers['Referrer-Policy']).toBe('strict-origin');
        });

        it('Allows usage of ReferrerPolicy enum values', () => {
            const ctx = new MockContext();
            Security({
                referrerPolicy: [
                    ReferrerPolicy.Origin,
                    ReferrerPolicy.SameOrigin,
                ],
            })(ctx);
            expect(ctx.headers['Referrer-Policy']).toBe('origin, same-origin');
        });

        it('Throws on a single invalid string', () => {
            expect(() => {
                Security({referrerPolicy: 'not-a-policy' as any});
            }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for referrerPolicy/);
        });

        it('Throws on a mixed array containing any invalid string', () => {
            expect(() => {
                Security({referrerPolicy: ['origin', 'foobar'] as any});
            }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for referrerPolicy/);
        });

        it('Throws if passed an empty array', () => {
            expect(() => {
                Security({referrerPolicy: []});
            }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for referrerPolicy/);
        });

        it('Throws if passed an array with only invalid values', () => {
            expect(() => {
                Security({referrerPolicy: ['foo', 'bar'] as any});
            }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for referrerPolicy/);
        });

        it('Omits header if passed null', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: null})(ctx);
            expect('Referrer-Policy' in ctx.headers).toBe(false);
        });

        it('Throws on invalid types', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                if (el === undefined || el === null) continue;
                expect(() => {
                    Security({referrerPolicy: el as any});
                }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for referrerPolicy/);
            }
        });
    });

    describe('strictTransportSecurity', () => {
        it('Sets only max-age if includeSubDomains and preload are missing', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {maxAge: 12345},
            })(ctx);
            expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=12345');
        });

        it('Sets max-age + includeSubDomains when true', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {maxAge: 86400, includeSubDomains: true},
            })(ctx);
            expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=86400; includeSubDomains');
        });

        it('Sets preload if all criteria met', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {
                    maxAge: 31536001,
                    includeSubDomains: true,
                    preload: true,
                },
            })(ctx);
            expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=31536001; includeSubDomains; preload');
        });

        it('Omits preload if includeSubDomains not set', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {
                    maxAge: 31536001,
                    preload: true,
                },
            })(ctx);
            expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=31536001');
        });

        it('Omits preload if maxAge is too low', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {
                    maxAge: 1000,
                    includeSubDomains: true,
                    preload: true,
                },
            })(ctx);
            expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=1000; includeSubDomains');
        });

        it('Handles null by omitting header', () => {
            const ctx = new MockContext();
            Security({strictTransportSecurity: null})(ctx);
            expect('Strict-Transport-Security' in ctx.headers).toBe(false);
        });

        it('Throws when object lacks valid maxAge', () => {
            for (const el of [...CONSTANTS.NOT_INTEGER, -1, 0, 10.5]) {
                expect(() => {
                    Security({
                        strictTransportSecurity: {maxAge: el as number},
                    });
                }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for strictTransportSecurity/);
            }
        });

        it('Throws when given non/empty-object value', () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (el === undefined || el === null) continue;
                expect(() => {
                    Security({
                        strictTransportSecurity: el as any,
                    });
                }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for strictTransportSecurity/);
            }
        });

        it('Throws when given unrelated keys', () => {
            expect(() => {
                Security({
                    strictTransportSecurity: {foo: 'bar'} as any,
                });
            }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for strictTransportSecurity/);
        });
    });

    describe('xContentTypeOptions', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XContentTypes)) {
                const ctx = new MockContext();
                Security({xContentTypeOptions: el})(ctx);
                expect(ctx.headers['X-Content-Type-Options']).toEqual(el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xContentTypeOptions: null})(ctx);
            expect('X-Content-Type-Options' in ctx.headers).toBe(false);
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                expect(
                    () => Security({xContentTypeOptions: el as any})(new MockContext())
                ).toThrow(/TriFrostMiddleware@Security: Invalid configuration for xContentTypeOptions/);
            }
        });
    });

    describe('xDnsPrefetchControl', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XDnsPrefetchControl)) {
                const ctx = new MockContext();
                Security({xDnsPrefetchControl: el})(ctx);
                expect(ctx.headers['X-DNS-Prefetch-Control']).toEqual(el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xDnsPrefetchControl: null})(ctx);
            expect('X-DNS-Prefetch-Control' in ctx.headers).toBe(false);
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                expect(
                    () => Security({xDnsPrefetchControl: el as any})(new MockContext())
                ).toThrow(/TriFrostMiddleware@Security: Invalid configuration for xDnsPrefetchControl/);
            }
        });
    });

    describe('xDownloadOptions', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XDownloadOptions)) {
                const ctx = new MockContext();
                Security({xDownloadOptions: el})(ctx);
                expect(ctx.headers['X-Download-Options']).toEqual(el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xDownloadOptions: null})(ctx);
            expect('X-Download-Options' in ctx.headers).toBe(false);
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                expect(
                    () => Security({xDownloadOptions: el as any})(new MockContext())
                ).toThrow(/TriFrostMiddleware@Security: Invalid configuration for xDownloadOptions/);
            }
        });
    });

    describe('xFrameOptions', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XFrameOptions)) {
                const ctx = new MockContext();
                Security({xFrameOptions: el})(ctx);
                expect(ctx.headers['X-Frame-Options']).toEqual(el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xFrameOptions: null})(ctx);
            expect('X-Frame-Options' in ctx.headers).toBe(false);
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                expect(
                    () => Security({xFrameOptions: el as any})(new MockContext())
                ).toThrow(/TriFrostMiddleware@Security: Invalid configuration for xFrameOptions/);
            }
        });
    });

    describe('xXssProtection', () => {
        it('Sets "0" to disable protection', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '0'})(ctx);
            expect(ctx.headers['X-XSS-Protection']).toBe('0');
        });

        it('Sets "1" to enable basic protection', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '1'})(ctx);
            expect(ctx.headers['X-XSS-Protection']).toBe('1');
        });

        it('Sets "block" to enable block mode', () => {
            const ctx = new MockContext();
            Security({xXssProtection: 'block'})(ctx);
            expect(ctx.headers['X-XSS-Protection']).toBe('1; mode=block');
        });

        it('Sets "report" with slash-prefixed URI', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '/report/xss'})(ctx);
            expect(ctx.headers['X-XSS-Protection']).toBe('1; report=/report/xss');
        });

        it('Trims and applies report URI', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '  /report-me  '})(ctx);
            expect(ctx.headers['X-XSS-Protection']).toBe('1; report=/report-me');
        });

        it('Does not set header when explicitly null', () => {
            const ctx = new MockContext();
            Security({xXssProtection: null})(ctx);
            expect('X-XSS-Protection' in ctx.headers).toBe(false);
        });

        it('Throws if string is not valid and doesn’t start with slash', () => {
            expect(() => {
                Security({xXssProtection: 'report-me' as any});
            }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for xXssProtection/);
        });

        it('Throws if non/empty-string type is passed', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                if (el === undefined || el === null) continue;
                expect(() => {
                    Security({xXssProtection: el as any});
                }).toThrow(/TriFrostMiddleware@Security: Invalid configuration for xXssProtection/);
            }
        });
    });
});
