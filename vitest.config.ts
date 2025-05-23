/// <reference types="vitest" />

import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.test.ts', 'test/unit/*.test.ts'],
    benchmark: {
      include: ['test/bench/**/*.bench.ts'],
    },
  }
});