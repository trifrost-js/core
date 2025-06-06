import {describe, it, expect} from 'vitest';
import {ConsoleExporter} from '../../../../lib/modules/Logger/exporters/Console';
import {JsonExporter} from '../../../../lib/modules/Logger/exporters/Json';
import {OtelHttpExporter} from '../../../../lib/modules/Logger/exporters/OtelHttp';
import {Logger} from '../../../../lib/modules/Logger/Logger';
import {TriFrostRootLogger} from '../../../../lib/modules/Logger/RootLogger';
import {span, spanFn, OMIT_PRESETS} from '../../../../lib/modules/Logger/util';
import * as Index from '../../../../lib/modules/Logger/index';

describe('Modules - Logger - Index', () => {
    it('ConsoleExporter should link to the correct module', () => {
        expect(Index.ConsoleExporter).toEqual(ConsoleExporter);
    });

    it('JsonExporter should link to the correct module', () => {
        expect(Index.JsonExporter).toEqual(JsonExporter);
    });

    it('OtelHttpExporter should link to the correct module', () => {
        expect(Index.OtelHttpExporter).toEqual(OtelHttpExporter);
    });

    it('Logger should link to the correct module', () => {
        expect(Index.Logger).toEqual(Logger);
    });

    it('TriFrostRootLogger should link to the correct module', () => {
        expect(Index.TriFrostRootLogger).toEqual(TriFrostRootLogger);
    });

    it('span should link to the correct module', () => {
        expect(Index.span).toEqual(span);
    });

    it('spanFn should link to the correct module', () => {
        expect(Index.spanFn).toEqual(spanFn);
    });

    it('OMIT_PRESETS should link to the correct module', () => {
        expect(Index.OMIT_PRESETS).toEqual(OMIT_PRESETS);
    });
});