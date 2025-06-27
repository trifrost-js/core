import {describe, it, expect, beforeEach} from 'vitest';
import {setActiveCtx, getActiveCtx, hasActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';

describe('JSX - ctx/use', () => {
    beforeEach(() => {
        setActiveCtx(null);
    });

    it('Returns false when no context is set', () => {
        expect(hasActiveCtx()).toBe(false);
        expect(getActiveCtx()).toBe(null);
    });

    it('Sets and retrieves active context', () => {
        const ctx = {env: {FOO: 'bar'}, state: {count: 1}, nonce: 'abc'} as any;
        setActiveCtx(ctx);

        expect(hasActiveCtx()).toBe(true);
        expect(getActiveCtx()).toBe(ctx);
    });

    it('Allows null to reset the context', () => {
        setActiveCtx({env: {}, state: {}, nonce: ''} as any);
        expect(hasActiveCtx()).toBe(true);
        setActiveCtx(null);
        expect(hasActiveCtx()).toBe(false);
        expect(getActiveCtx()).toBe(null);
    });
});
