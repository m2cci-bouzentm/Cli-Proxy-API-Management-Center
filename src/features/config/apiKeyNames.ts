import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export type ApiKeyNames = Record<string, string>;

/** Names live in the server config under access.api-key-names, keyed by this hash. */
export function apiKeyNameHash(apiKey: string): string {
  // Pure JS hashing also works when the panel is served over non-localhost HTTP.
  return bytesToHex(sha256(new TextEncoder().encode(apiKey)));
}

export function parseApiKeyNames(raw: unknown): ApiKeyNames {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] =>
        /^[a-f0-9]{64}$/.test(entry[0]) && typeof entry[1] === 'string' && !!entry[1].trim()
    )
  );
}

/** Drops empty names and the names of keys that are no longer in the list. */
export function namesOfKeys(names: ApiKeyNames, apiKeys: string[]): ApiKeyNames {
  return Object.fromEntries(
    apiKeys
      .map(apiKeyNameHash)
      .filter((hash) => Object.prototype.hasOwnProperty.call(names, hash) && names[hash] !== '')
      .map((hash) => [hash, names[hash]])
  );
}

export function areApiKeyNamesEqual(left: ApiKeyNames, right: ApiKeyNames): boolean {
  const leftEntries = Object.entries(left);
  if (leftEntries.length !== Object.keys(right).length) return false;
  return leftEntries.every(([hash, name]) => right[hash] === name);
}
