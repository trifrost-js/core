import {describe, it, expect, beforeEach} from 'vitest';
import {state} from '../../../../../lib/modules/JSX/ctx/state';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import {MockContext} from '../../../../MockContext';

describe('JSX - ctx/state', () => {
    beforeEach(() => {
        setActiveCtx(null);
    });

    it('Returns undefined if no context is set', () => {
        expect(state('count')).toBeUndefined();
    });

    it('Returns value from active context state', () => {
        setActiveCtx(new MockContext({state: {count: 42}}));
        expect(state('count')).toBe(42);
    });

    it('Returns undefined for missing state key', () => {
        setActiveCtx(new MockContext({state: {}}));
        expect(state('missing')).toBeUndefined();
    });

    it('Preserves generic types', () => {
        setActiveCtx(new MockContext({state: {list: [1, 2, 3]}}));
        const list = state<number[]>('list');
        expect(list).toEqual([1, 2, 3]);
    });
});
