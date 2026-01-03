import {describe, it, expect} from 'vitest';
import {
    isDevMode,
    determineDebug,
    determineName,
    determineVersion,
    determinePort,
    injectBefore,
    prependDocType,
    determineHost,
    determineTrustProxy,
} from '../../../lib/utils/Generic';
import CONSTANTS from '../../constants';

describe('Utils - Generic', () => {
    describe('prependDocType', () => {
        it('Returns an empty string if provided a non-string', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                expect(prependDocType(el as any)).toBe('');
            }
        });

        it('Returns the provided string if it doesnt start with html', () => {
            expect(prependDocType('<span>Hello</span>')).toBe('<span>Hello</span>');
            expect(prependDocType('<body>Hello</body>')).toBe('<body>Hello</body>');
            expect(prependDocType('Hello World')).toBe('Hello World');
        });

        it('Returns the provided string prefixed with <!DOCTYPE html> if it starts with <html', () => {
            expect(prependDocType('<html><body>Hello</body></html>')).toBe('<!DOCTYPE html><html><body>Hello</body></html>');
        });

        it('Does not prepend already prefixed html', () => {
            expect(prependDocType('<!DOCTYPE html><html><body>Hello</body></html>')).toBe('<!DOCTYPE html><html><body>Hello</body></html>');
        });
    });

    describe('injectBefore', () => {
        it('Injects before the first candidate found', () => {
            const html = '<html><head></head><body></body></html>';
            const val = '<script>alert(1)</script>';
            const out = injectBefore(html, val, ['</head>', '</body>']);
            expect(out).toContain(val);
            expect(out.indexOf(val)).toBeLessThan(out.indexOf('</head>'));
        });

        it('Falls back to the next candidate if the first is not found', () => {
            const html = '<html><body></body></html>';
            const val = '<style>.x{}</style>';
            const out = injectBefore(html, val, ['</head>', '</body>']);
            expect(out).toContain(val);
            expect(out.indexOf(val)).toBeLessThan(out.indexOf('</body>'));
        });

        it('Returns the original string if no candidates match', () => {
            const html = '<div>Hello</div>';
            const val = '<style>.test{}</style>';
            const out = injectBefore(html, val, ['</head>', '</footer>']);
            expect(out).toBe(html);
        });

        it('Handles empty candidate list gracefully', () => {
            const html = '<div>Foo</div>';
            const out = injectBefore(html, '<x>', []);
            expect(out).toBe(html);
        });

        it('Handles empty value gracefully', () => {
            const html = '<html><body></body></html>';
            const out = injectBefore(html, '', ['</body>']);
            expect(out).toBe('<html><body></body></html>');
        });

        it('Handles multiple candidate matches (only inserts before first)', () => {
            const html = '<div></div><footer></footer>';
            const val = '<!-- injected -->';
            const out = injectBefore(html, val, ['</footer>', '</div>']);
            expect(out.indexOf(val)).toBe(html.indexOf('</footer>'));
        });

        it('Injects into complex HTML structures', () => {
            const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><main></main></body></html>';
            const val = '<script src="x.js"></script>';
            const out = injectBefore(html, val, ['</head>', '</body>']);
            expect(out).toContain(val);
            expect(out.indexOf(val)).toBeLessThan(out.indexOf('</head>'));
        });
    });

    describe('isDevMode', () => {
        it('Returns true if TRIFROST_DEV and NODE_ENV are set but undefined (due to NODE_ENV not being production)', () => {
            expect(isDevMode({TRIFROST_DEV: undefined, NODE_ENV: undefined})).toBe(true);
        });

        it('Returns true if TRIFROST_DEV is "true" or "1"', () => {
            expect(isDevMode({TRIFROST_DEV: 'true'})).toBe(true);
            expect(isDevMode({TRIFROST_DEV: '1'})).toBe(true);
            expect(isDevMode({TRIFROST_DEV: 'TrUe'})).toBe(true);
        });

        it('Returns false if TRIFROST_DEV is "false" or "0"', () => {
            expect(isDevMode({TRIFROST_DEV: 'false'})).toBe(false);
            expect(isDevMode({TRIFROST_DEV: '0'})).toBe(false);
            expect(isDevMode({TRIFROST_DEV: 'FaLsE'})).toBe(false);
        });

        it('Falls back to NODE_ENV if TRIFROST_DEV is not set', () => {
            expect(isDevMode({NODE_ENV: 'development'})).toBe(true);
            expect(isDevMode({NODE_ENV: 'staging'})).toBe(true);
            expect(isDevMode({NODE_ENV: 'production'})).toBe(false);
            expect(isDevMode({NODE_ENV: 'PRODUCTION'})).toBe(false);
        });

        it('Ignores invalid TRIFROST_DEV and falls back to NODE_ENV', () => {
            expect(isDevMode({NODE_ENV: 'production', TRIFROST_DEV: 'maybe'})).toBe(false);
            expect(isDevMode({NODE_ENV: 'development', TRIFROST_DEV: 'nope'})).toBe(true);
        });

        it('Defaults to false if neither TRIFROST_DEV nor NODE_ENV is set', () => {
            expect(isDevMode({})).toBe(false);
        });
    });

    describe('determineTrustProxy', () => {
        it('Returns true if TRIFROST_TRUSTPROXY is "true" or "1"', () => {
            expect(determineTrustProxy({TRIFROST_TRUSTPROXY: 'true'}, false)).toBe(true);
            expect(determineTrustProxy({TRIFROST_TRUSTPROXY: '1'}, false)).toBe(true);
            expect(determineTrustProxy({TRIFROST_TRUSTPROXY: 'TrUe'}, false)).toBe(true);
        });

        it('Returns false if TRIFROST_TRUSTPROXY is "false" or "0"', () => {
            expect(determineTrustProxy({TRIFROST_TRUSTPROXY: 'false'}, true)).toBe(false);
            expect(determineTrustProxy({TRIFROST_TRUSTPROXY: '0'}, true)).toBe(false);
            expect(determineTrustProxy({TRIFROST_TRUSTPROXY: 'FaLsE'}, true)).toBe(false);
        });

        it('Falls back to SERVICE_TRUSTPROXY if TRIFROST_TRUSTPROXY is not set', () => {
            expect(determineTrustProxy({SERVICE_TRUSTPROXY: '1'}, false)).toBe(true);
            expect(determineTrustProxy({SERVICE_TRUSTPROXY: 'false'}, true)).toBe(false);
        });

        it('Falls back to TRUSTPROXY if others are not set', () => {
            expect(determineTrustProxy({TRUSTPROXY: 'true'}, false)).toBe(true);
            expect(determineTrustProxy({TRUSTPROXY: '0'}, true)).toBe(false);
        });

        it('Returns default if all relevant env values are undefined', () => {
            expect(determineTrustProxy({}, true)).toBe(true);
            expect(determineTrustProxy({}, false)).toBe(false);
        });

        it('Returns default if env value is an unrecognized string', () => {
            expect(determineTrustProxy({TRIFROST_TRUSTPROXY: 'maybe'}, true)).toBe(true);
            expect(determineTrustProxy({TRUSTPROXY: 'nope'}, false)).toBe(false);
        });

        it('Handles boolean and numeric values correctly', () => {
            expect(determineTrustProxy({TRUSTPROXY: true}, false)).toBe(true);
            expect(determineTrustProxy({TRUSTPROXY: false}, true)).toBe(false);
            expect(determineTrustProxy({TRUSTPROXY: 1}, false)).toBe(true);
            expect(determineTrustProxy({TRUSTPROXY: 0}, true)).toBe(false);
        });
    });

    describe('determineName', () => {
        it('Returns TRIFROST_NAME if present and non-empty', () => {
            expect(determineName({TRIFROST_NAME: 'frosty'})).toBe('frosty');
        });

        it('Falls back to SERVICE_NAME if TRIFROST_NAME is missing', () => {
            expect(determineName({SERVICE_NAME: 'fallback-service'})).toBe('fallback-service');
        });

        it('Falls back to default if none present', () => {
            expect(determineName({})).toBe('trifrost');
        });

        it('Falls back to default if values are non/empty strings', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                expect(determineName({TRIFROST_NAME: el, SERVICE_NAME: el})).toBe('trifrost');
            }
        });

        it('Returns default if coerced value is too long', () => {
            expect(determineName({TRIFROST_NAME: 'a'.repeat(500)})).toBe('trifrost');
        });

        it('Trims whitespace from value before validation', () => {
            expect(determineName({TRIFROST_NAME: '  foo-service  '})).toBe('foo-service');
        });
    });

    describe('determineVersion', () => {
        it('Returns TRIFROST_VERSION if present and valid', () => {
            expect(determineVersion({TRIFROST_VERSION: '2.3.4'})).toBe('2.3.4');
        });

        it('Uses SERVICE_VERSION if TRIFROST_VERSION is not present', () => {
            expect(determineVersion({SERVICE_VERSION: '0.9.1'})).toBe('0.9.1');
        });

        it('Uses VERSION if others are not present', () => {
            expect(determineVersion({VERSION: '1.2.3'})).toBe('1.2.3');
        });

        it('Falls back to default if all are missing or non/empty strings', () => {
            expect(determineVersion({})).toBe('1.0.0');
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                expect(determineVersion({VERSION: el})).toBe('1.0.0');
            }
        });

        it('Trims whitespace from value before validation', () => {
            expect(determineVersion({TRIFROST_VERSION: '  1.0.0  '})).toBe('1.0.0');
        });
    });

    describe('determinePort', () => {
        it('Returns 3000 if passed nothing', () => {
            expect(determinePort()).toBe(3000);
        });

        it('Returns 3000 if passed a non-object env and nothing else', () => {
            for (const el of CONSTANTS.NOT_OBJECT) expect(determinePort(el as any)).toBe(3000);
        });

        it('Returns 3000 if passed an object env and a chosen port, but the port is a non-integer', () => {
            for (const el of CONSTANTS.NOT_INTEGER) expect(determinePort({}, el as number)).toBe(3000);
        });

        it('Returns 3000 if passed an object env and a chosen port, but the port is not in the valid range', () => {
            for (const el of [-1, 0, 80.9, 65536]) expect(determinePort({}, el)).toBe(3000);
        });

        it('Returns the chosen port if a chosen port is provided', () => {
            expect(determinePort({}, 9000)).toBe(9000);
        });

        it('Prefers chosen port over env-based port if both are valid', () => {
            expect(determinePort({TRIFROST_PORT: 9999}, 9000)).toBe(9000);
        });

        describe('Multiple ports', () => {
            it('Prefers TRIFROST_PORT over SERVICE_PORT', () => {
                expect(
                    determinePort({
                        TRIFROST_PORT: '9999',
                        SERVICE_PORT: '8888',
                        PORT: '7777',
                    }),
                ).toBe(9999);
            });

            it('Prefers SERVICE_PORT over PORT', () => {
                expect(
                    determinePort({
                        SERVICE_PORT: '8888',
                        PORT: '7777',
                    }),
                ).toBe(8888);
            });
        });

        describe('TRIFROST_PORT', () => {
            it('Returns 3000 if passed a TRIFROST_PORT env but the port is a non-integer', () => {
                for (const el of CONSTANTS.NOT_INTEGER) expect(determinePort({TRIFROST_PORT: el})).toBe(3000);
            });

            it('Returns 3000 if passed a TRIFROST_PORT env but the port is not in the valid range', () => {
                for (const el of [-1, 0, 80.9, 65536]) expect(determinePort({TRIFROST_PORT: el})).toBe(3000);
            });

            it('Returns TRIFROST_PORT if valid', () => {
                expect(determinePort({TRIFROST_PORT: 9999})).toBe(9999);
            });

            it('Coerces string TRIFROST_PORT into integer and returns 3000 if not valid', () => {
                for (const el of [-1, 0, 65536]) expect(determinePort({TRIFROST_PORT: String(el)})).toBe(3000);
            });

            it('Coerces string TRIFROST_PORT into integer and returns as number if valid', () => {
                expect(determinePort({TRIFROST_PORT: '80.9'})).toBe(80);
                expect(determinePort({TRIFROST_PORT: '9999'})).toBe(9999);
            });
        });

        describe('SERVICE_PORT', () => {
            it('Returns 3000 if passed a SERVICE_PORT env but the port is a non-integer', () => {
                for (const el of CONSTANTS.NOT_INTEGER) expect(determinePort({SERVICE_PORT: el})).toBe(3000);
            });

            it('Returns 3000 if passed a SERVICE_PORT env but the port is not in the valid range', () => {
                for (const el of [-1, 0, 80.9, 65536]) expect(determinePort({SERVICE_PORT: el})).toBe(3000);
            });

            it('Returns SERVICE_PORT if valid', () => {
                expect(determinePort({SERVICE_PORT: 9999})).toBe(9999);
            });

            it('Coerces string SERVICE_PORT into integer and returns 3000 if not valid', () => {
                for (const el of [-1, 0, 65536]) expect(determinePort({SERVICE_PORT: String(el)})).toBe(3000);
            });

            it('Coerces string SERVICE_PORT into integer and returns as number if valid', () => {
                expect(determinePort({SERVICE_PORT: '80.9'})).toBe(80);
                expect(determinePort({SERVICE_PORT: '9999'})).toBe(9999);
            });
        });

        describe('PORT', () => {
            it('Returns 3000 if passed a PORT env but the port is a non-integer', () => {
                for (const el of CONSTANTS.NOT_INTEGER) expect(determinePort({PORT: el})).toBe(3000);
            });

            it('Returns 3000 if passed a PORT env but the port is not in the valid range', () => {
                for (const el of [-1, 0, 80.9, 65536]) expect(determinePort({PORT: el})).toBe(3000);
            });

            it('Returns PORT if valid', () => {
                expect(determinePort({PORT: 9999})).toBe(9999);
            });

            it('Coerces string PORT into integer and returns 3000 if not valid', () => {
                for (const el of [-1, 0, 65536]) expect(determinePort({PORT: String(el)})).toBe(3000);
            });

            it('Coerces string PORT into integer and returns as number if valid', () => {
                expect(determinePort({PORT: '80.9'})).toBe(80);
                expect(determinePort({PORT: '9999'})).toBe(9999);
            });
        });
    });

    describe('determineHost', () => {
        it('Returns TRIFROST_HOST if valid', () => {
            expect(determineHost({TRIFROST_HOST: '127.0.0.1'})).toBe('127.0.0.1');
        });

        it('Falls back to SERVICE_HOST if TRIFROST_HOST is missing', () => {
            expect(determineHost({SERVICE_HOST: '192.168.1.100'})).toBe('192.168.1.100');
        });

        it('Falls back to HOST if others missing', () => {
            expect(determineHost({HOST: 'localhost'})).toBe('localhost');
        });

        it('Trims whitespace and accepts valid length', () => {
            expect(determineHost({TRIFROST_HOST: '  example.com  '})).toBe('example.com');
        });

        it('Returns default when no valid host present', () => {
            expect(determineHost({})).toBe('0.0.0.0');
            expect(determineHost({HOST: '  '})).toBe('0.0.0.0');
            expect(determineHost({HOST: 'x'.repeat(256)})).toBe('0.0.0.0');
            expect(determineHost({TRIFROST_HOST: null})).toBe('0.0.0.0');
        });

        it('Handles invalid input types safely', () => {
            for (const val of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                expect(determineHost({HOST: val})).toBe('0.0.0.0');
            }

            for (const val of CONSTANTS.NOT_OBJECT) {
                expect(determineHost(val as any)).toBe('0.0.0.0');
            }
        });
    });

    describe('determineDebug', () => {
        it('Returns true for TRIFROST_DEBUG true/1', () => {
            expect(determineDebug({TRIFROST_DEBUG: true})).toBe(true);
            expect(determineDebug({TRIFROST_DEBUG: 'true'})).toBe(true);
            expect(determineDebug({TRIFROST_DEBUG: '1'})).toBe(true);
        });

        it('Returns false for TRIFROST_DEBUG false/0', () => {
            expect(determineDebug({TRIFROST_DEBUG: false})).toBe(false);
            expect(determineDebug({TRIFROST_DEBUG: 'false'})).toBe(false);
            expect(determineDebug({TRIFROST_DEBUG: '0'})).toBe(false);
        });

        it('Returns false for TRIFROST_DEBUG "production"', () => {
            expect(determineDebug({TRIFROST_DEBUG: 'production'})).toBe(false);
        });

        it('Returns true for DEBUG true/1', () => {
            expect(determineDebug({DEBUG: 'true'})).toBe(true);
            expect(determineDebug({DEBUG: '1'})).toBe(true);
        });

        it('Returns false for DEBUG false/0/production', () => {
            expect(determineDebug({DEBUG: 'false'})).toBe(false);
            expect(determineDebug({DEBUG: '0'})).toBe(false);
            expect(determineDebug({DEBUG: 'production'})).toBe(false);
        });

        it('Uses NODE_ENV fallback only if no TRIFROST_DEBUG or DEBUG', () => {
            expect(determineDebug({NODE_ENV: 'development'})).toBe(false);
            expect(determineDebug({NODE_ENV: 'production'})).toBe(false);
        });

        it('Defaults to false for unrecognized or missing values', () => {
            expect(determineDebug({})).toBe(false);
            expect(determineDebug({TRIFROST_DEBUG: 'nope'})).toBe(false);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                if (el === true) continue;
                expect(determineDebug({TRIFROST_DEBUG: el})).toBe(false);
            }
        });
    });
});
