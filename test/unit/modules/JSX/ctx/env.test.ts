import {describe, it, expect, beforeEach} from 'vitest';
import {env} from '../../../../../lib/modules/JSX/ctx/env';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import {MockContext} from '../../../../MockContext';

describe('JSX - ctx/env', () => {
    beforeEach(() => {
        setActiveCtx(null);
    });

    it('Returns undefined if no context is set', () => {
        expect(env('FOO')).toBeUndefined();
    });

    it('Returns value from active context env', () => {
        setActiveCtx(new MockContext({env: {FOO: 'bar'}}));
        expect(env('FOO')).toBe('bar');
    });

    it('Returns undefined for missing env key', () => {
        setActiveCtx(new MockContext({env: {}}));
        expect(env('DOES_NOT_EXIST')).toBeUndefined();
    });

    it('Preserves types if used generically', () => {
        setActiveCtx(new MockContext({env: {NUM: 123}}));
        const val = env<number>('NUM');
        expect(val).toBe(123);
    });
});
