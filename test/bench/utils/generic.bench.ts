import {describe, bench} from 'vitest';
import {djb2Hash} from '../../../lib/utils/Generic';

function djb2HashReverseLoop(val: string) {
    let h = 5381;
    let i = val.length;
    while (i) h = (h * 33) ^ val.charCodeAt(--i);
    return (h >>> 0).toString(36);
}

function djb2HashTwiddled(val: string) {
    let h = 5381;
    const l = val.length;
    for (let i = 0; i < l; i++) {
        h = ((h << 5) + h) ^ val.charCodeAt(i); // h * 33 ^ c
    }
    return (h >>> 0).toString(36);
}

const sample = `
:root {
  --color-primary: #4f46e5;
  --font-body: "Inter", sans-serif;
}
body {
  font-family: var(--font-body);
  color: var(--color-primary);
  margin: 0;
  padding: 0;
}
@media (min-width: 640px) {
  .sm\\:text-center { text-align: center; }
}
@media (min-width: 768px) {
  .md\\:grid { display: grid; }
  .md\\:gap-4 { gap: 1rem; }
}
.button::before {
  content: "🚀";
  display: inline-block;
  margin-right: 0.5rem;
}
h1, h2, h3 {
  font-weight: 600;
  line-height: 1.2;
}
.footer {
  text-align: center;
  padding: 2rem 1rem;
  font-size: 0.875rem;
  color: #888;
}
`;

const sample_1k = sample.repeat(2); // ~1K
const sample_5k = sample.repeat(10); // ~5K
const sample_10k = sample.repeat(20); // ~10K
const sample_50k = sample.repeat(100); // ~50K
const sample_100k = sample.repeat(200); // ~100K

describe('Benchmark - djb2Hash()', () => {
    describe('1K chars', () => {
        bench('(og) Reverse while loop', () => {
            djb2HashReverseLoop(sample_1k);
        });
        bench('Loop with bit twiddling', () => {
            djb2HashTwiddled(sample_1k);
        });
        bench('(new) Threshold-based bit twiddler', () => {
            djb2Hash(sample_1k);
        });
    });

    describe('5K chars', () => {
        bench('(og) Reverse while loop', () => {
            djb2HashReverseLoop(sample_5k);
        });
        bench('Loop with bit twiddling', () => {
            djb2HashTwiddled(sample_5k);
        });
        bench('(new) Threshold-based bit twiddler', () => {
            djb2Hash(sample_5k);
        });
    });

    describe('10K chars', () => {
        bench('(og) Reverse while loop', () => {
            djb2HashReverseLoop(sample_10k);
        });
        bench('Loop with bit twiddling', () => {
            djb2HashTwiddled(sample_10k);
        });
        bench('(new) Threshold-based bit twiddler', () => {
            djb2Hash(sample_10k);
        });
    });

    describe('50K chars', () => {
        bench('(og) Reverse while loop', () => {
            djb2HashReverseLoop(sample_50k);
        });
        bench('Loop with bit twiddling', () => {
            djb2HashTwiddled(sample_50k);
        });
        bench('(new) Threshold-based bit twiddler', () => {
            djb2Hash(sample_50k);
        });
    });

    describe('100K chars', () => {
        bench('(og) Reverse while loop', () => {
            djb2HashReverseLoop(sample_100k);
        });
        bench('Loop with bit twiddling', () => {
            djb2HashTwiddled(sample_100k);
        });
        bench('(new) Threshold-based bit twiddler', () => {
            djb2Hash(sample_100k);
        });
    });
});
