import {describe, bench} from 'vitest';
import {createScrambler, OMIT_PRESETS} from '../../../lib/utils/Scrambler';

const sample = {
  id: 1,
  user: {
    name: 'Alice',
    password: 'hunter2',
    profile: {
      email: 'alice@example.com',
      ssn: '123-45-6789',
    },
  },
  metadata: {
    token: 'abcd1234',
    lastLogin: '2025-01-01',
  },
  records: [
    {token: 'x1', secret: 'a'},
    {token: 'x2', secret: 'b'},
  ],
};

const flatKeysScrambler = createScrambler({checks: ['id', 'password', 'token']});
const wildCardKeysScrambler = createScrambler({checks: [{global: 'token'}, {global: 'secret'}]});
const dottedWildcardScrambler = createScrambler({checks: ['user.password', {global: 'token'}]});

const withValuePatternsScrambler = createScrambler({checks: [
    {valuePattern: /[\w.-]+@[\w.-]+\.\w+/}, // email
    {valuePattern: /\d{3}-\d{2}-\d{4}/},   // SSN
]});

const allCombinedScrambler = createScrambler({checks: [
    'user.password',
    {global: 'token'},
    {valuePattern: /\d{3}-\d{2}-\d{4}/},
    {valuePattern: /[\w.-]+@[\w.-]+\.\w+/},
]});

const defaultScrambler = createScrambler({checks: OMIT_PRESETS.default});

describe('Benchmark - scramble()', () => {
  bench('Flat keys', () => {
    flatKeysScrambler(sample);
  });

  bench('Wildcard keys', () => {
    wildCardKeysScrambler(sample);
  });

  bench('Dotted + wildcard', () => {
    dottedWildcardScrambler(sample);
  });

  bench('With value patterns (email, SSN)', () => {
    withValuePatternsScrambler(sample);
  });

  bench('All combined', () => {
    allCombinedScrambler(sample);
  });

  bench('Default preset', () => {
    defaultScrambler(sample);
  });
});
