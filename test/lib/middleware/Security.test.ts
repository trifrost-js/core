import {isAsyncFunction} from '@valkyriestudios/utils/function/isAsync';
import {describe, it} from 'node:test';
import * as assert from 'node:assert/strict';
import {
    ContentSecurityPolicy,
    CrossOriginEmbedderPolicy,
    CrossOriginOpenerPolicy,
    CrossOriginResourcePolicy,
    ReferrerPolicy,
    Security,
    XContentTypes,
    XDnsPrefetchControl,
    XDownloadOptions,
    XFrameOptions,
} from '../../../lib/middleware/Security';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../../lib/types/constants';
import {MockContext} from '../../MockContext';
import CONSTANTS from '../../constants';

describe('Middleware - Security', () => {
    it('Returns a function that is non-async', () => {
        const fn = Security();
        assert.ok(typeof fn === 'function');
        assert.ok(!isAsyncFunction(fn));
    });

    it('Returns a function with TriFrost symbols set', () => {
        const fn = Security();
        assert.ok(Reflect.get(fn, Sym_TriFrostName), 'TriFrostSecurity');
        assert.ok(Reflect.get(fn, Sym_TriFrostType), 'middleware');
        assert.ok(
            Reflect.get(fn, Sym_TriFrostDescription),
            'Middleware for configuring Security headers and CSP on contexts passing through it'
        );
    });

    it('Sets default headers when no options provided', () => {
        const ctx = new MockContext();
        Security()(ctx);
        assert.deepEqual(ctx.headers, {
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

    describe('contentSecurityPolicy', () => {
        it('Sets a single valid directive (string)', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.DefaultSrc]: '"self"',
                },
            })(ctx);
            assert.equal(ctx.headers['Content-Security-Policy'], 'default-src "self"');
        });

        it('Sets multiple directives from string arrays (deduped)', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ScriptSrc]: ['"self"', 'cdn.com', 'cdn.com'],
                    [ContentSecurityPolicy.StyleSrc]: ['"self"', 'fonts.com'],
                },
            })(ctx);
            assert.equal(
                ctx.headers['Content-Security-Policy'],
                'script-src "self" cdn.com; style-src "self" fonts.com'
            );
        });

        it('Handles base-uri as a special single string', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.BaseUri]: '"self"',
                },
            })(ctx);
            assert.equal(ctx.headers['Content-Security-Policy'], 'base-uri "self"');
        });

        it('Trims and dedupes multiple array values', () => {
            const ctx = new MockContext();
            Security({
                contentSecurityPolicy: {
                    [ContentSecurityPolicy.ConnectSrc]: [' api.com ', 'api.com', '"self"'],
                },
            })(ctx);
            assert.equal(
                ctx.headers['Content-Security-Policy'],
                'connect-src api.com "self"'
            );
        });

        it('Throws on invalid array values', () => {
            assert.throws(
                () => Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.ConnectSrc]: [' api.com ', ...CONSTANTS.NOT_STRING_WITH_EMPTY] as string[],
                    },
                }),
                new Error('TriFrostMiddleware@Security: Invalid value for directive "connect-src" in contentSecurityPolicy')
            );
        });

        it('Throws on unknown directive keys', () => {
            assert.throws(() => {
                Security({
                    contentSecurityPolicy: {
                        'foo-src': '"self"',
                    } as any,
                });
            }, new Error('TriFrostMiddleware@Security: Invalid directive "foo-src" in contentSecurityPolicy'));
        });

        it('Throws when no valid directives are defined', () => {
            assert.throws(() => {
                Security({
                    contentSecurityPolicy: {},
                });
            }, new Error('TriFrostMiddleware@Security: Invalid configuration for contentSecurityPolicy'));
        });

        it('Throws when base-uri is not a valid string', () => {
            assert.throws(() => {
                Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.BaseUri]: 123 as any,
                    },
                });
            }, new Error('TriFrostMiddleware@Security: Invalid value for directive "base-uri"'));
        });

        it('Throws when directive value is not a string or array', () => {
            assert.throws(() => {
                Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.StyleSrc]: {foo: 'bar'} as any,
                    },
                });
            }, new Error('TriFrostMiddleware@Security: Invalid value for directive "style-src"'));
        });

        it('Throws when directive array is empty', () => {
            assert.throws(() => {
                Security({
                    contentSecurityPolicy: {
                        [ContentSecurityPolicy.ImgSrc]: [],
                    },
                });
            }, new Error('TriFrostMiddleware@Security: Invalid value for directive "img-src"'));
        });

        it('Throws when passed a non-object value', () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (el === null || el === undefined) continue;
                assert.throws(() => {
                    Security({contentSecurityPolicy: el as any});
                }, new Error('TriFrostMiddleware@Security: Invalid configuration for contentSecurityPolicy'));
            }
        });

        it('Omits header when passed null', () => {
            const ctx = new MockContext();
            Security({contentSecurityPolicy: null})(ctx);
            assert.ok(!('Content-Security-Policy' in ctx.headers));
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

            assert.equal(ctx.headers['Content-Security-Policy'], [
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
    });

    describe('crossOriginEmbedderPolicy', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(CrossOriginEmbedderPolicy)) {
                const ctx = new MockContext();
                Security({crossOriginEmbedderPolicy: el})(ctx);
                assert.equal(ctx.headers['Cross-Origin-Embedder-Policy'], el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({crossOriginEmbedderPolicy: null})(ctx);
            assert.ok(!('Cross-Origin-Embedder-Policy' in ctx.headers));
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                assert.throws(
                    () => Security({crossOriginEmbedderPolicy: el as any})(new MockContext()),
                    new Error('TriFrostMiddleware@Security: Invalid configuration for crossOriginEmbedderPolicy')
                );
            }
        });
    });

    describe('crossOriginOpenerPolicy', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(CrossOriginOpenerPolicy)) {
                const ctx = new MockContext();
                Security({crossOriginOpenerPolicy: el})(ctx);
                assert.equal(ctx.headers['Cross-Origin-Opener-Policy'], el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({crossOriginOpenerPolicy: null})(ctx);
            assert.ok(!('Cross-Origin-Opener-Policy' in ctx.headers));
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                assert.throws(
                    () => Security({crossOriginOpenerPolicy: el as any})(new MockContext()),
                    new Error('TriFrostMiddleware@Security: Invalid configuration for crossOriginOpenerPolicy')
                );
            }
        });
    });

    describe('crossOriginResourcePolicy', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(CrossOriginResourcePolicy)) {
                const ctx = new MockContext();
                Security({crossOriginResourcePolicy: el})(ctx);
                assert.equal(ctx.headers['Cross-Origin-Resource-Policy'], el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({crossOriginResourcePolicy: null})(ctx);
            assert.ok(!('Cross-Origin-Resource-Policy' in ctx.headers));
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                assert.throws(
                    () => Security({crossOriginResourcePolicy: el as any})(new MockContext()),
                    new Error('TriFrostMiddleware@Security: Invalid configuration for crossOriginResourcePolicy')
                );
            }
        });
    });

    describe('originAgentCluster', () => {
        it('Sets "?1" when value is true', () => {
            const ctx = new MockContext();
            Security({originAgentCluster: true})(ctx);
            assert.equal(ctx.headers['Origin-Agent-Cluster'], '?1');
        });

        it('Sets "?0" when value is false', () => {
            const ctx = new MockContext();
            Security({originAgentCluster: false})(ctx);
            assert.equal(ctx.headers['Origin-Agent-Cluster'], '?0');
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({originAgentCluster: null})(ctx);
            assert.ok(!('Origin-Agent-Cluster' in ctx.headers));
        });

        it('Throws on non-boolean, non-null values', () => {
            for (const el of CONSTANTS.NOT_BOOLEAN) {
                if (el === null || el === undefined) continue;
                assert.throws(() => {
                    Security({originAgentCluster: el as any});
                }, new Error('TriFrostMiddleware@Security: Invalid configuration for originAgentCluster'));
            }
        });
    });

    describe('referrerPolicy', () => {
        it('Sets header from a valid single string', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: 'no-referrer'})(ctx);
            assert.equal(ctx.headers['Referrer-Policy'], 'no-referrer');
        });

        it('Sets header from a valid array of strings', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: ['origin', 'same-origin']})(ctx);
            assert.equal(ctx.headers['Referrer-Policy'], 'origin, same-origin');
        });

        it('Deduplicates repeated values in array', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: ['strict-origin', 'strict-origin']})(ctx);
            assert.equal(ctx.headers['Referrer-Policy'], 'strict-origin');
        });

        it('Trims and deduplicates strings with whitespace', () => {
            const ctx = new MockContext();
            /* @ts-ignore */
            Security({referrerPolicy: [' strict-origin ', 'strict-origin']})(ctx);
            assert.equal(ctx.headers['Referrer-Policy'], 'strict-origin');
        });

        it('Allows usage of ReferrerPolicy enum values', () => {
            const ctx = new MockContext();
            Security({
                referrerPolicy: [
                    ReferrerPolicy.Origin,
                    ReferrerPolicy.SameOrigin,
                ],
            })(ctx);
            assert.equal(ctx.headers['Referrer-Policy'], 'origin, same-origin');
        });

        it('Throws on a single invalid string', () => {
            assert.throws(() => {
                Security({referrerPolicy: 'not-a-policy' as any});
            }, new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy'));
        });

        it('Throws on a mixed array containing any invalid string', () => {
            assert.throws(() => {
                Security({referrerPolicy: ['origin', 'foobar'] as any});
            }, new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy'));
        });

        it('Throws if passed an empty array', () => {
            assert.throws(() => {
                Security({referrerPolicy: []});
            }, new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy'));
        });

        it('Throws if passed an array with only invalid values', () => {
            assert.throws(() => {
                Security({referrerPolicy: ['foo', 'bar'] as any});
            }, new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy'));
        });

        it('Omits header if passed null', () => {
            const ctx = new MockContext();
            Security({referrerPolicy: null})(ctx);
            assert.ok(!('Referrer-Policy' in ctx.headers));
        });

        it('Throws on invalid types', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                if (el === undefined || el === null) continue;
                assert.throws(() => {
                    Security({referrerPolicy: el as any});
                }, new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy'));
            }
        });
    });

    describe('strictTransportSecurity', () => {
        it('Sets only max-age if includeSubDomains and preload are missing', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {maxAge: 12345},
            })(ctx);
            assert.equal(ctx.headers['Strict-Transport-Security'], 'max-age=12345');
        });

        it('Sets max-age + includeSubDomains when true', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {maxAge: 86400, includeSubDomains: true},
            })(ctx);
            assert.equal(ctx.headers['Strict-Transport-Security'], 'max-age=86400; includeSubDomains');
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
            assert.equal(ctx.headers['Strict-Transport-Security'], 'max-age=31536001; includeSubDomains; preload');
        });

        it('Omits preload if includeSubDomains not set', () => {
            const ctx = new MockContext();
            Security({
                strictTransportSecurity: {
                    maxAge: 31536001,
                    preload: true,
                },
            })(ctx);
            assert.equal(ctx.headers['Strict-Transport-Security'], 'max-age=31536001');
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
            assert.equal(ctx.headers['Strict-Transport-Security'], 'max-age=1000; includeSubDomains');
        });

        it('Handles null by omitting header', () => {
            const ctx = new MockContext();
            Security({strictTransportSecurity: null})(ctx);
            assert.ok(!('Strict-Transport-Security' in ctx.headers));
        });

        it('Throws when object lacks valid maxAge', () => {
            for (const el of [...CONSTANTS.NOT_INTEGER, -1, 0, 10.5]) {
                assert.throws(() => {
                    Security({
                        strictTransportSecurity: {maxAge: el as number},
                    });
                }, new Error('TriFrostMiddleware@Security: Invalid configuration for strictTransportSecurity'));
            }
        });

        it('Throws when given non/empty-object value', () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (el === undefined || el === null) continue;
                assert.throws(() => {
                    Security({
                        strictTransportSecurity: el as any,
                    });
                }, new Error('TriFrostMiddleware@Security: Invalid configuration for strictTransportSecurity'));
            }
        });

        it('Throws when given unrelated keys', () => {
            assert.throws(() => {
                Security({
                    strictTransportSecurity: {foo: 'bar'} as any,
                });
            }, new Error('TriFrostMiddleware@Security: Invalid configuration for strictTransportSecurity'));
        });
    });

    describe('xContentTypeOptions', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XContentTypes)) {
                const ctx = new MockContext();
                Security({xContentTypeOptions: el})(ctx);
                assert.equal(ctx.headers['X-Content-Type-Options'], el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xContentTypeOptions: null})(ctx);
            assert.ok(!('X-Content-Type-Options' in ctx.headers));
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                assert.throws(
                    () => Security({xContentTypeOptions: el as any})(new MockContext()),
                    new Error('TriFrostMiddleware@Security: Invalid configuration for xContentTypeOptions')
                );
            }
        });
    });

    describe('xDnsPrefetchControl', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XDnsPrefetchControl)) {
                const ctx = new MockContext();
                Security({xDnsPrefetchControl: el})(ctx);
                assert.equal(ctx.headers['X-DNS-Prefetch-Control'], el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xDnsPrefetchControl: null})(ctx);
            assert.ok(!('X-DNS-Prefetch-Control' in ctx.headers));
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                assert.throws(
                    () => Security({xDnsPrefetchControl: el as any})(new MockContext()),
                    new Error('TriFrostMiddleware@Security: Invalid configuration for xDnsPrefetchControl')
                );
            }
        });
    });

    describe('xDownloadOptions', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XDownloadOptions)) {
                const ctx = new MockContext();
                Security({xDownloadOptions: el})(ctx);
                assert.equal(ctx.headers['X-Download-Options'], el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xDownloadOptions: null})(ctx);
            assert.ok(!('X-Download-Options' in ctx.headers));
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                assert.throws(
                    () => Security({xDownloadOptions: el as any})(new MockContext()),
                    new Error('TriFrostMiddleware@Security: Invalid configuration for xDownloadOptions')
                );
            }
        });
    });

    describe('xFrameOptions', () => {
        it('Allows all the possible values', () => {
            for (const el of Object.values(XFrameOptions)) {
                const ctx = new MockContext();
                Security({xFrameOptions: el})(ctx);
                assert.equal(ctx.headers['X-Frame-Options'], el);
            }
        });

        it('Omits header when null is passed', () => {
            const ctx = new MockContext();
            Security({xFrameOptions: null})(ctx);
            assert.ok(!('X-Frame-Options' in ctx.headers));
        });

        it('Throws on non-recognized values', () => {
            for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'foo', 'bar']) {
                if (el === undefined || el === null) continue;
                assert.throws(
                    () => Security({xFrameOptions: el as any})(new MockContext()),
                    new Error('TriFrostMiddleware@Security: Invalid configuration for xFrameOptions')
                );
            }
        });
    });

    describe('xXssProtection', () => {
        it('Sets "0" to disable protection', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '0'})(ctx);
            assert.equal(ctx.headers['X-XSS-Protection'], '0');
        });

        it('Sets "1" to enable basic protection', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '1'})(ctx);
            assert.equal(ctx.headers['X-XSS-Protection'], '1');
        });

        it('Sets "block" to enable block mode', () => {
            const ctx = new MockContext();
            Security({xXssProtection: 'block'})(ctx);
            assert.equal(ctx.headers['X-XSS-Protection'], '1; mode=block');
        });

        it('Sets "report" with slash-prefixed URI', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '/report/xss'})(ctx);
            assert.equal(ctx.headers['X-XSS-Protection'], '1; report=/report/xss');
        });

        it('Trims and applies report URI', () => {
            const ctx = new MockContext();
            Security({xXssProtection: '  /report-me  '})(ctx);
            assert.equal(ctx.headers['X-XSS-Protection'], '1; report=/report-me');
        });

        it('Does not set header when explicitly null', () => {
            const ctx = new MockContext();
            Security({xXssProtection: null})(ctx);
            assert.ok(!('X-XSS-Protection' in ctx.headers));
        });

        it('Throws if string is not valid and doesn’t start with slash', () => {
            assert.throws(() => {
                Security({xXssProtection: 'report-me' as any});
            }, new Error('TriFrostMiddleware@Security: Invalid configuration for xXssProtection'));
        });

        it('Throws if non/empty-string type is passed', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                if (el === undefined || el === null) continue;
                assert.throws(() => {
                    Security({xXssProtection: el as any});
                }, new Error('TriFrostMiddleware@Security: Invalid configuration for xXssProtection'));
            }
        });
    });
});
