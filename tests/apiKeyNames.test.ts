import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  apiKeyNameHash,
  areApiKeyNamesEqual,
  namesOfKeys,
  parseApiKeyNames,
} from '../src/features/config/apiKeyNames';

const hashOf = (apiKey: string) => createHash('sha256').update(apiKey).digest('hex');

describe('API key names in the server config', () => {
  test('keys names by the plain SHA-256 hex of the API key', () => {
    expect(apiKeyNameHash('fixture-key-a')).toBe(hashOf('fixture-key-a'));
  });

  test('ignores malformed data and invalid entries', () => {
    const hash = hashOf('valid');
    expect(
      parseApiKeyNames({
        [hash]: 'Name',
        ['a'.repeat(64)]: 4,
        ['b'.repeat(64)]: '',
        'not-a-hash': 'Invalid',
      })
    ).toEqual({ [hash]: 'Name' });
    expect(parseApiKeyNames(['Name'])).toEqual({});
    expect(parseApiKeyNames(undefined)).toEqual({});
  });

  test('keeps only the non-empty names of keys still in the list', () => {
    const names = { [hashOf('one')]: 'First', [hashOf('two')]: 'Second', [hashOf('four')]: '' };
    expect(namesOfKeys(names, ['two', 'three', 'four'])).toEqual({ [hashOf('two')]: 'Second' });
  });

  test('compares names without regard to entry order', () => {
    const forward = { [hashOf('one')]: 'First', [hashOf('two')]: 'Second' };
    const backward = { [hashOf('two')]: 'Second', [hashOf('one')]: 'First' };
    expect(areApiKeyNamesEqual(forward, backward)).toBe(true);
    expect(areApiKeyNamesEqual(forward, { [hashOf('one')]: 'First' })).toBe(false);
    expect(areApiKeyNamesEqual(forward, { ...forward, [hashOf('two')]: 'Other' })).toBe(false);
  });
});
