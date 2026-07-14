// generateDID() derives its result through deriveKeysFromPrivateKey() so that a freshly
// generated identity and one re-derived from its private key (e.g. a profile import) can
// never disagree. These tests make that invariant an enforced guarantee.
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(32).fill(7)),
}));

import * as base64 from 'base64-js';
import * as ed25519 from '@stablelib/ed25519';
import { getRandomBytes } from 'expo-crypto';
import {
  generateDID,
  deriveKeysFromPrivateKey,
  deriveOriginKeys,
  isValidPrivateKey,
  encodePublicKeyAsDID,
  SECRET_KEY_SIZE,
  PUBLIC_KEY_SIZE,
} from '../../lib/did';

const mockGetRandomBytes = getRandomBytes as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRandomBytes.mockReturnValue(new Uint8Array(32).fill(7));
});

describe('generateDID', () => {
  it('returns a did:key DID, base58 public key, and 64-byte base64 private key', async () => {
    const result = await generateDID();

    expect(result.did).toMatch(/^did:key:z/);
    expect(result.publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/); // base58btc alphabet
    expect(base64.toByteArray(result.privateKey)).toHaveLength(SECRET_KEY_SIZE);
  });

  it('produces the same identity as direct key-pair encoding (pre-refactor behavior)', async () => {
    const result = await generateDID();

    const keyPair = ed25519.generateKeyPairFromSeed(new Uint8Array(32).fill(7));
    expect(result.did).toBe(encodePublicKeyAsDID(keyPair.publicKey));
    expect(result.privateKey).toBe(base64.fromByteArray(keyPair.secretKey));
  });

  it('generates an identity that re-derives to itself from the private key alone', async () => {
    const result = await generateDID();
    const derived = deriveKeysFromPrivateKey(result.privateKey);

    expect(derived.did).toBe(result.did);
    expect(derived.publicKeyBase58).toBe(result.publicKey);
    expect(base64.fromByteArray(derived.secretKeyBytes)).toBe(result.privateKey);
  });

  it('produces distinct identities from distinct seeds', async () => {
    const first = await generateDID();
    mockGetRandomBytes.mockReturnValue(new Uint8Array(32).fill(8));
    const second = await generateDID();

    expect(second.did).not.toBe(first.did);
    expect(second.privateKey).not.toBe(first.privateKey);
  });
});

describe('deriveKeysFromPrivateKey', () => {
  const keyPair = ed25519.generateKeyPairFromSeed(new Uint8Array(32).fill(9));
  const privateKey = base64.fromByteArray(keyPair.secretKey);

  it('recovers the public key from the trailing half of the secret key', () => {
    const derived = deriveKeysFromPrivateKey(privateKey);

    expect(derived.publicKeyBytes).toHaveLength(PUBLIC_KEY_SIZE);
    expect(Array.from(derived.publicKeyBytes)).toEqual(Array.from(keyPair.publicKey));
    expect(Array.from(derived.secretKeyBytes.slice(32))).toEqual(Array.from(derived.publicKeyBytes));
    expect(derived.did).toBe(encodePublicKeyAsDID(keyPair.publicKey));
    expect(derived.publicKeyBase64).toBe(base64.fromByteArray(keyPair.publicKey));
  });

  it('accepts a key with surrounding whitespace', () => {
    expect(deriveKeysFromPrivateKey(`  ${privateKey}\n`).did).toBe(
      deriveKeysFromPrivateKey(privateKey).did
    );
  });

  it('throws on an invalid key without echoing the key material', () => {
    const badKey = 'AAAA';
    try {
      deriveKeysFromPrivateKey(badKey);
      throw new Error('expected deriveKeysFromPrivateKey to throw');
    } catch (err) {
      expect((err as Error).message).not.toContain(badKey);
      expect((err as Error).message).toContain('64');
    }
  });
});

describe('deriveOriginKeys', () => {
  const rootPrivateKey =
    'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwfqSmxj4pxSCr71UHsTLsX5lUd2rr6+e5JCHuppFEbSLA==';
  const rootDID = 'did:key:z6MkvDqGT54cXesYGvABpF1UapVNwjCqRcafi4Px6Thv5T3Z';

  // These literals are the spec's normative test vectors — the contract with every other
  // Local First Auth implementation. If a refactor changes any of them, users' identities
  // on every mini app change with them.
  it.each([
    ['https://example.com', 'did:key:z6MksHmq5juqxMRUt6UYxnbCfprSmsEcaLd9riXhYZPB7hCF'],
    ['https://other.app', 'did:key:z6MkuPzxjqnHVeV3eupgRqjD9Me4EhAyKoohjU6PkkoBhLSt'],
    ['http://localhost:8787', 'did:key:z6MkoShWB63jPRQAMhWJD3J2Gq5BizC65JnRetMj5uj7EepD'],
  ])('derives the spec test vector for %s', (origin, expected) => {
    expect(deriveKeysFromPrivateKey(rootPrivateKey).did).toBe(rootDID);
    expect(deriveOriginKeys(rootPrivateKey, origin).did).toBe(expected);
  });

  it('is deterministic for the same root key and origin', () => {
    const first = deriveOriginKeys(rootPrivateKey, 'https://example.com');
    const second = deriveOriginKeys(rootPrivateKey, 'https://example.com');

    expect(second.did).toBe(first.did);
    expect(Array.from(second.secretKeyBytes)).toEqual(Array.from(first.secretKeyBytes));
  });

  it('derives distinct DIDs per origin, none equal to the root DID', () => {
    const dids = [
      deriveOriginKeys(rootPrivateKey, 'https://example.com').did,
      deriveOriginKeys(rootPrivateKey, 'http://example.com').did, // scheme matters
      deriveOriginKeys(rootPrivateKey, 'https://other.app').did,
    ];

    expect(new Set(dids).size).toBe(3);
    expect(dids).not.toContain(rootDID);
  });

  it('throws on an invalid root key', () => {
    expect(() => deriveOriginKeys('AAAA', 'https://example.com')).toThrow('64');
  });

  it('produces a key pair that signs and verifies', () => {
    const derived = deriveOriginKeys(rootPrivateKey, 'https://example.com');
    const message = new TextEncoder().encode('hello');
    const signature = ed25519.sign(derived.secretKeyBytes, message);

    expect(ed25519.verify(derived.publicKeyBytes, message, signature)).toBe(true);
  });
});

describe('isValidPrivateKey', () => {
  const keyPair = ed25519.generateKeyPairFromSeed(new Uint8Array(32).fill(9));
  const privateKey = base64.fromByteArray(keyPair.secretKey);

  it('accepts a well-formed 64-byte key', () => {
    expect(isValidPrivateKey(privateKey)).toBe(true);
    expect(isValidPrivateKey(`  ${privateKey}  `)).toBe(true);
  });

  it.each([
    ['a non-string', 42],
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a length not a multiple of 4', privateKey.slice(1)],
    ['a 32-byte seed-only key', base64.fromByteArray(new Uint8Array(32).fill(1))],
    // base64-js silently decodes out-of-alphabet characters to garbage bytes; the
    // BASE64_PATTERN guard exists to catch exactly this.
    ['out-of-alphabet characters', `!${privateKey.slice(1)}`],
    ['embedded whitespace', `${privateKey.slice(0, 10)} ${privateKey.slice(11)}`],
  ])('rejects %s', (_label, input) => {
    expect(isValidPrivateKey(input)).toBe(false);
  });
});
