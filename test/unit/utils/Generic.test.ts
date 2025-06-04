import {describe, it, expect} from 'vitest';
import {isDevMode} from '../../../lib/utils/Generic';

describe('Utils - isDevMode', () => {
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
