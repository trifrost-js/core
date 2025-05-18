import {isAsyncFn} from '@valkyriestudios/utils/function';
import {describe, it, expect} from 'vitest';
import {
    CacheControl,
    ParseAndApplyCacheControl,
    type TriFrostCacheControlOptions,
} from '../../../lib/middleware/CacheControl';
import {MockContext} from '../../MockContext';
import CONSTANTS from '../../constants';
import {
    Sym_TriFrostDescription,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../../../lib/types/constants';

describe('Middleware - CacheControl', () => {
    it('Returns a function that is non-async', () => {
        const fn = CacheControl();
        expect(typeof fn).toBe('function');
        expect(isAsyncFn(fn)).toBe(false);
    });

    it('Returns a function with TriFrost symbols set', () => {
        const fn = CacheControl();
        expect(Reflect.get(fn, Sym_TriFrostName)).toBe('TriFrostCacheControl');
        expect(Reflect.get(fn, Sym_TriFrostType)).toBe('middleware');
        expect(Reflect.get(fn, Sym_TriFrostDescription)).toBe('Middleware adding Cache-Control headers to contexts passing through it');
    });

    it('Sets a valid Cache-Control header with type only', () => {
        const ctx = new MockContext();
        CacheControl({type: 'no-cache'})(ctx);
        expect(ctx.headers['Cache-Control']).toBe('no-cache');
    });

    it('Sets a valid Cache-Control header with maxage only', () => {
        const ctx = new MockContext();
        CacheControl({maxage: 3600})(ctx);
        expect(ctx.headers['Cache-Control']).toBe('max-age=3600');
    });

    it('Sets a valid Cache-Control header with type and maxage', () => {
        const ctx = new MockContext();
        CacheControl({type: 'private', maxage: 600})(ctx);
        expect(ctx.headers['Cache-Control']).toBe('private, max-age=600');
    });

    it('Ignores invalid type', () => {
        for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'totally-bogus']) {
            const ctx = new MockContext();
            CacheControl({type: el as any, maxage: 120})(ctx);
            expect(ctx.headers['Cache-Control']).toBe('max-age=120');
        }
    });

    it('Ignores non-positive-integer maxage', () => {
        for (const el of [...CONSTANTS.NOT_INTEGER, 0, -10, 1.5, -99.99, 99.99]) {
            const ctx = new MockContext();
            CacheControl({type: 'public', maxage: el as number})(ctx);
            expect(ctx.headers['Cache-Control']).toBe('public');
        }
    });

    it('Does not apply header if options are missing or invalid', () => {
        const invalids = [null, undefined, false, {}, {type: 'junk'}];
        for (const el of invalids) {
            const ctx = new MockContext();
            CacheControl(el as TriFrostCacheControlOptions)(ctx);
            expect(ctx.headers).not.toHaveProperty('Cache-Control');
        }
    });

    describe('ParseAndApplyCacheControl', () => {
        it('Applies valid header', () => {
            const ctx = new MockContext();
            ParseAndApplyCacheControl(ctx, {type: 'public', maxage: 60});
            expect(ctx.headers['Cache-Control']).toBe('public, max-age=60');
        });

        it('Skips setting header if invalid', () => {
            const ctx = new MockContext();
            /* @ts-expect-error: testing invalid input */
            ParseAndApplyCacheControl(ctx, {type: 'wat', maxage: 0});
            expect(ctx.headers).not.toHaveProperty('Cache-Control');
        });
    });
});
