import {describe, it, expect} from 'vitest';
import {createScript} from '../../../../../lib/modules/JSX/script/use';
import * as Module from '../../../../../lib/modules/JSX/script';

describe('Modules - JSX - script', () => {
    it('createScript should link to the correct module', () => {
        expect(Module.createScript).toEqual(createScript);
    });
});
