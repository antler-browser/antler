import { p256 } from '@noble/curves/nist.js';
import * as base64 from 'base64-js';
import { getRandomBytes } from 'expo-crypto';

// In-memory key storage (cleared on app termination)
// Multiple key pairs can coexist for different WebView sessions
// Map structure: { [publicKeyBase64]: privateKeyBytes }
let keyPairCache: Map<string, Uint8Array> = new Map();

/**
 * Canonical JSON serialization (sorted keys)
 *
 * Ensures deterministic JSON output regardless of property insertion order.
 * Uses native JSON.stringify with sorted keys for optimal performance.
 *
 * NOTE: This implementation is optimized for flat objects (no nested objects).
 * The current message structures being signed are all flat objects with primitives.
 *
 * @param obj - Object to serialize (must be a flat object)
 * @returns JSON string with alphabetically sorted keys
 */
function canonicalJSON(obj: any): string {
  const sortedKeys = Object.keys(obj).sort();
  return JSON.stringify(obj, sortedKeys);
}

/**
 * Generate fresh ephemeral ECDSA P-256 key pair for WebView message signing
 *
 * Keys are stored in memory only and cleared when app terminates.
 * Multiple key pairs can coexist to support concurrent WebView sessions.
 *
 * Uses ECDSA P-256 for broad browser compatibility (iOS 11+, Android 5.0+).
 *
 * @returns Public key as base64 string (uncompressed format, 65 bytes)
 *
 * @example
 * // In CameraView useEffect:
 * const publicKey = await WebViewSigning.generateEphemeralKeyPair();
 * setWebViewPublicKey(publicKey);
 */
export async function generateEphemeralKeyPair(): Promise<string> {
  // Generate random 32-byte private key using expo-crypto (RN compatible)
  const privateKeyBytes = await getRandomBytes(32);

  // Generate P-256 public key from private key
  const publicKeyBytes = p256.getPublicKey(new Uint8Array(privateKeyBytes), false); // false = uncompressed format (65 bytes)

  // Convert public key to base64 for indexing
  const publicKeyBase64 = base64.fromByteArray(publicKeyBytes);

  // Store private key indexed by public key
  keyPairCache.set(publicKeyBase64, new Uint8Array(privateKeyBytes));

  // Return public key for injection into WebView
  return publicKeyBase64;
}

/**
 * Sign a message payload using ECDSA P-256
 *
 * This prevents XSS in the WebView from forging native responses.
 * The private key is stored in memory and never exposed to the WebView.
 * The public key is injected into the WebView for signature verification.
 *
 * Uses ECDSA with P-256 curve and SHA-256 hash for broad browser compatibility.
 *
 * @param payload - The message object to sign
 * @param publicKey - Base64-encoded public key to identify which private key to use
 * @returns ECDSA signature as base64 string (DER format for browser compatibility)
 * @throws Error if private key not found for given public key
 *
 * @example
 * const response = { type: 'response', requestId: '123', jwt: '...' };
 * const signature = signMessage(response, webViewPublicKey);
 * // Send: { ...response, signature }
 */
export function signMessage(payload: object, publicKey: string): string {
  // Look up private key using public key
  const privateKey = keyPairCache.get(publicKey);

  if (!privateKey) {
    throw new Error(`Private key not found for public key: ${publicKey.substring(0, 20)}...`);
  }

  // Serialize message to bytes using canonical JSON (sorted keys)
  const message = canonicalJSON(payload);
  const messageBytes = new TextEncoder().encode(message);

  // Sign with ECDSA P-256 (prehash: true by default, will SHA-256 hash internally)
  // Returns IEEE P1363 format: raw r||s
  const signature = p256.sign(messageBytes, privateKey);

  // Return signature as base64 (IEEE P1363 format, compatible with browser crypto.subtle)
  return base64.fromByteArray(signature);
}

/**
 * Clear a specific key pair from memory
 *
 * Should be called when a WebView session ends to free memory
 * and ensure true ephemeral key lifecycle.
 *
 * @param publicKey - Base64-encoded public key to identify which key pair to remove
 */
export function cleanupKeyPair(publicKey: string): void {
  keyPairCache.delete(publicKey);
}

/**
 * Clear all cached keys from memory
 *
 * This is optional and mainly useful for testing or manual cleanup.
 * Keys are automatically cleared when the app terminates.
 */
export function clearKeys(): void {
  keyPairCache.clear();
}