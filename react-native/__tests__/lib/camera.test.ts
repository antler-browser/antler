jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
jest.mock('expo-crypto', () => ({ getRandomBytes: jest.fn(() => new Uint8Array(32)) }));
jest.mock('../../lib/db/models', () => ({ UserProfileFns: {}, AppStateFns: {} }));

import { handleScannedData } from '../../lib/camera';

// The literal contents of a profile QR code, as produced by serializeExportedProfile and
// read back off a real scan. Kept verbatim: this is the wire format the camera has to
// recognise, and a refactor that stops recognising it silently breaks profile transfer.
const SCANNED_PROFILE_QR = `{
  "type": "local-first-auth:export",
  "version": 1,
  "did": "did:key:z6Mkeo5uMugNBn5PteqvqWuYti7UsfJ9U2ffAKwyeEiCo2KR",
  "publicKey": "BRQmEWy1hiRx9xbz8Ie61fQpJsMX4Zmur1HjR1ltZJA=",
  "privateKey": "BKN7fNQCiX2zHlmGVBNXNzL6YehbCv2UIm+Ibce1mAAFFCYRbLWGJHH3FvPwh7rV9Ckmwxfhma6vUeNHWW1kkA==",
  "name": "Danny",
  "socials": [
    {
      "platform": "INSTAGRAM",
      "handle": "dmathewwws"
    }
  ],
  "avatar": null,
  "exportedAt": "2026-07-13T00:01:29.221Z"
}`;

describe('handleScannedData', () => {
  it('routes a scanned profile export to the import flow', () => {
    expect(handleScannedData(SCANNED_PROFILE_QR)).toEqual({
      type: 'profile',
      value: SCANNED_PROFILE_QR,
    });
  });

  it('still routes a URL to the WebView flow', () => {
    expect(handleScannedData('https://example.com')).toEqual({
      type: 'url',
      value: 'https://example.com',
    });
  });

  it('classifies a DID and falls back to text', () => {
    expect(handleScannedData('did:key:z6Mkeo5u').type).toBe('did');
    expect(handleScannedData('just some text').type).toBe('text');
  });
});
