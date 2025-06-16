import {describe, it, expect} from 'vitest';
import {env} from '../../../../../lib/modules/JSX/ctx/env';
import {nonce} from '../../../../../lib/modules/JSX/ctx/nonce';
import {state} from '../../../../../lib/modules/JSX/ctx/state';
import * as Module from '../../../../../lib/modules/JSX/ctx/index';

describe('Modules - JSX - ctx', () => {
    it('env should link to the correct module', () => {
        expect(Module.env).toEqual(env);
    });

    it('nonce should link to the correct module', () => {
        expect(Module.nonce).toEqual(nonce);
    });

    it('state should link to the correct module', () => {
        expect(Module.state).toEqual(state);
    });
});
