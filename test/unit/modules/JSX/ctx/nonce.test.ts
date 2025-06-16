import {describe, it, expect, beforeEach} from 'vitest';
import {nonce} from '../../../../../lib/modules/JSX/ctx/nonce';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import {MockContext} from '../../../../MockContext';

describe('JSX - ctx/nonce', () => {
    beforeEach(() => {
        setActiveCtx(null);
    });

    it('Returns null if no context is active', () => {
        expect(nonce()).toBeNull();
    });

    it('Returns nonce from context if set', () => {
        setActiveCtx(new MockContext({nonce: 'abc123'}));
        expect(nonce()).toBe('abc123');
    });

    it('Returns null if context is active but nonce is missing', () => {
        setActiveCtx(new MockContext({nonce: null}));
        expect(nonce()).toBe(null);
    });
});
