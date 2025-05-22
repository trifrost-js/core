import {describe, it, expect} from 'vitest';
import {RateLimitKeyGeneratorRegistry} from '../../../../lib/modules/RateLimit/_RateLimit';
import * as RateLimit from '../../../../lib/modules/RateLimit';

describe('Modules - RateLimit', () => {
    describe('RateLimitKeyGeneratorRegistry', () => {
        it('Should link to the correct module', () => {
            expect(RateLimit.RateLimitKeyGeneratorRegistry).toEqual(RateLimitKeyGeneratorRegistry);
        });
    });
});
