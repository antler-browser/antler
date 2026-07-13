import * as ed25519 from '@stablelib/ed25519';
import { getRandomBytes } from 'expo-crypto';
import * as base58 from 'base58-universal';
import * as base64 from 'base64-js';

export interface DIDResult {
  did: string;
  publicKey: string;
  privateKey: string;
}

/**
 * A complete identity re-derived from an existing private key.
 *
 * The public key is offered in both encodings because they are used in different
 * places: base58 is what generateDID() has always returned, while the Local First
 * Auth export format uses base64. They are the same 32 bytes.
 */
export interface DerivedKeys {
  did: string;
  publicKeyBytes: Uint8Array;
  publicKeyBase64: string;
  publicKeyBase58: string;
  secretKeyBytes: Uint8Array;
}

// DID format constants
const DID_KEY_PREFIX = 'did:key:z'; // 'z' indicates base58btc encoding
const ED25519_MULTICODEC_PREFIX = 0xed01; // Ed25519 public key multicodec identifier

// Key sizes
const SEED_SIZE = 32; // Ed25519 seed size in bytes
export const SECRET_KEY_SIZE = 64; // Ed25519 secret key: 32-byte seed + 32-byte public key
export const PUBLIC_KEY_SIZE = 32;

// base64-js only rejects strings whose length isn't a multiple of 4; out-of-alphabet
// characters decode to silent garbage. Without this guard a corrupted key could decode
// to 64 bytes of junk and be adopted as a valid — but wrong — identity.
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Generates a cryptographically secure random seed for key generation
 * Uses expo-crypto for secure random number generation across all platforms
 */
async function generateRandomSeed(): Promise<Uint8Array> {
  const randomBytes = await getRandomBytes(SEED_SIZE);
  return new Uint8Array(randomBytes);
}

/**
 * Adds multicodec prefix to a public key
 * The prefix identifies the key type (Ed25519) when encoded
 */
function addMulticodecPrefix(publicKey: Uint8Array): Uint8Array {
  const prefixedKey = new Uint8Array(2 + publicKey.length);
  // Set the two-byte Ed25519 multicodec prefix
  prefixedKey[0] = (ED25519_MULTICODEC_PREFIX >> 8) & 0xff; // 0xed
  prefixedKey[1] = ED25519_MULTICODEC_PREFIX & 0xff;        // 0x01
  prefixedKey.set(publicKey, 2);
  return prefixedKey;
}

/**
 * Encodes a public key as a DID (Decentralized Identifier)
 * Format: did:key:z<base58-encoded-multicodec-public-key>
 */
export function encodePublicKeyAsDID(publicKey: Uint8Array): string {
  const multicodecKey = addMulticodecPrefix(publicKey);
  const base58Key = base58.encode(multicodecKey);
  return `${DID_KEY_PREFIX}${base58Key}`;
}

/**
 * Checks whether a string is a usable Ed25519 private key: base64 that decodes to
 * exactly 64 bytes.
 */
export function isValidPrivateKey(privateKey: unknown): boolean {
  if (typeof privateKey !== 'string') {
    return false;
  }

  const trimmed = privateKey.trim();
  if (trimmed.length === 0 || trimmed.length % 4 !== 0 || !BASE64_PATTERN.test(trimmed)) {
    return false;
  }

  try {
    return base64.toByteArray(trimmed).length === SECRET_KEY_SIZE;
  } catch {
    return false;
  }
}

/**
 * Rebuilds a complete identity from an existing private key.
 *
 * An Ed25519 secret key is a 32-byte seed followed by the 32-byte public key, so the
 * private key alone is enough to recover the DID. This is what makes importing a
 * profile possible: the identity is recovered, never regenerated.
 *
 * @throws If the private key is malformed. The message never echoes the key.
 */
export function deriveKeysFromPrivateKey(privateKey: string): DerivedKeys {
  if (!isValidPrivateKey(privateKey)) {
    throw new Error(`Private key must be base64 encoding exactly ${SECRET_KEY_SIZE} bytes`);
  }

  const secretKeyBytes = base64.toByteArray(privateKey.trim());
  const publicKeyBytes = ed25519.extractPublicKeyFromSecretKey(secretKeyBytes);

  return {
    did: encodePublicKeyAsDID(publicKeyBytes),
    publicKeyBytes,
    publicKeyBase64: base64.fromByteArray(publicKeyBytes),
    publicKeyBase58: base58.encode(publicKeyBytes),
    secretKeyBytes,
  };
}

/**
 * Generates a new Ed25519 key pair and creates a DID from it
 *
 * @returns Object containing:
 *   - did: The generated DID identifier
 *   - publicKey: Base58-encoded public key
 *   - privateKey: Base64-encoded private key (includes public key)
 *
 * @example
 * const identity = await generateDID();
 * console.log(identity.did); // "did:key:z6Mk..."
 */

export async function generateDID(): Promise<DIDResult> {
  const seed = await generateRandomSeed();
  const keyPair = ed25519.generateKeyPairFromSeed(seed);

  // Ed25519 secretKey is 64 bytes (32-byte seed + 32-byte public key)
  const privateKey = base64.fromByteArray(keyPair.secretKey);

  // Derived through the same path an imported key takes, so a generated DID and a
  // re-derived one can never disagree.
  const derived = deriveKeysFromPrivateKey(privateKey);

  return {
    did: derived.did,
    publicKey: derived.publicKeyBase58,
    privateKey,
  };
}