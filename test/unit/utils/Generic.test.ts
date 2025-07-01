import {describe, it, expect} from 'vitest';
import {
    hexId,
    djb2Hash,
    isDevMode,
    determineDebug,
    determineName,
    determineVersion,
    determinePort,
    injectBefore,
    prependDocType,
} from '../../../lib/utils/Generic';
import CONSTANTS from '../../constants';

describe('Utils - Generic', () => {
    describe('hexId', () => {
        it('Returns empty string for non-numeric or non-positive lengths', () => {
            for (const el of [...CONSTANTS.NOT_NUMERIC, -100, -1, 0, 0.5, 3.14]) {
                expect(hexId(el as number)).toBe('');
            }
        });

        it('Returns 16-char hex string for lng=8', () => {
            const id = hexId(8);
            expect(id).toMatch(/^[a-f0-9]{16}$/);
        });

        it('Returns 32-char hex string for lng=16', () => {
            const id = hexId(16);
            expect(id).toMatch(/^[a-f0-9]{32}$/);
        });

        it('Returns correct length for arbitrary valid lengths', () => {
            expect(hexId(3)).toMatch(/^[a-f0-9]{6}$/);
            expect(hexId(10)).toMatch(/^[a-f0-9]{20}$/);
            expect(hexId(32)).toMatch(/^[a-f0-9]{64}$/);
        });

        it('Returns correct length for arbitrary small values', () => {
            expect(hexId(1)).toMatch(/^[a-f0-9]{2}$/);
            expect(hexId(2)).toMatch(/^[a-f0-9]{4}$/);
            expect(hexId(7)).toMatch(/^[a-f0-9]{14}$/);
            expect(hexId(9)).toMatch(/^[a-f0-9]{18}$/);
        });

        it('Handles long values without issue', () => {
            const id = hexId(100); // 200 chars
            expect(id.length).toBe(200);
            expect(id).toMatch(/^[a-f0-9]{200}$/);
        });

        it('Returns different values on successive calls (non-repeating)', () => {
            const id1 = hexId(8);
            const id2 = hexId(8);
            expect(id1).not.toBe(id2);
        });

        it('Returns different values on repeated calls (likely unique)', () => {
            const seen = new Set<string>();
            for (let i = 0; i < 1000; i++) {
                const id = hexId(16);
                expect(seen.has(id)).toBe(false);
                seen.add(id);
            }
        });
    });

    describe('djb2Hash', () => {
        it('Should produce a consistent hash for a given string', () => {
            const hash1 = djb2Hash('hello world');
            const hash2 = djb2Hash('hello world');
            expect(hash1).toBe(hash2);
        });

        it('Should produce different hashes for different strings', () => {
            const h1 = djb2Hash('a');
            const h2 = djb2Hash('b');
            expect(h1).not.toBe(h2);
        });

        it('Should return a base36 string', () => {
            const hash = djb2Hash('example');
            expect(hash).toMatch(/^[0-9a-z]+$/);
        });

        it('Should handle empty string', () => {
            const hash = djb2Hash('');
            expect(typeof hash).toBe('string');
            expect(hash.length).toBeGreaterThan(0);
        });

        it('Should be case-sensitive', () => {
            expect(djb2Hash('FOO')).not.toBe(djb2Hash('foo'));
        });

        it('Should handle unicode characters', () => {
            expect(() => djb2Hash('🚀🌌')).not.toThrow();
            expect(typeof djb2Hash('🚀🌌')).toBe('string');
        });

        it('Should handle very long strings', () => {
            const long = 'a'.repeat(10_000);
            const hash = djb2Hash(long);
            expect(typeof hash).toBe('string');
            expect(hash.length).toBeGreaterThan(0);
        });
    });

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
