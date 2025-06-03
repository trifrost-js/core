import {describe, it, expect} from 'vitest';
import {ConsoleExporter} from '../../../../../lib/modules/Logger/exporters/Console';
import {JsonExporter} from '../../../../../lib/modules/Logger/exporters/Json';
import {OtelHttpExporter} from '../../../../../lib/modules/Logger/exporters/OtelHttp';
import * as Exporters from '../../../../../lib/modules/Logger/exporters/index';

describe('Modules - Logger - Exporters', () => {
    describe('ConsoleExporter', () => {
        it('Should link to the correct module', () => {
            expect(Exporters.ConsoleExporter).toEqual(ConsoleExporter);
        });
    });

    describe('JsonExporter', () => {
        it('Should link to the correct module', () => {
            expect(Exporters.JsonExporter).toEqual(JsonExporter);
        });
    });

    describe('OtelHttpExporter', () => {
        it('Should link to the correct module', () => {
            expect(Exporters.OtelHttpExporter).toEqual(OtelHttpExporter);
        });
    });
});
