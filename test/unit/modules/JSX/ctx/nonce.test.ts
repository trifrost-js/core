import {describe, it, expect, beforeEach} from 'vitest';
import {nonce, NONCE_WIN_SCRIPT} from '../../../../../lib/modules/JSX/ctx/nonce';
import {setActiveCtx} from '../../../../../lib/modules/JSX/ctx/use';
import {MockContext} from '../../../../MockContext';
import CONSTANTS from '../../../../constants';

describe('Modules - JSX - ctx - nonce', () => {
    describe('nonce', () => {
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

    describe('NONCE_WIN_SCRIPT', () => {
        it('Should return a minified script containing the provided value', () => {
            expect(NONCE_WIN_SCRIPT('abc123')).toBe(
                '<script nonce="abc123">Object.defineProperty(window,"$tfnonce",{value:"abc123",configurable:!1,writable:!1})</script>',
            );
        });

        it('Should return an empty string if passed a non-string or empty nonce', () => {
            for (const el of [...CONSTANTS.NOT_STRING, '']) {
                expect(NONCE_WIN_SCRIPT(el as any)).toBe('');
            }
        });
    });
});
