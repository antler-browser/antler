// Mock expo-secure-store before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock db/models before import
jest.mock('../../lib/db/models', () => ({
  UserProfileFns: {
    getProfileByDID: jest.fn(),
  },
}));

import { sendDataToWebView, WebViewDataType } from '../../lib/send-data';
import * as SecureStorage from '../../lib/secure-storage';
import { UserProfileFns } from '../../lib/db/models';
import * as base64 from 'base64-js';
import * as ed25519 from '@stablelib/ed25519';

// Helper function to decode JWT payload without verification
function decodeJwt(jwt: string): any {
  const [, payloadB64] = jwt.split('.');
  // Convert base64url to base64 and add padding
  let base64Payload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed (base64url removes padding, but base64 requires it)
  while (base64Payload.length % 4 !== 0) {
    base64Payload += '=';
  }
  const payloadJson = Buffer.from(base64Payload, 'base64').toString('utf-8');
  return JSON.parse(payloadJson);
}

describe('sendDataToWebView', () => {
  const mockDID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
  const mockAudience = 'https://example.app';
  let mockKeyPair: ed25519.KeyPair;
  let mockPrivateKeyBase64: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Generate a real Ed25519 key pair for testing
    const seed = new Uint8Array(32).fill(42); // Deterministic seed for testing
    mockKeyPair = ed25519.generateKeyPairFromSeed(seed);
    mockPrivateKeyBase64 = base64.fromByteArray(mockKeyPair.secretKey);

    // Mock SecureStorage to return our test private key
    jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(mockPrivateKeyBase64);
  });

  describe('PROFILE_DISCONNECTED', () => {
    it('should create a valid JWT with profile data and type field', async () => {
      const mockProfile = {
        did: mockDID,
        name: 'Charlie',
        avatar: null,
        socialLinks: [],
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (UserProfileFns.getProfileByDID as jest.Mock).mockResolvedValue(mockProfile);

      const jwt = await sendDataToWebView(WebViewDataType.PROFILE_DISCONNECTED, mockDID, mockAudience);
      const decoded = decodeJwt(jwt);

      // Verify type field is at root level of JWT payload
      expect(decoded.type).toBe('localFirstAuth:profile:disconnected');
      expect((decoded.data as any).did).toBe(mockDID);
      expect((decoded.data as any).name).toBe('Charlie');
      // Avatar is no longer included in profile disconnected payload
      expect((decoded.data as any).avatar).toBeUndefined();
      expect((decoded.data as any).socials).toEqual([]);
    });

    it('should handle profile with social links', async () => {
      const mockProfile = {
        did: mockDID,
        name: 'Alice',
        avatar: null,
        socialLinks: [
          { platform: 'INSTAGRAM', handle: 'alice' },
          { platform: 'X', handle: 'alice_x' },
        ],
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (UserProfileFns.getProfileByDID as jest.Mock).mockResolvedValue(mockProfile);

      const jwt = await sendDataToWebView(WebViewDataType.PROFILE_DISCONNECTED, mockDID, mockAudience);
      const decoded = decodeJwt(jwt);

      expect(decoded.type).toBe('localFirstAuth:profile:disconnected');
      expect((decoded.data as any).name).toBe('Alice');
      expect((decoded.data as any).socials).toEqual([
        { platform: 'INSTAGRAM', handle: 'alice' },
        { platform: 'X', handle: 'alice_x' },
      ]);
    });

    it('should throw error when profile not found', async () => {
      (UserProfileFns.getProfileByDID as jest.Mock).mockResolvedValue(null);

      await expect(
        sendDataToWebView(WebViewDataType.PROFILE_DISCONNECTED, mockDID, mockAudience)
      ).rejects.toThrow('No profile found for DID');
    });
  });

  describe('ERROR', () => {
    it('should create a valid JWT with structured error format', async () => {
      const jwt = await sendDataToWebView(WebViewDataType.ERROR, mockDID, mockAudience);
      const decoded = decodeJwt(jwt);

      // Verify type field is at root level of JWT payload
      expect(decoded.type).toBe('localFirstAuth:error');
      // Verify structured error format per Local First Auth Specification
      expect((decoded.data as any).code).toBe('UNKNOWN_ERROR');
      expect((decoded.data as any).message).toBe('An error occurred');
    });
  });

  describe('JWT Header', () => {
    it('should use EdDSA algorithm and JWT type', async () => {
      const mockProfile = {
        did: mockDID,
        name: 'Test',
        avatar: null,
        socialLinks: [],
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (UserProfileFns.getProfileByDID as jest.Mock).mockResolvedValue(mockProfile);

      const jwt = await sendDataToWebView(WebViewDataType.PROFILE_DISCONNECTED, mockDID, mockAudience);

      // Decode header manually
      const [headerB64] = jwt.split('.');
      const headerJson = Buffer.from(
        headerB64.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8');
      const header = JSON.parse(headerJson);

      expect(header.alg).toBe('EdDSA');
      expect(header.typ).toBe('JWT');
    });
  });

  describe('JWT Claims', () => {
    it('should include aud claim per Local First Auth Specification', async () => {
      const mockProfile = {
        did: mockDID,
        name: 'Test',
        avatar: null,
        socialLinks: [],
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (UserProfileFns.getProfileByDID as jest.Mock).mockResolvedValue(mockProfile);

      const jwt = await sendDataToWebView(WebViewDataType.PROFILE_DISCONNECTED, mockDID, mockAudience);
      const decoded = decodeJwt(jwt);

      // Verify aud claim is present and matches the audience
      expect(decoded.aud).toBe(mockAudience);
      // Verify other standard claims
      expect(decoded.iss).toBe(mockDID);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBe(decoded.iat + 120); // 2 minutes
    });
  });

  describe('JWT Signature Verification', () => {
    it('should create a signature that can be verified with the public key', async () => {
      const mockProfile = {
        did: mockDID,
        name: 'Test',
        avatar: null,
        socialLinks: [],
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (UserProfileFns.getProfileByDID as jest.Mock).mockResolvedValue(mockProfile);

      const jwt = await sendDataToWebView(WebViewDataType.PROFILE_DISCONNECTED, mockDID, mockAudience);

      // Split JWT into parts
      const [headerB64, payloadB64, signatureB64] = jwt.split('.');

      // Recreate signing input
      const signingInput = `${headerB64}.${payloadB64}`;
      const signingInputBytes = new TextEncoder().encode(signingInput);

      // Decode signature from base64url to bytes
      // Convert base64url to base64 and add padding if needed
      let signatureBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding
      while (signatureBase64.length % 4 !== 0) {
        signatureBase64 += '=';
      }
      const signature = base64.toByteArray(signatureBase64);

      // Verify signature using the public key
      const isValid = ed25519.verify(mockKeyPair.publicKey, signingInputBytes, signature);

      expect(isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when private key not found', async () => {
      jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(null);

      await expect(
        sendDataToWebView(WebViewDataType.ERROR, mockDID, mockAudience)
      ).rejects.toThrow('No private key found for DID');
    });

    it('should throw error when private key has invalid length', async () => {
      // Create invalid key (wrong length)
      const invalidKey = base64.fromByteArray(new Uint8Array(32)); // Only 32 bytes instead of 64
      jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(invalidKey);

      await expect(
        sendDataToWebView(WebViewDataType.ERROR, mockDID, mockAudience)
      ).rejects.toThrow('Invalid private key length. Expected 64 bytes.');
    });
  });

  describe('Base64URL Encoding', () => {
    it('should not contain characters +, /, or =', async () => {
      const mockProfile = {
        did: mockDID,
        name: 'Test',
        avatar: null,
        socialLinks: [],
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (UserProfileFns.getProfileByDID as jest.Mock).mockResolvedValue(mockProfile);

      const jwt = await sendDataToWebView(WebViewDataType.PROFILE_DISCONNECTED, mockDID, mockAudience);

      // Base64URL should not contain +, /, or = characters
      expect(jwt).not.toContain('+');
      expect(jwt).not.toContain('/');
      expect(jwt).not.toContain('=');
    });
  });
});
