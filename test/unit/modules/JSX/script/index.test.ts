import {describe, it, expect} from 'vitest';
import {Script} from '../../../../../lib/modules/JSX/script/Script';
import * as Module from '../../../../../lib/modules/JSX/script';

describe('Modules - JSX - script', () => {
    describe('Script', () => {
        it('Should link to the correct module', () => {
            expect(Module.Script).toEqual(Script);
        });
    });
});
