import {describe, it, expect} from 'vitest';
import {cacheSkip, cache, cacheFn} from '../../../../lib/modules/Cache/util';
import * as Cache from '../../../../lib/modules/Cache';

describe('Modules - Cache', () => {
    describe('cache', () => {
        it('Should link to the correct method', () => {
            expect(Cache.cache).toEqual(cache);
        });
    });

    describe('cacheFn', () => {
        it('Should link to the correct method', () => {
            expect(Cache.cacheFn).toEqual(cacheFn);
        });
    });

    describe('cacheSkip', () => {
        it('Should link to the correct method', () => {
            expect(Cache.cacheSkip).toEqual(cacheSkip);
        });
    });
});
