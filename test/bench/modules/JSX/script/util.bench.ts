import {bench, describe} from 'vitest';
import {atomicMinify} from '../../../../../lib/modules/JSX/script/util';

/* Original minifier */
const RGX_COMMENT = /\/\/.*$/gm;
const RGX_BREAK = /\n/g;
const RGX_SPACE = /\s+/g;
const RGX_SYMBOLS = /\s*([{}();,:=<>+\-[\]])\s*/g;

const regexMinify = (raw: string) => {
    return raw.replace(RGX_COMMENT, '').replace(RGX_BREAK, ' ').replace(RGX_SPACE, ' ').replace(RGX_SYMBOLS, '$1').trim();
};

const snippet = `
if (!window.$tfhydra) {
  if (!window.$tfequal) {
    const equal = (a, b) => {
      if (a === b) return true;
      switch (typeof a) {
        case "object":
          if (!a || !b) return false;
          if (Array.isArray(a))
            return Array.isArray(b) && a.length === b.length && a.every((v, i) => equal(v, b[i]));
          return false;
      }
    };
    window.$tfequal = equal;
  }
  window.$tfr = Object.freeze({ publish() {}, subscribe() {}, unsubscribe() {} });
  window.$tfs = Object.freeze({ get() {}, set() {} });
}
`;

const small = snippet;
const medium = snippet.repeat(10); // ~1.5–2 KB
const large = snippet.repeat(300); // ~50 KB

describe('Minifier', () => {
    describe('Small (1.68 KiB)', () => {
        bench('(og) regex', () => {
            regexMinify(small);
        });

        bench('(new) atomicMinify', () => {
            atomicMinify(small);
        });
    });

    describe('Medium (16.77 KiB)', () => {
        bench('(og) regex', () => {
            regexMinify(medium);
        });

        bench('(new) atomicMinify', () => {
            atomicMinify(medium);
        });
    });

    describe('Large (502.05 KiB)', () => {
        bench('(og) regex', () => {
            regexMinify(large);
        });

        bench('(new) atomicMinify', () => {
            atomicMinify(large);
        });
    });
});
