import {describe, it, expect, beforeEach} from 'vitest';
import {setActiveNonce, nonce, hasActiveNonce} from '../../../../../lib/modules/JSX/nonce/use';

describe('nonce/use', () => {
    beforeEach(() => {
        setActiveNonce(null);
    });

    it('Throws if no nonce is set', () => {
        expect(() => nonce()).toThrowError('No active nonce is set');
    });

    it('Returns the currently active nonce', () => {
        setActiveNonce('abc123');
        expect(nonce()).toBe('abc123');
    });

    it('Overwrites previous nonce', () => {
        setActiveNonce('first');
        expect(nonce()).toBe('first');

        setActiveNonce('second');
        expect(nonce()).toBe('second');
    });

    it('Returns null from setActiveNonce when passed null', () => {
        const result = setActiveNonce(null);
        expect(result).toBeNull();
    });

    it('Handles setting empty string', () => {
        setActiveNonce('');
        expect(() => nonce()).toThrowError('No active nonce is set');
    });

    it('hasActiveNonce returns false when no active nonce is set', () => {
        expect(hasActiveNonce()).toBe(false);
    });

    it('hasActiveNonce returns true when an active nonce is set', () => {
        expect(hasActiveNonce()).toBe(false);
        setActiveNonce('first');
        expect(hasActiveNonce()).toBe(true);
    });
});
