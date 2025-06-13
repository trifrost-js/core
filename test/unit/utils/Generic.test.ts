import {describe, it, expect} from 'vitest';
import {
    hexId,
    isDevMode,
    determineDebug,
    determineName,
    determineVersion,
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
