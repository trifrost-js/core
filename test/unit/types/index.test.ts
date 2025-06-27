import {describe, it, expect} from 'vitest';
import {Sym_TriFrostName, Sym_TriFrostDescription, Sym_TriFrostFingerPrint, MimeTypes, HttpStatuses} from '../../../lib/types/constants';
import * as Index from '../../../lib/types/index';

describe('types - index', () => {
    describe('Constants', () => {
        it('HttpStatuses ', () => {
            expect(Index.HttpStatuses).toEqual(HttpStatuses);
        });

        it('MimeTypes ', () => {
            expect(Index.MimeTypes).toEqual(MimeTypes);
        });
    });

    describe('Symbols', () => {
        it('Sym_TriFrostDescription', () => {
            expect(Index.Sym_TriFrostDescription).toBe(Sym_TriFrostDescription);
        });

        it('Sym_TriFrostFingerPrint', () => {
            expect(Index.Sym_TriFrostFingerPrint).toBe(Sym_TriFrostFingerPrint);
        });

        it('Sym_TriFrostName', () => {
            expect(Index.Sym_TriFrostName).toBe(Sym_TriFrostName);
        });
    });
});
