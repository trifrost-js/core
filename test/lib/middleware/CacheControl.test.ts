import {isAsyncFunction} from '@valkyriestudios/utils/function/isAsync';
import {describe, it} from 'node:test';
import * as assert from 'node:assert/strict';
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
        assert.ok(typeof fn === 'function');
        assert.ok(!isAsyncFunction(fn));
    });

    it('Returns a function with TriFrost symbols set', () => {
        const fn = CacheControl();
        assert.ok(Reflect.get(fn, Sym_TriFrostName), 'TriFrostCacheControl');
        assert.ok(Reflect.get(fn, Sym_TriFrostType), 'middleware');
        assert.ok(
            Reflect.get(fn, Sym_TriFrostDescription),
            'Middleware adding Cache-Control headers to contexts passing through it'
        );
    });

    it('Sets a valid Cache-Control header with type only', () => {
        const ctx = new MockContext();
        CacheControl({type: 'no-cache'})(ctx);
        assert.equal(ctx.headers['Cache-Control'], 'no-cache');
    });

    it('Sets a valid Cache-Control header with maxage only', () => {
        const ctx = new MockContext();
        CacheControl({maxage: 3600})(ctx);
        assert.equal(ctx.headers['Cache-Control'], 'max-age=3600');
    });

    it('Sets a valid Cache-Control header with type and maxage', () => {
        const ctx = new MockContext();
        CacheControl({type: 'private', maxage: 600})(ctx);
        assert.equal(ctx.headers['Cache-Control'], 'private, max-age=600');
    });

    it('Ignores invalid type', () => {
        for (const el of [...CONSTANTS.NOT_STRING_WITH_EMPTY, 'totally-bogus']) {
            const ctx = new MockContext();
            CacheControl({type: el as any, maxage: 120})(ctx);
            assert.equal(ctx.headers['Cache-Control'], 'max-age=120');
        }
    });

    it('Ignores non-positive-integer maxage', () => {
        for (const el of [...CONSTANTS.NOT_INTEGER, 0, -10, 1.5, -99.99, 99.99]) {
            const ctx = new MockContext();
            CacheControl({type: 'public', maxage: el as number})(ctx);
            assert.equal(ctx.headers['Cache-Control'], 'public');
        }
    });

    it('Does not apply header if options are missing or invalid', () => {
        const invalids = [null, undefined, false, {}, {type: 'junk'}];
        for (const el of invalids) {
            const ctx = new MockContext();
            CacheControl(el as TriFrostCacheControlOptions)(ctx);
            assert.ok(!('Cache-Control' in ctx.headers));
        }
    });

    describe('ParseAndApplyCacheControl', () => {
        it('Applies valid header', () => {
            const ctx = new MockContext();
            ParseAndApplyCacheControl(ctx, {type: 'public', maxage: 60});
            assert.equal(ctx.headers['Cache-Control'], 'public, max-age=60');
        });

        it('Skips setting header if invalid', () => {
            const ctx = new MockContext();
            /* @ts-ignore */
            ParseAndApplyCacheControl(ctx, {type: 'wat', maxage: 0});
            assert.ok(!('Cache-Control' in ctx.headers));
        });
    });
});
