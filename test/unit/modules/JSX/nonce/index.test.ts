import {describe, it, expect} from 'vitest';
import {nonce} from '../../../../../lib/modules/JSX/nonce/use';
import * as Module from '../../../../../lib/modules/JSX/nonce/index';

describe('Modules - JSX - nonce', () => {
    describe('nonce', () => {
        it('Should link to the correct module', () => {
            expect(Module.nonce).toEqual(nonce);
        });
    });
});
