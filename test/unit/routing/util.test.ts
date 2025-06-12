import {describe, it, expect, vi} from 'vitest';
import {
    isValidHandler,
    isValidGrouper,
    isValidMiddleware,
    isValidLimit,
    isValidBodyParser,
    normalizeMiddleware,
} from '../../../lib/routing/util';
import CONSTANTS from '../../constants';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    Sym_TriFrostName,
} from '../../../lib';

describe('routing - util', () => {
    describe('isValidHandler', () => {
        describe('fn', () => {
            it('Returns true for a plain function', () => {
                const fn = () => {};
                expect(isValidHandler(fn)).toBe(true);
            });

            it('Returns false for invalid fn', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(isValidHandler(el as any)).toBe(false);
                }
            });
        });

        describe('config', () => {
            it('Returns true for config with valid fn', () => {
                const config = {fn: () => {}, timeout: 10};
                expect(isValidHandler(config)).toBe(true);
            });

            it('Returns false for config without fn', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(isValidHandler({timeout: 10, fn: el} as any)).toBe(false);
                }
            });

            it('Returns false for config with invalid timeout', () => {
                for (const el of [...CONSTANTS.NOT_INTEGER, 0, -10, 10.5]) {
                    if (el === undefined || el === null) continue;
                    expect(isValidHandler({fn: () => {}, timeout: el} as any)).toBe(false);
                }
            });

            it('Returns true if timeout is null', () => {
                const config = {fn: () => {}, timeout: null};
                expect(isValidHandler(config)).toBe(true);
            });
        });
    });

    describe('isValidGrouper', () => {
        describe('fn', () => {
            it('Returns true for a plain function', () => {
                const fn = () => {};
                expect(isValidGrouper(fn)).toBe(true);
            });

            it('Returns false for invalid fn', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(isValidGrouper(el as any)).toBe(false);
                }
            });
        });

        describe('config', () => {
            it('Returns true for config with valid fn', () => {
                const config = {fn: () => {}, timeout: 10};
                expect(isValidGrouper(config)).toBe(true);
            });

            it('Returns false for config without fn', () => {
                for (const el of CONSTANTS.NOT_FUNCTION) {
                    expect(isValidGrouper({timeout: 10, fn: el} as any)).toBe(false);
                }
            });

            it('Returns false for config with invalid timeout', () => {
                for (const el of [...CONSTANTS.NOT_INTEGER, 0, -10, 10.5]) {
                    if (el === undefined || el === null) continue;
                    expect(isValidGrouper({fn: () => {}, timeout: el} as any)).toBe(false);
                }
            });

            it('Returns true if timeout is null', () => {
                const config = {fn: () => {}, timeout: null};
                expect(isValidGrouper(config)).toBe(true);
            });
        });
    });

    describe('isValidMiddleware', () => {
        it('Returns true for a function', () => {
            const mw = () => {};
            expect(isValidMiddleware(mw)).toBe(true);
        });

        it('Returns false for non-function', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                expect(isValidMiddleware(el as any)).toBe(false);
            }
        });
    });

    describe('isValidLimit', () => {
        it('Returns true for a positive integer', () => {
            expect(isValidLimit(10)).toBe(true);
        });

        it('Returns true for a function', () => {
            expect(isValidLimit((() => {}) as any)).toBe(true);
        });

        it('Returns false for negative or zero number', () => {
            for (const el of [...CONSTANTS.NOT_INTEGER, -10, 10.5, 0]) {
                if (typeof el === 'function') continue;
                expect(isValidLimit(el as any)).toBe(false);
            }
        });

        it('Returns false for non-number, non-function', () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                if (Number.isInteger(el) && (el as number) > 0) continue;
                expect(isValidLimit(el as any)).toBe(false);
            }
        });
    });

    describe('isValidBodyParser', () => {
        it('Returns true for null', () => {
            expect(isValidBodyParser(null)).toBe(true);
        });

        it('Returns true for plain object', () => {
            expect(isValidBodyParser({})).toBe(true);
            expect(isValidBodyParser({limit: 999_999})).toBe(true);
        });

        it('Returns false for non-object, non-null', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === null) continue;
                expect(isValidBodyParser(el as any)).toBe(false);
            }
        });
    });

    describe('normalizeMiddleware', () => {
        it('Normalizes middleware with default anonymous fields', () => {
            const fn = vi.fn();
            const result = normalizeMiddleware([fn]);
            expect(result).toEqual([
                {
                    name: 'anonymous_mware',
                    description: null,
                    fingerprint: null,
                    handler: fn,
                },
            ]);
        });

        it('Extracts Sym_TriFrostName, Sym_TriFrostDescription, and Sym_TriFrostFingerPrint', () => {
            const fn = vi.fn();
            Reflect.set(fn, Sym_TriFrostName, 'mw_name');
            Reflect.set(fn, Sym_TriFrostDescription, 'middleware description');
            Reflect.set(fn, Sym_TriFrostFingerPrint, 'xyz-123');

            const result = normalizeMiddleware([fn]);
            expect(result[0]).toEqual({
                name: 'mw_name',
                description: 'middleware description',
                fingerprint: 'xyz-123',
                handler: fn,
            });
        });

        it('Falls back to null for description and fingerprint if not set', () => {
            const fn = vi.fn();
            Reflect.set(fn, Sym_TriFrostName, 'just_name');

            const result = normalizeMiddleware([fn]);
            expect(result[0]).toEqual({
                name: 'just_name',
                description: null,
                fingerprint: null,
                handler: fn,
            });
        });
    });
});
