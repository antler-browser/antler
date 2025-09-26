import * as ed25519 from '@stablelib/ed25519';
import { getRandomBytes } from 'expo-crypto';
import * as base58 from 'base58-universal';

export interface DIDResult {
  did: string;
  publicKey: string;
  privateKey: string;
}

// DID format constants
const DID_KEY_PREFIX = 'did:key:z'; // 'z' indicates base58btc encoding
const ED25519_MULTICODEC_PREFIX = 0xed01; // Ed25519 public key multicodec identifier

// Key sizes
const SEED_SIZE = 32; // Ed25519 seed size in bytes

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
function encodePublicKeyAsDID(publicKey: Uint8Array): string {
  const multicodecKey = addMulticodecPrefix(publicKey);
  const base58Key = base58.encode(multicodecKey);
  return `${DID_KEY_PREFIX}${base58Key}`;
}

/**
 * Generates a new Ed25519 key pair and creates a DID from it
 *
 * @returns Object containing:
 *   - did: The generated DID identifier
 *   - publicKey: Base58-encoded public key
 *   - privateKey: Base58-encoded private key (includes public key)
 *
 * @example
 * const identity = await generateDID();
 * console.log(identity.did); // "did:key:z6Mk..."
 */

export async function generateDID(): Promise<DIDResult> {
  // Generate cryptographic keys
  const seed = await generateRandomSeed();
  const keyPair = ed25519.generateKeyPairFromSeed(seed);

  // Create the DID identifier
  const did = encodePublicKeyAsDID(keyPair.publicKey);

  // Encode keys for storage/transmission
  const publicKey = base58.encode(keyPair.publicKey);
  const privateKey = base58.encode(keyPair.secretKey);

  return {
    did,
    publicKey,
    privateKey,
  };
}


/**
 * Signs JSON data using an Ed25519 private key
 *
 * @param privateKey - Base58-encoded private key
 * @param data - JSON data to sign (will be converted to UTF-8 bytes)
 * @returns Digital signature
 */
export async function signData<T = any>(
  privateKey: string,
  data: T
): Promise<Uint8Array> {
  const privateKeyBytes = base58.decode(privateKey);

  // Convert JSON data to Uint8Array for signing
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(jsonString);

  return ed25519.sign(privateKeyBytes, dataBytes);
}

/**
 * Verifies a digital signature using an Ed25519 public key
 *
 * @param publicKey - Base58-encoded public key
 * @param signature - Signature to verify
 * @param data - Original JSON data that was signed (will be converted to UTF-8 bytes)
 * @returns True if signature is valid, false otherwise
 */
export async function verifySignature<T = any>(
  publicKey: string,
  signature: Uint8Array,
  data: T
): Promise<boolean> {
  try {
    const publicKeyBytes = base58.decode(publicKey);

    // Convert JSON data to Uint8Array for verification
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(jsonString);

    return ed25519.verify(publicKeyBytes, dataBytes, signature);
  } catch (error) {
    throw new Error(`Signature verification failed: ${(error as Error).message}`);
  }
}