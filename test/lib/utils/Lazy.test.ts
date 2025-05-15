import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Lazy} from '../../../lib/utils/Lazy';

describe('Utils - Lazy', () => {
    type Env = {name: string};

    describe('constructor', () => {
        it('Stores static value directly if not a function', () => {
            const lazy = new Lazy(42);
            expect(lazy.resolved).toBe(42);
        });

        it('Accepts a function and defers execution', () => {
            const initFn = vi.fn(() => 'deferred');
            const lazy = new Lazy(initFn);
            expect(lazy.resolved).toBe(null);
            expect(initFn).not.toHaveBeenCalled();
        });
    });

    describe('resolve', () => {
        let ENV: Env;

        beforeEach(() => {
            ENV = {name: 'unit'};
        });

        it('Resolves value via function if not resolved yet', () => {
            const initFn = vi.fn(({env}) => `hello-${env.name}`);
            const lazy = new Lazy<string, Env>(initFn);

            const result = lazy.resolve({env: ENV});
            expect(result).toBe('hello-unit');
            expect(lazy.resolved).toBe('hello-unit');
            expect(initFn).toHaveBeenCalledOnce();
        });

        it('Does not re-invoke initFn if already resolved', () => {
            const initFn = vi.fn(({env}) => `cached-${env.name}`);
            const lazy = new Lazy<string, Env>(initFn);

            lazy.resolve({env: ENV});
            const again = lazy.resolve({env: ENV});

            expect(again).toBe('cached-unit');
            expect(initFn).toHaveBeenCalledOnce();
        });

        it('Returns static value immediately if given', () => {
            const lazy = new Lazy<number, Env>(100);
            expect(lazy.resolve({env: ENV})).toBe(100);
        });

        it('Throws if no initFn and value is null', () => {
            const lazy = new Lazy<string, Env>(null as any);
            expect(() => lazy.resolve({env: ENV})).toThrow(/Lazy@resolve: No initializer provided/);
        });
    });

    describe('clear', () => {
        it('Clears resolved value, requiring re-invoke on next resolve', () => {
            const initFn = vi.fn(() => 'fresh');
            const lazy = new Lazy(initFn);

            const once = lazy.resolve({env: {}});
            expect(once).toBe('fresh');

            lazy.clear();
            expect(lazy.resolved).toBe(null);

            const again = lazy.resolve({env: {}});
            expect(again).toBe('fresh');
            expect(initFn).toHaveBeenCalledTimes(2);
        });

        it('Does nothing if value was static and cleared', () => {
            const lazy = new Lazy('constant');
            expect(lazy.resolved).toBe('constant');
            lazy.clear();
            expect(lazy.resolved).toBe(null);
        });
    });

    describe('edge behavior', () => {
        it('Supports custom environment types and binding', () => {
            const lazy = new Lazy<number, {val: number}>(({env}) => env.val * 2);
            const out = lazy.resolve({env: {val: 10}});
            expect(out).toBe(20);
        });

        it('Handles falsy resolved values like 0 or "" as not yet resolved', () => {
            const lazyZero = new Lazy(0);
            expect(lazyZero.resolved).toBe(null);
            expect(() => lazyZero.resolve({env: {}})).toThrow(/Lazy@resolve: No initializer provided/);

            const lazyEmpty = new Lazy('');
            expect(lazyEmpty.resolved).toBe(null);
            expect(() => lazyEmpty.resolve({env: {}})).toThrow(/Lazy@resolve: No initializer provided/);
        });
    });
});
