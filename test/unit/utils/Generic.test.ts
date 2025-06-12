import {describe, it, expect} from 'vitest';
import {hexId, isDevMode} from '../../../lib/utils/Generic';
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
});
