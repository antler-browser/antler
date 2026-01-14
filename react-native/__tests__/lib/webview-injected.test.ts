/**
 * Tests for webview-injected.ts
 *
 * These tests verify the injected JavaScript code that runs inside the WebView.
 * We test the code by executing it in a simulated browser environment with mocked
 * Web APIs (crypto.subtle, TextEncoder, etc.).
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getInjectedJavaScript, BrowserInfo } from '../../lib/webview/webview-injected';

// Type definitions for the window.localFirstAuth API that gets injected
interface LocalFirstAuthAPI {
  getProfileDetails(): Promise<string>;
  getAvatar(): Promise<string | null>;
  getBrowserDetails(): BrowserInfo;
  requestPermission(permission: string): Promise<boolean>;
  close(): void;
}

declare global {
  interface Window {
    localFirstAuth: LocalFirstAuthAPI;
    ReactNativeWebView: {
      postMessage: jest.Mock;
    };
  }
}

describe('webview-injected', () => {
  let mockPostMessage: jest.Mock;
  let mockCrypto: any;
  let originalCrypto: any;
  let testBrowserInfo: BrowserInfo;
  let testPublicKey: string;
  let testPrivateKey: CryptoKey;
  let originalConsole: { [key: string]: any } = {};
  let keysGenerated = false;

  afterEach(() => {
    // Clean up any lingering timers
    jest.clearAllTimers();
    jest.useRealTimers();

    // Clear any lingering event listeners and the localFirstAuth API
    // Since window.localFirstAuth is now non-configurable (XSS protection),
    // we can't delete it between tests. The injected code now checks
    // if it exists before defining it, so this is safe.
    if ((global.window as any).localFirstAuth) {
      const descriptor = Object.getOwnPropertyDescriptor(global.window, 'localFirstAuth');
      if (descriptor && descriptor.configurable) {
        // Only delete if configurable (old behavior for backwards compatibility)
        delete (global.window as any).localFirstAuth;
      }
      // If non-configurable, leave it - the injected code will skip re-definition
    }

    // Restore original console methods
    ['log', 'warn', 'error', 'info'].forEach((method) => {
      if (originalConsole[method]) {
        (console as any)[method] = originalConsole[method];
      }
    });

    // Clear mock calls to prevent pollution across tests
    if (mockPostMessage) {
      mockPostMessage.mockClear();
    }
  });

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Save original console methods
    ['log', 'warn', 'error', 'info'].forEach((method) => {
      originalConsole[method] = (console as any)[method];
    });

    // Mock ReactNativeWebView.postMessage
    mockPostMessage = jest.fn();
    (global as any).window = global;
    (global.window as any).ReactNativeWebView = {
      postMessage: mockPostMessage,
    };

    // Explicitly clear mock calls to ensure clean state
    mockPostMessage.mockClear();

    // Mock window.addEventListener, removeEventListener, and dispatchEvent
    const eventListeners: { [key: string]: Array<(event: any) => void> } = {};

    (global.window as any).addEventListener = jest.fn((event: string, handler: (event: any) => void) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler);
    });

    (global.window as any).removeEventListener = jest.fn((event: string, handler: (event: any) => void) => {
      if (eventListeners[event]) {
        const index = eventListeners[event].indexOf(handler);
        if (index > -1) {
          eventListeners[event].splice(index, 1);
        }
      }
    });

    (global.window as any).dispatchEvent = jest.fn((event: any) => {
      if (eventListeners[event.type]) {
        eventListeners[event.type].forEach((handler) => handler(event));
      }
      return true;
    });

    // Mock MessageEvent constructor if not available
    if (typeof MessageEvent === 'undefined') {
      (global as any).MessageEvent = class MessageEvent {
        type: string;
        data: any;
        constructor(type: string, init?: { data?: any }) {
          this.type = type;
          this.data = init?.data;
        }
      };
    }

    // Mock TextEncoder if not available
    if (typeof TextEncoder === 'undefined') {
      const { TextEncoder: NodeTextEncoder } = require('util');
      (global as any).TextEncoder = NodeTextEncoder;
    }

    // Create test browser info
    testBrowserInfo = {
      name: 'Antler',
      version: '1.0.0',
      platform: 'ios',
      supportedPermissions: ['profile'],
    };

    // Set up crypto.subtle mock with real Web Crypto API
    // For testing, we'll use a simplified mock implementation
    if (!global.crypto || !global.crypto.subtle) {
      const { webcrypto } = require('crypto');
      originalCrypto = global.crypto;
      (global as any).crypto = webcrypto;
    }

    // Generate a real ECDSA P-256 key pair ONCE for all tests
    // (not per test, because window.localFirstAuth is non-configurable and persists)
    if (!keysGenerated) {
      const keyPair = await global.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true,
        ['sign', 'verify']
      );

      testPrivateKey = keyPair.privateKey;

      // Export public key to base64
      const publicKeyBuffer = await global.crypto.subtle.exportKey('raw', keyPair.publicKey);
      testPublicKey = Buffer.from(publicKeyBuffer).toString('base64');
      keysGenerated = true;
    }
  });

  describe('getInjectedJavaScript', () => {
    it('should return a string containing JavaScript code', () => {
      const result = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include the public key in the generated code', () => {
      const result = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      expect(result).toContain(testPublicKey);
    });

    it('should include browser info in the generated code', () => {
      const result = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      expect(result).toContain('Antler');
      expect(result).toContain('1.0.0');
      expect(result).toContain('ios');
    });

    it('should not include console interception code (removed for performance)', () => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);

      // Console interception removed for better WebView load performance
      expect(code).not.toContain('Intercept console');
      expect(code).not.toContain('console forwarding');
    });

    it('should return valid JavaScript that can be evaluated', () => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      expect(() => {
        eval(code);
      }).not.toThrow();
    });
  });

  describe('Injected API - Helper Functions', () => {
    beforeEach(() => {
      // Execute the injected code to set up window.localFirstAuth
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should set up window.localFirstAuth API', () => {
      expect((global.window as any).localFirstAuth).toBeDefined();
      expect(typeof (global.window as any).localFirstAuth.getProfileDetails).toBe('function');
      expect(typeof (global.window as any).localFirstAuth.getAvatar).toBe('function');
      expect(typeof (global.window as any).localFirstAuth.getBrowserDetails).toBe('function');
      expect(typeof (global.window as any).localFirstAuth.requestPermission).toBe('function');
      expect(typeof (global.window as any).localFirstAuth.close).toBe('function');
    });
  });

  describe('window.localFirstAuth.getBrowserDetails', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should return browser info synchronously', () => {
      const result = (global.window as any).localFirstAuth.getBrowserDetails();
      expect(result).toEqual(testBrowserInfo);
    });

    it('should return correct browser name', () => {
      const result = (global.window as any).localFirstAuth.getBrowserDetails();
      expect(result.name).toBe('Antler');
    });

    it('should return correct version', () => {
      const result = (global.window as any).localFirstAuth.getBrowserDetails();
      expect(result.version).toBe('1.0.0');
    });

    it('should return correct platform', () => {
      const result = (global.window as any).localFirstAuth.getBrowserDetails();
      expect(result.platform).toBe('ios');
    });

    it('should return supported permissions', () => {
      const result = (global.window as any).localFirstAuth.getBrowserDetails();
      expect(result.supportedPermissions).toEqual(['profile']);
    });
  });

  describe('window.localFirstAuth.close', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should post a close message to React Native', () => {
      (global.window as any).localFirstAuth.close();

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      expect(message.type).toBe('localFirstAuth:api:close');
    });

    it('should not wait for a response', () => {
      const result = (global.window as any).localFirstAuth.close();
      expect(result).toBeUndefined();
    });
  });

  describe('window.localFirstAuth.getProfileDetails', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should send a message to React Native with request ID', () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockPostMessage.mock.calls[0][0] as string as string);
      expect(message.type).toBe('localFirstAuth:api:getProfileDetails');
      expect(message.requestId).toBeDefined();
      expect(typeof message.requestId).toBe('string');
    });

    it('should return a promise', () => {
      const result = (global.window as any).localFirstAuth.getProfileDetails();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve with JWT when valid signed response is received', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      // Get the request ID from the posted message
      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Create a signed response
      const response = {
        type: 'localFirstAuth:api:getProfileDetails:response',
        requestId: requestId,
        jwt: 'test-jwt-token',
        timestamp: Date.now(),
      };

      // Sign the response (without the signature field)
      const messageToSign = JSON.stringify(response, Object.keys(response).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      // Simulate receiving the response
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...response,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBe('test-jwt-token');
    });

    it('should reject with timeout error if no response received', async () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      // Fast-forward time by 6 seconds to trigger timeout
      jest.advanceTimersByTime(6000);

      await expect(promise).rejects.toThrow('Request timed out');

      // Restore real timers
      jest.useRealTimers();
    });

    it('should reject if signature verification fails', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Send response with invalid signature
      const response = {
        type: 'localFirstAuth:api:getProfileDetails:response',
        requestId: requestId,
        jwt: 'test-jwt-token',
        timestamp: Date.now(),
        signature: 'invalid-signature',
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(response),
      });
      window.dispatchEvent(messageEvent);

      await expect(promise).rejects.toThrow('Invalid signature - possible XSS forgery attempt');
    });

    it('should ignore responses with wrong request ID', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Send response with wrong request ID
      const wrongResponse = {
        type: 'localFirstAuth:api:getProfileDetails:response',
        requestId: 'wrong-id',
        jwt: 'test-jwt-token',
        timestamp: Date.now(),
      };

      const messageToSign = JSON.stringify(wrongResponse, Object.keys(wrongResponse).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...wrongResponse,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      // Now send correct response
      const correctResponse = {
        type: 'localFirstAuth:api:getProfileDetails:response',
        requestId: requestId,
        jwt: 'correct-jwt-token',
        timestamp: Date.now(),
      };

      const correctMessageToSign = JSON.stringify(correctResponse, Object.keys(correctResponse).sort());
      const correctMessageBytes = new TextEncoder().encode(correctMessageToSign);
      const correctSignatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        correctMessageBytes
      );
      const correctSignature = Buffer.from(correctSignatureBuffer).toString('base64');

      const correctMessageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...correctResponse,
          signature: correctSignature,
        }),
      });
      window.dispatchEvent(correctMessageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBe('correct-jwt-token');
    });

    it('should handle error responses from native', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Send error response (note: error responses don't include 'error' field in signed message, only in full response)
      // The signed portion should only include type, requestId, timestamp
      const signedPortion = {
        type: 'localFirstAuth:api:getProfileDetails:error',
        requestId: requestId,
        timestamp: Date.now(),
      };

      const messageToSign = JSON.stringify(signedPortion, Object.keys(signedPortion).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...signedPortion,
          error: 'Profile not found',
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      await expect(promise).rejects.toThrow('Profile not found');
    });
  });

  describe('window.localFirstAuth.getAvatar', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should send a message to React Native with request ID', () => {
      const promise = (global.window as any).localFirstAuth.getAvatar();

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      expect(message.type).toBe('localFirstAuth:api:getAvatar');
      expect(message.requestId).toBeDefined();
      expect(typeof message.requestId).toBe('string');
    });

    it('should return a promise', () => {
      const result = (global.window as any).localFirstAuth.getAvatar();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve with JWT string when valid signed response is received', async () => {
      const promise = (global.window as any).localFirstAuth.getAvatar();

      // Get the request ID from the posted message
      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Create a signed response
      const response = {
        type: 'localFirstAuth:api:getAvatar:response',
        requestId: requestId,
        jwt: 'test-avatar-jwt-token',
        timestamp: Date.now(),
      };

      // Sign the response (without the signature field)
      const messageToSign = JSON.stringify(response, Object.keys(response).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      // Simulate receiving the response
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...response,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBe('test-avatar-jwt-token');
    });

    it('should resolve with null when user has no avatar', async () => {
      const promise = (global.window as any).localFirstAuth.getAvatar();

      // Get the request ID from the posted message
      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Create a signed response with null result
      const response = {
        type: 'localFirstAuth:api:getAvatar:response',
        requestId: requestId,
        result: null,
        timestamp: Date.now(),
      };

      // Sign the response
      const messageToSign = JSON.stringify(response, Object.keys(response).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      // Simulate receiving the response
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...response,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBeNull();
    });

    it('should reject with timeout error if no response received', async () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      const promise = (global.window as any).localFirstAuth.getAvatar();

      // Fast-forward time by 6 seconds to trigger timeout
      jest.advanceTimersByTime(6000);

      await expect(promise).rejects.toThrow('Request timed out');

      // Restore real timers
      jest.useRealTimers();
    });

    it('should reject if signature verification fails', async () => {
      const promise = (global.window as any).localFirstAuth.getAvatar();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Send response with invalid signature
      const response = {
        type: 'localFirstAuth:api:getAvatar:response',
        requestId: requestId,
        jwt: 'test-avatar-jwt',
        timestamp: Date.now(),
        signature: 'invalid-signature',
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(response),
      });
      window.dispatchEvent(messageEvent);

      await expect(promise).rejects.toThrow('Invalid signature - possible XSS forgery attempt');
    });

    it('should ignore responses with wrong request ID', async () => {
      const promise = (global.window as any).localFirstAuth.getAvatar();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Send response with wrong request ID
      const wrongResponse = {
        type: 'localFirstAuth:api:getAvatar:response',
        requestId: 'wrong-id',
        jwt: 'wrong-jwt-token',
        timestamp: Date.now(),
      };

      const messageToSign = JSON.stringify(wrongResponse, Object.keys(wrongResponse).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...wrongResponse,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      // Now send correct response
      const correctResponse = {
        type: 'localFirstAuth:api:getAvatar:response',
        requestId: requestId,
        jwt: 'correct-avatar-jwt-token',
        timestamp: Date.now(),
      };

      const correctMessageToSign = JSON.stringify(correctResponse, Object.keys(correctResponse).sort());
      const correctMessageBytes = new TextEncoder().encode(correctMessageToSign);
      const correctSignatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        correctMessageBytes
      );
      const correctSignature = Buffer.from(correctSignatureBuffer).toString('base64');

      const correctMessageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...correctResponse,
          signature: correctSignature,
        }),
      });
      window.dispatchEvent(correctMessageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBe('correct-avatar-jwt-token');
    });

    it('should handle error responses from native', async () => {
      const promise = (global.window as any).localFirstAuth.getAvatar();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Send error response
      const signedPortion = {
        type: 'localFirstAuth:api:getAvatar:error',
        requestId: requestId,
        timestamp: Date.now(),
      };

      const messageToSign = JSON.stringify(signedPortion, Object.keys(signedPortion).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...signedPortion,
          error: 'Failed to load avatar',
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      await expect(promise).rejects.toThrow('Failed to load avatar');
    });
  });

  describe('window.localFirstAuth.requestPermission', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should send permission request with permission parameter', () => {
      const promise = (global.window as any).localFirstAuth.requestPermission('camera');

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      expect(message.type).toBe('localFirstAuth:api:requestPermission');
      expect(message.permission).toBe('camera');
      expect(message.requestId).toBeDefined();
    });

    it('should resolve with boolean result when valid response received', async () => {
      const promise = (global.window as any).localFirstAuth.requestPermission('camera');

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      const response = {
        type: 'localFirstAuth:api:requestPermission:response',
        requestId: requestId,
        result: true,
        timestamp: Date.now(),
      };

      const messageToSign = JSON.stringify(response, Object.keys(response).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...response,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should handle permission denied', async () => {
      const promise = (global.window as any).localFirstAuth.requestPermission('location');

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      const response = {
        type: 'localFirstAuth:api:requestPermission:response',
        requestId: requestId,
        result: false,
        timestamp: Date.now(),
      };

      const messageToSign = JSON.stringify(response, Object.keys(response).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...response,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe('Request ID Generation', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should generate unique request IDs for concurrent requests', () => {
      // Make multiple concurrent requests
      (global.window as any).localFirstAuth.getProfileDetails();
      (global.window as any).localFirstAuth.getProfileDetails();
      (global.window as any).localFirstAuth.requestPermission('camera');

      expect(mockPostMessage).toHaveBeenCalledTimes(3);

      const requestId1 = JSON.parse(mockPostMessage.mock.calls[0][0] as string).requestId;
      const requestId2 = JSON.parse(mockPostMessage.mock.calls[1][0] as string).requestId;
      const requestId3 = JSON.parse(mockPostMessage.mock.calls[2][0] as string).requestId;

      expect(requestId1).not.toBe(requestId2);
      expect(requestId1).not.toBe(requestId3);
      expect(requestId2).not.toBe(requestId3);
    });

    it('should generate request IDs in valid format', () => {
      (global.window as any).localFirstAuth.getProfileDetails();

      const message = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = message.requestId;

      // Should be a non-empty string
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);

      // If crypto.randomUUID is used, it should be in UUID format
      // If crypto.getRandomValues is used, it should be a hex string
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
      const isHex = /^[0-9a-f]+$/i.test(requestId);

      expect(isUUID || isHex).toBe(true);
    });
  });

  describe('Signature Verification Edge Cases', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should reject response without signature', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Send response without signature field
      const response = {
        type: 'localFirstAuth:api:getProfileDetails:response',
        requestId: requestId,
        jwt: 'test-jwt-token',
        timestamp: Date.now(),
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(response),
      });
      window.dispatchEvent(messageEvent);

      await expect(promise).rejects.toThrow('Invalid signature - possible XSS forgery attempt');
    });

    it('should reject response with malformed signature', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      const response = {
        type: 'localFirstAuth:api:getProfileDetails:response',
        requestId: requestId,
        jwt: 'test-jwt-token',
        timestamp: Date.now(),
        signature: 'not-a-valid-base64-signature!!!',
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(response),
      });
      window.dispatchEvent(messageEvent);

      await expect(promise).rejects.toThrow('Invalid signature - possible XSS forgery attempt');
    });

    it('should ignore messages with invalid JSON', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      // Send invalid JSON
      const messageEvent = new MessageEvent('message', {
        data: 'not valid json{{{',
      });
      window.dispatchEvent(messageEvent);

      // The promise should still be pending (waiting for valid response or timeout)
      // We can't easily test this without waiting for timeout, so we just verify no error thrown
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('Canonical JSON Serialization', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      // Clear mock after evaluation (eval triggers console.log which calls postMessage)
      mockPostMessage.mockClear();
    });

    it('should sort object keys for consistent serialization', async () => {
      const promise = (global.window as any).localFirstAuth.getProfileDetails();

      const sentMessage = JSON.parse(mockPostMessage.mock.calls[0][0] as string);
      const requestId = sentMessage.requestId;

      // Create response with keys in non-alphabetical order
      const responseUnsorted = {
        timestamp: Date.now(),
        type: 'localFirstAuth:api:getProfileDetails:response',
        requestId: requestId,
        jwt: 'test-jwt-token',
      };

      // For signing, keys should be sorted alphabetically
      const responseSorted = {
        jwt: responseUnsorted.jwt,
        requestId: responseUnsorted.requestId,
        timestamp: responseUnsorted.timestamp,
        type: responseUnsorted.type,
      };

      // Sign with sorted keys
      const messageToSign = JSON.stringify(responseSorted, Object.keys(responseSorted).sort());
      const messageBytes = new TextEncoder().encode(messageToSign);
      const signatureBuffer = await global.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        testPrivateKey,
        messageBytes
      );
      const signature = Buffer.from(signatureBuffer).toString('base64');

      // Send with unsorted keys (signature should still verify)
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          ...responseUnsorted,
          signature,
        }),
      });
      window.dispatchEvent(messageEvent);

      // Wait for async event handlers to complete
      await new Promise(resolve => setImmediate(resolve));

      const result = await promise;
      expect(result).toBe('test-jwt-token');
    });
  });

  describe('XSS Protection - Object.defineProperty', () => {
    beforeEach(() => {
      const code = getInjectedJavaScript(testPublicKey, testBrowserInfo);
      eval(code);
      mockPostMessage.mockClear();
    });

    describe('Prevent window.localFirstAuth reassignment', () => {
      it('should prevent reassignment of window.localFirstAuth', () => {
        const original = window.localFirstAuth;
        // In non-strict mode, this fails silently without throwing
        (window as any).localFirstAuth = {};
        // Verify assignment failed - still has original value
        expect(window.localFirstAuth).toBe(original);
        expect(window.localFirstAuth).not.toEqual({});
      });

      it('should prevent setting window.localFirstAuth to null', () => {
        const original = window.localFirstAuth;
        (window as any).localFirstAuth = null;
        // Verify assignment failed
        expect(window.localFirstAuth).toBe(original);
        expect(window.localFirstAuth).not.toBeNull();
      });

      it('should prevent setting window.localFirstAuth to a malicious object', () => {
        const original = window.localFirstAuth;
        (window as any).localFirstAuth = {
          getProfileDetails: () => Promise.resolve('malicious-jwt'),
          getBrowserDetails: () => ({ name: 'Fake Browser' } as BrowserInfo),
          requestPermission: () => Promise.resolve(true),
          close: () => { /* do nothing */ }
        };
        // Verify assignment failed
        expect(window.localFirstAuth).toBe(original);
      });

      it('should preserve window.localFirstAuth after failed reassignment attempt', () => {
        const original = window.localFirstAuth;
        try {
          (window as any).localFirstAuth = {};
        } catch (e) {
          // Expected to throw
        }
        expect(window.localFirstAuth).toBe(original);
        expect(window.localFirstAuth).toBeDefined();
      });
    });

    describe('Prevent window.localFirstAuth deletion', () => {
      it('should prevent deletion of window.localFirstAuth', () => {
        const original = window.localFirstAuth;
        // In non-strict mode, delete fails silently without throwing
        delete (window as any).localFirstAuth;
        // Verify deletion failed
        expect(window.localFirstAuth).toBe(original);
        expect(window.localFirstAuth).toBeDefined();
      });

      it('should still have window.localFirstAuth defined after delete attempt', () => {
        try {
          delete (window as any).localFirstAuth;
        } catch (e) {
          // Expected to throw
        }
        expect(window.localFirstAuth).toBeDefined();
        expect(typeof window.localFirstAuth.getProfileDetails).toBe('function');
      });
    });

    describe('Prevent method modification (Object.freeze)', () => {
      it('should prevent replacing close method', () => {
        const originalClose = window.localFirstAuth.close;
        // In non-strict mode, this fails silently without throwing
        (window as any).localFirstAuth.close = () => {
          console.log('malicious close');
        };
        // Verify modification failed
        expect(window.localFirstAuth.close).toBe(originalClose);
      });

      it('should prevent replacing getProfileDetails', () => {
        const originalMethod = window.localFirstAuth.getProfileDetails;
        (window as any).localFirstAuth.getProfileDetails = () => {
          return Promise.resolve('fake-jwt');
        };
        // Verify modification failed
        expect(window.localFirstAuth.getProfileDetails).toBe(originalMethod);
      });

      it('should prevent replacing getAvatar', () => {
        const originalMethod = window.localFirstAuth.getAvatar;
        (window as any).localFirstAuth.getAvatar = () => {
          return Promise.resolve('fake-avatar');
        };
        // Verify modification failed
        expect(window.localFirstAuth.getAvatar).toBe(originalMethod);
      });

      it('should prevent replacing getBrowserDetails', () => {
        const originalMethod = window.localFirstAuth.getBrowserDetails;
        (window as any).localFirstAuth.getBrowserDetails = () => {
          return { name: 'Fake' } as BrowserInfo;
        };
        // Verify modification failed
        expect(window.localFirstAuth.getBrowserDetails).toBe(originalMethod);
      });

      it('should prevent replacing requestPermission', () => {
        const originalMethod = window.localFirstAuth.requestPermission;
        (window as any).localFirstAuth.requestPermission = () => {
          return Promise.resolve(true);
        };
        // Verify modification failed
        expect(window.localFirstAuth.requestPermission).toBe(originalMethod);
      });

      it('should preserve original methods after failed modification attempt', () => {
        const originalClose = window.localFirstAuth.close;
        try {
          (window as any).localFirstAuth.close = () => {};
        } catch (e) {
          // Expected to throw
        }
        expect(window.localFirstAuth.close).toBe(originalClose);
      });
    });

    describe('Prevent adding new properties', () => {
      it('should not allow adding new methods to window.localFirstAuth', () => {
        // In non-strict mode, this fails silently without throwing
        (window as any).localFirstAuth.maliciousMethod = () => {
          console.log('XSS attack');
        };
        // Verify property was not added
        expect((window as any).localFirstAuth.maliciousMethod).toBeUndefined();
      });

      it('should not allow adding new properties to window.localFirstAuth', () => {
        (window as any).localFirstAuth.isCompromised = true;
        // Verify property was not added
        expect((window as any).localFirstAuth.isCompromised).toBeUndefined();
      });

      it('should not have malicious properties after failed addition attempt', () => {
        try {
          (window as any).localFirstAuth.evil = true;
        } catch (e) {
          // Expected to throw
        }
        expect((window as any).localFirstAuth.evil).toBeUndefined();
      });
    });

    describe('Verify normal functionality still works after protection', () => {
      it('should still allow calling getProfileDetails normally', () => {
        const result = window.localFirstAuth.getProfileDetails();
        expect(result).toBeInstanceOf(Promise);
      });

      it('should still allow calling getBrowserDetails normally', () => {
        const result = window.localFirstAuth.getBrowserDetails();
        expect(result).toEqual(testBrowserInfo);
      });

      it('should still allow calling close normally', () => {
        expect(() => {
          window.localFirstAuth.close();
        }).not.toThrow();
        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        expect(mockPostMessage).toHaveBeenCalledWith(
          JSON.stringify({ type: 'localFirstAuth:api:close' })
          // Note: No second argument - ReactNativeWebView.postMessage only accepts one argument
        );
      });

      it('should still allow calling requestPermission normally', () => {
        const result = window.localFirstAuth.requestPermission('camera');
        expect(result).toBeInstanceOf(Promise);
      });

      it('should have all 5 expected methods available', () => {
        expect(typeof window.localFirstAuth.getProfileDetails).toBe('function');
        expect(typeof window.localFirstAuth.getAvatar).toBe('function');
        expect(typeof window.localFirstAuth.getBrowserDetails).toBe('function');
        expect(typeof window.localFirstAuth.requestPermission).toBe('function');
        expect(typeof window.localFirstAuth.close).toBe('function');
      });
    });

    describe('Enumerable property', () => {
      it('should show window.localFirstAuth in Object.keys(window) for discoverability', () => {
        const keys = Object.keys(window);
        expect(keys).toContain('localFirstAuth');
      });

      it('should be enumerable in property descriptor', () => {
        const descriptor = Object.getOwnPropertyDescriptor(window, 'localFirstAuth');
        expect(descriptor).toBeDefined();
        expect(descriptor?.enumerable).toBe(true);
      });

      it('should have correct property descriptor configuration', () => {
        const descriptor = Object.getOwnPropertyDescriptor(window, 'localFirstAuth');
        expect(descriptor?.writable).toBe(false);
        expect(descriptor?.configurable).toBe(false);
        expect(descriptor?.enumerable).toBe(true);
      });
    });

    describe('Object.freeze verification', () => {
      it('should have frozen window.localFirstAuth object', () => {
        expect(Object.isFrozen(window.localFirstAuth)).toBe(true);
      });

      it('should not be extensible (cannot add properties)', () => {
        expect(Object.isExtensible(window.localFirstAuth)).toBe(false);
      });

      it('should be sealed (cannot reconfigure properties)', () => {
        expect(Object.isSealed(window.localFirstAuth)).toBe(true);
      });
    });
  });
});
