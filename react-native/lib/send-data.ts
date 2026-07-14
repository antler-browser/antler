import * as SecureStorage from './secure-storage';
import { deriveOriginKeys } from './did';
import { UserProfileFns } from './db/models';
import * as base64 from 'base64-js';
import * as ed25519 from '@stablelib/ed25519';

/**
 * Data types that can be sent to WebView via Local First Auth Specification
 */
export enum WebViewDataType {
  PROFILE_DISCONNECTED = 'localFirstAuth:profile:disconnected',
  ERROR = 'localFirstAuth:error',
}

/**
 * Generates a signed JWT with user profile details for getProfileDetails() API
 *
 * This is used when the web app calls window.localFirstAuth.getProfileDetails()
 * to retrieve the user's profile information.
 *
 * @param did - The user's root profile DID (used to fetch profile and derive the per-origin signing key)
 * @param aud - The mini app URL; its origin becomes the JWT `aud` and scopes the issuer DID
 * @returns Signed JWT string with profile details
 *
 * @example
 * const jwt = await getProfileDetailsJWT("did:key:z6Mk...", "https://example.app");
 * // Returns JWT with profile data
 */
export async function getProfileDetailsJWT(did: string, aud: string): Promise<string> {
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
  return createJWT(did, aud, 'localFirstAuth:profile:details', payload);
}

/**
 * Generates a signed JWT with user avatar for getAvatar() API
 *
 * This is used when the web app calls window.localFirstAuth.getAvatar()
 * to retrieve the user's avatar image. Returns a signed JWT containing
 * the DID and avatar data, or null if the user has no avatar.
 *
 * @param did - The user's root profile DID (used to fetch profile and derive the per-origin signing key)
 * @param aud - The mini app URL; its origin becomes the JWT `aud` and scopes the issuer DID
 * @returns Signed JWT string with avatar data, or null if no avatar
 *
 * @example
 * const jwt = await getAvatarJWT("did:key:z6Mk...", "https://example.app");
 * // Returns JWT string or null
 * // Decoded payload: { did: "did:key:...", avatar: "data:image/jpeg;base64,..." }
 */
export async function getAvatarJWT(did: string, aud: string): Promise<string | null> {
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
  return createJWT(did, aud, 'localFirstAuth:avatar', payload);
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
 * @param did - The user's root profile DID (used to fetch private key and derive the per-origin signing key)
 * @param aud - The mini app URL; its origin becomes the JWT `aud` and scopes the issuer DID
 * @returns Signed JWT string ready to be posted to WebView
 *
 * @example
 * const jwt = await sendDataToWebView(
 *   WebViewDataType.PROFILE_DISCONNECTED,
 *   "did:key:z6Mk...",
 *   "https://example.app"
 * );
 * // Send via: window.postMessage({ jwt }, '*');
 */
export async function sendDataToWebView(type: WebViewDataType, did: string, aud: string): Promise<string> {
  // Build payload based on type
  const payload = await createPayload(type, did);
  return createJWT(did, aud, type, payload);
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
      // For errors, payload should contain structured error details per Local First Auth Specification
      return {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred'
      };
    }

    default:
      throw new Error(`Unknown WebViewDataType: ${type}`);
  }
}

/**
 * Signs a JWT with EdDSA algorithm for Local First Auth Specification
 *
 * The mini app never sees the root DID: signing uses the per-origin key derived from the
 * root key and the origin of `aud`, so `iss` (and `data.did`) is the per-origin DID and
 * `aud` is the origin.
 *
 * @param did - User's root profile DID (used to fetch the root private key)
 * @param aud - URL that launched the WebView; its origin scopes the key and becomes `aud`
 * @param type - Message type (e.g., 'localFirstAuth:profile:disconnected')
 * @param payload - Data payload to sign (will be placed in 'data' claim)
 * @returns Signed JWT string
 *
 * @example
 * const jwt = await createJWT(
 *   "did:key:z6Mk...",
 *   "https://example.app",
 *   "localFirstAuth:profile:disconnected",
 *   { did: "did:key:z6Mk...", name: "Alice", socials: [] }
 * );
 */
async function createJWT(did: string, aud: string, type: string, payload: Record<string, any>): Promise<string> {
  // Fetch root DID private key from secure storage
  const privateKeyAsBase64 = await SecureStorage.getDIDPrivateKey(did);

  if (!privateKeyAsBase64) {
    throw new Error(`No private key found for DID: ${did}`);
  }

  const origin = new URL(aud).origin;
  const derived = deriveOriginKeys(privateKeyAsBase64, origin);
  if ('did' in payload) payload.did = derived.did; // data.did must match iss

  // Build JWT header
  const header = {
    alg: 'EdDSA',
    typ: 'JWT',
  };

  // Build JWT payload with claims per Local First Auth Specification
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 120; // 2 minutes

  const jwtPayload = {
    iss: derived.did,
    aud: origin,
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

  // Sign with the per-origin Ed25519 key
  const signature = ed25519.sign(derived.secretKeyBytes, signingInputBytes);

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