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
