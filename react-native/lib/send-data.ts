import * as SecureStorage from './secure-storage';
import { UserProfileFns } from './db/models';
import * as base64 from 'base64-js';
import * as ed25519 from '@stablelib/ed25519';

/**
 * Data types that can be sent to WebView via IRL Browser Standard
 */
export enum WebViewDataType {
  PROFILE_DISCONNECTED = 'irl:profile:disconnected',
  ERROR = 'irl:error',
}

/**
 * Generates a signed JWT with user profile details for getProfileDetails() API
 *
 * This is used when the web app calls window.irlBrowser.getProfileDetails()
 * to retrieve the user's profile information.
 *
 * @param did - The user's DID (used to fetch profile and as JWT issuer)
 * @returns Signed JWT string with profile details
 *
 * @example
 * const jwt = await getProfileDetailsJWT("did:key:z6Mk...");
 * // Returns JWT with profile data
 */
export async function getProfileDetailsJWT(did: string): Promise<string> {
  // Fetch user profile from database
  const profile = await UserProfileFns.getProfileByDID(did);
  if (!profile) {
    throw new Error(`No profile found for DID: ${did}`);
  }

  const payload = {
    did: did,
    name: profile.name,
    socials: profile.socialLinks?.map(link => ({
      platform: link.platform,
      handle: link.handle,
    })) || [],
  };
  
  // For getProfileDetails, we don't use a specific event type
  // The method itself indicates the intent
  return createJWT(did, 'irl:profile:details', payload);
}

/**
 * Generates a signed JWT with user avatar for getAvatar() API
 *
 * This is used when the web app calls window.irlBrowser.getAvatar()
 * to retrieve the user's avatar image. Returns a signed JWT containing
 * the DID and avatar data, or null if the user has no avatar.
 *
 * @param did - The user's DID (used to fetch profile and as JWT issuer)
 * @returns Signed JWT string with avatar data, or null if no avatar
 *
 * @example
 * const jwt = await getAvatarJWT("did:key:z6Mk...");
 * // Returns JWT string or null
 * // Decoded payload: { did: "did:key:...", avatar: "data:image/jpeg;base64,..." }
 */
export async function getAvatarJWT(did: string): Promise<string | null> {
  // Fetch user profile from database
  const profile = await UserProfileFns.getProfileByDID(did);
  if (!profile) {
    throw new Error(`No profile found for DID: ${did}`);
  }

  // Return null if user has no avatar
  if (!profile.avatar) {
    return null;
  }

  // Build payload with DID and avatar
  const payload = {
    did: did,
    avatar: profile.avatar,
  };

  // Sign and return JWT
  return createJWT(did, 'irl:avatar', payload);
}

/**
 * Sends data to WebView by generating a signed JWT for events
 *
 * This function orchestrates the data fetching and JWT signing process:
 * 1. Fetches the user's DID private key from secure storage
 * 2. Based on the data type, fetches and formats the appropriate data
 * 3. Signs the data as a JWT using the DID private key
 * 4. Returns the JWT string to be sent to the WebView
 *
 * @param type - The type of data to send (profile disconnected, error, etc.)
 * @param did - The user's DID (used to fetch private key and as JWT issuer)
 * @returns Signed JWT string ready to be posted to WebView
 *
 * @example
 * const jwt = await sendDataToWebView(
 *   WebViewDataType.PROFILE_DISCONNECTED,
 *   "did:key:z6Mk..."
 * );
 * // Send via: window.postMessage({ jwt }, '*');
 */
export async function sendDataToWebView(type: WebViewDataType, did: string): Promise<string> {
  // Build payload based on type
  const payload = await createPayload(type, did);
  return createJWT(did, type, payload);
}

async function createPayload(type: WebViewDataType, did: string): Promise<Record<string, any>> {
  switch (type) {
    case WebViewDataType.PROFILE_DISCONNECTED: {
      // Fetch user profile from database
      const profile = await UserProfileFns.getProfileByDID(did);
      if (!profile) {
        throw new Error(`No profile found for DID: ${did}`);
      }

      return {
        did,
        name: profile.name,
        socials: profile.socialLinks?.map(link => ({
          platform: link.platform,
          handle: link.handle,
        })) || [],
      };
    }

    case WebViewDataType.ERROR: {
      // For errors, payload should contain error details
      return {
        error: 'An error occurred'
      };
    }

    default:
      throw new Error(`Unknown WebViewDataType: ${type}`);
  }
}

/**
 * Signs a JWT with EdDSA algorithm for IRL Browser Standard
 *
 * @param did - User's DID (used as issuer)
 * @param type - Message type (e.g., 'irl:profile:disconnected')
 * @param payload - Data payload to sign (will be placed in 'data' claim)
 * @returns Signed JWT string
 *
 * @example
 * const jwt = await createJWT(
 *   "did:key:z6Mk...",
 *   "irl:profile:disconnected",
 *   { did: "did:key:z6Mk...", name: "Alice", socials: [] }
 * );
 */
async function createJWT(did: string, type: string, payload: Record<string, any>): Promise<string> {
  // Fetch DID private key from secure storage
  const privateKeyAsBase64 = await SecureStorage.getDIDPrivateKey(did);

  if (!privateKeyAsBase64) {
    throw new Error(`No private key found for DID: ${did}`);
  }

  // Decode the private key from base64
  const privateKeyBytes = base64.toByteArray(privateKeyAsBase64);

  // Ed25519 secret key is 64 bytes (32-byte seed + 32-byte public key)
  if (privateKeyBytes.length !== 64) {
    throw new Error('Invalid private key length. Expected 64 bytes.');
  }

  // Build JWT header
  const header = {
    alg: 'EdDSA',
    typ: 'JWT',
  };

  // Build JWT payload with claims per IRL Browser Standard
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 120; // 2 minutes

  const jwtPayload = {
    iss: did,
    iat,
    exp,
    type,
    data: payload,
  };

  // Encode header and payload as base64url
  const headerB64 = base64url.encode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64url.encode(new TextEncoder().encode(JSON.stringify(jwtPayload)));

  // Create signing input: "header.payload"
  const signingInput = `${headerB64}.${payloadB64}`;
  const signingInputBytes = new TextEncoder().encode(signingInput);

  // Sign with Ed25519
  const signature = ed25519.sign(privateKeyBytes, signingInputBytes);

  // Encode signature as base64url
  const signatureB64 = base64url.encode(signature);

  // Return complete JWT: "header.payload.signature"
  return `${signingInput}.${signatureB64}`;
}

// Helper function to encode to base64url (RFC 4648)
const base64url = {
  encode: (input: Uint8Array): string => {
    const base64String = base64.fromByteArray(input);
    // Convert base64 to base64url by replacing + with -, / with _, and removing padding =
    return base64String
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },
};