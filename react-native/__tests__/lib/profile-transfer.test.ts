jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// did.ts imports expo-crypto at module scope for key generation, which import/export never uses.
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(32).fill(3)),
}));

jest.mock('../../lib/db/models', () => ({
  UserProfileFns: {
    getProfileByDID: jest.fn(),
    createProfileByDid: jest.fn(),
    updateProfileByDID: jest.fn(),
  },
  AppStateFns: {
    setCurrentDid: jest.fn(),
  },
}));

import * as base64 from 'base64-js';
import * as ed25519 from '@stablelib/ed25519';
import * as ProfileTransfer from '../../lib/profile-transfer';
import * as SecureStorage from '../../lib/secure-storage';
import { deriveKeysFromPrivateKey } from '../../lib/did';
import { SocialPlatform } from '../../lib/social-links';
import { UserProfileFns, AppStateFns } from '../../lib/db/models';

const mockGetProfileByDID = UserProfileFns.getProfileByDID as jest.Mock;
const mockCreateProfile = UserProfileFns.createProfileByDid as jest.Mock;
const mockUpdateProfile = UserProfileFns.updateProfileByDID as jest.Mock;
const mockSetCurrentDid = AppStateFns.setCurrentDid as jest.Mock;

// A fixed seed, so the DID below is a literal we can assert against. That literal is the
// contract with every other Local First Auth implementation: if a refactor breaks the
// multicodec prefix or the base58btc encoding, this fails loudly instead of silently
// producing files no mini app can read.
const SEED = new Uint8Array(32).fill(7);
const KEY_PAIR = ed25519.generateKeyPairFromSeed(SEED);
const PRIVATE_KEY = base64.fromByteArray(KEY_PAIR.secretKey);
const PUBLIC_KEY = base64.fromByteArray(KEY_PAIR.publicKey);
const DID = 'did:key:z6MkvDqGT54cXesYGvABpF1UapVNwjCqRcafi4Px6Thv5T3Z';

const AVATAR = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

function validFile(overrides: Partial<ProfileTransfer.ExportedProfile> = {}): any {
  return {
    type: ProfileTransfer.EXPORT_FILE_TYPE,
    version: ProfileTransfer.EXPORT_FILE_VERSION,
    did: DID,
    publicKey: PUBLIC_KEY,
    privateKey: PRIVATE_KEY,
    name: 'Alice Anderson',
    socials: [{ platform: 'INSTAGRAM', handle: 'alice' }],
    avatar: AVATAR,
    exportedAt: '2026-07-12T10:30:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks resets calls but keeps implementations, so a rejection set by one test
  // would otherwise leak into the next.
  mockGetProfileByDID.mockResolvedValue(null);
  mockCreateProfile.mockResolvedValue(undefined);
  mockUpdateProfile.mockResolvedValue(undefined);
  mockSetCurrentDid.mockResolvedValue(undefined);
});

describe('DID derivation', () => {
  it('derives the documented DID from the private key', () => {
    const derived = deriveKeysFromPrivateKey(PRIVATE_KEY);
    expect(derived.did).toBe(DID);
    expect(derived.publicKeyBase64).toBe(PUBLIC_KEY);
  });

  it('encodes the public key as standard base64 of exactly 32 bytes', () => {
    const derived = deriveKeysFromPrivateKey(PRIVATE_KEY);
    expect(base64.toByteArray(derived.publicKeyBase64)).toHaveLength(32);
    expect(base64.toByteArray(PRIVATE_KEY)).toHaveLength(64);
    // The public key is the trailing half of the secret key.
    expect(Array.from(derived.publicKeyBytes)).toEqual(Array.from(KEY_PAIR.secretKey.slice(32)));
  });
});

describe('validateExportedProfile', () => {
  it('accepts a well-formed file', () => {
    const result = ProfileTransfer.validateExportedProfile(validFile());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it.each([
    ['a non-object', 'just a string'],
    ['an array', []],
    ['a wrong type', validFile({ type: 'something-else' as any })],
    ['an unsupported version', validFile({ version: 99 as any })],
  ])('rejects %s', (_label, input) => {
    expect(ProfileTransfer.validateExportedProfile(input).valid).toBe(false);
  });

  it('rejects a tampered DID', () => {
    const result = ProfileTransfer.validateExportedProfile(
      validFile({ did: 'did:key:z6MksomeoneElsesIdentity' })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('DID');
  });

  it('rejects a tampered public key', () => {
    const other = ed25519.generateKeyPairFromSeed(new Uint8Array(32).fill(9));
    const result = ProfileTransfer.validateExportedProfile(
      validFile({ publicKey: base64.fromByteArray(other.publicKey) })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('public key');
  });

  it.each([
    ['a key of the wrong length', base64.fromByteArray(new Uint8Array(32).fill(1))],
    ['a key that is not base64', '!!!!not-base64!!!'],
    ['a missing key', undefined],
  ])('rejects %s and stops before the derived checks', (_label, privateKey) => {
    const result = ProfileTransfer.validateExportedProfile(validFile({ privateKey: privateKey as any }));
    expect(result.valid).toBe(false);
    // Only the key error — nothing downstream of the key is meaningful once it's bad.
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('private key');
  });

  it('rejects out-of-alphabet base64 that would otherwise decode to 64 bytes', () => {
    // base64-js only checks length % 4; without an alphabet guard this decodes to garbage.
    const sneaky = '!'.repeat(88);
    expect(ProfileTransfer.validateExportedProfile(validFile({ privateKey: sneaky })).valid).toBe(false);
  });

  it.each([
    ['a malformed name', validFile({ name: 42 as any })],
    ['socials that are not an array', validFile({ socials: 'nope' as any })],
    ['a malformed socials entry', validFile({ socials: [{ platform: 'X' }] as any })],
    ['a malformed avatar', validFile({ avatar: 7 as any })],
  ])('rejects %s', (_label, input) => {
    expect(ProfileTransfer.validateExportedProfile(input).valid).toBe(false);
  });

  it('never leaks key material in its error messages', () => {
    const inputs = [
      validFile({ type: 'bad' as any }),
      validFile({ version: 99 as any }),
      validFile({ did: 'did:key:zWrong' }),
    ];

    for (const input of inputs) {
      const result = ProfileTransfer.validateExportedProfile(input);
      expect(result.errors.join(' ')).not.toContain(PRIVATE_KEY);
    }
  });
});

describe('parseExportedProfile', () => {
  it('parses a JSON export file', () => {
    const result = ProfileTransfer.parseExportedProfile(JSON.stringify(validFile()));
    expect(result.valid).toBe(true);
    expect(result.profile?.did).toBe(DID);
  });

  it('tolerates a byte order mark', () => {
    const result = ProfileTransfer.parseExportedProfile('﻿' + JSON.stringify(validFile()));
    expect(result.valid).toBe(true);
  });

  it('rejects text that is not JSON and not a key', () => {
    expect(ProfileTransfer.parseExportedProfile('{ not json').valid).toBe(false);
    expect(ProfileTransfer.parseExportedProfile('').valid).toBe(false);
  });

  it('accepts a bare private key and synthesizes the envelope', () => {
    const result = ProfileTransfer.parseExportedProfile(PRIVATE_KEY);
    expect(result.valid).toBe(true);
    expect(result.profile?.did).toBe(DID);
    expect(result.profile?.publicKey).toBe(PUBLIC_KEY);
    expect(result.profile?.name).toBe('anonymous');
  });

  it('accepts a bare private key pasted with stray whitespace', () => {
    const wrapped = `  ${PRIVATE_KEY.slice(0, 40)}\n${PRIVATE_KEY.slice(40)}  `;
    expect(ProfileTransfer.parseExportedProfile(wrapped).profile?.did).toBe(DID);
  });
});

// The gate a scanned QR code passes through before the camera hands it to the import
// screen. It runs on every scan, so it stays structural: no crypto, no database.
describe('isExportPayload', () => {
  it('recognizes a serialized export file, pretty-printed or compact', () => {
    const profile = validFile({ avatar: null });
    expect(ProfileTransfer.isExportPayload(ProfileTransfer.serializeExportedProfile(profile))).toBe(true);
    expect(ProfileTransfer.isExportPayload(JSON.stringify(profile))).toBe(true);
  });

  it('tolerates a byte order mark and surrounding whitespace', () => {
    expect(ProfileTransfer.isExportPayload(`﻿\n  ${JSON.stringify(validFile())}  \n`)).toBe(true);
  });

  it('rejects a bare private key, which parseExportedProfile would otherwise accept', () => {
    // Deliberate: a QR code carries no intent, so any unrelated base64 that happened to
    // decode to 64 bytes would drag the user into the import screen. Paste and the file
    // picker still take a bare key.
    expect(ProfileTransfer.isExportPayload(PRIVATE_KEY)).toBe(false);
    expect(ProfileTransfer.parseExportedProfile(PRIVATE_KEY).valid).toBe(true);
  });

  // The predicate is a sniff, not validation. A tampered envelope must still reach the
  // import screen, so the screen can tell the user why it was rejected.
  it('accepts a tampered envelope that parseExportedProfile then rejects', () => {
    const tampered = JSON.stringify(
      validFile({ privateKey: base64.fromByteArray(new Uint8Array(64).fill(1)) })
    );
    expect(ProfileTransfer.isExportPayload(tampered)).toBe(true);
    expect(ProfileTransfer.parseExportedProfile(tampered).valid).toBe(false);
  });

  it.each([
    ['a URL', 'https://example.com'],
    ['a DID', DID],
    ['arbitrary text', 'hello world'],
    ['empty text', ''],
    ['JSON that is not an export file', '{"foo":1}'],
    ['the magic string outside an object', ProfileTransfer.EXPORT_FILE_TYPE],
    ['an envelope truncated mid-magic-string', '{"type":"local-first-a'],
  ])('rejects %s', (_label, input) => {
    expect(ProfileTransfer.isExportPayload(input)).toBe(false);
  });
});

describe('toProfileFields', () => {
  it('maps uppercase platforms back to the app enum', () => {
    const fields = ProfileTransfer.toProfileFields(
      validFile({
        socials: [
          { platform: 'INSTAGRAM', handle: 'alice' },
          { platform: 'KO_FI', handle: 'alice' },
        ],
      })
    );

    expect(fields.socialLinks).toEqual([
      { platform: SocialPlatform.INSTAGRAM, handle: 'alice' },
      { platform: SocialPlatform.KO_FI, handle: 'alice' },
    ]);
    expect(fields.skippedSocials).toBe(0);
  });

  it('drops platforms it does not recognise rather than storing them', () => {
    const fields = ProfileTransfer.toProfileFields(
      validFile({
        socials: [
          { platform: 'MYSPACE', handle: 'alice' },
          { platform: 'INSTAGRAM', handle: 'alice' },
        ],
      })
    );

    expect(fields.socialLinks).toEqual([{ platform: SocialPlatform.INSTAGRAM, handle: 'alice' }]);
    expect(fields.skippedSocials).toBe(1);
  });

  it('keeps a data: URI avatar', () => {
    expect(ProfileTransfer.toProfileFields(validFile()).avatar).toBe(AVATAR);
  });

  it('drops a remote avatar URL, which would beacon on every render', () => {
    expect(ProfileTransfer.toProfileFields(validFile({ avatar: 'https://evil.example/x.png' })).avatar).toBeNull();
  });

  it('falls back to anonymous when the name is absent or empty', () => {
    expect(ProfileTransfer.toProfileFields(validFile({ name: undefined })).name).toBe('anonymous');
    expect(ProfileTransfer.toProfileFields(validFile({ name: '   ' })).name).toBe('anonymous');
  });

  it('always takes the DID from the private key, never from the file', () => {
    const fields = ProfileTransfer.toProfileFields(validFile({ did: 'did:key:zLies' }));
    expect(fields.did).toBe(DID);
  });
});

describe('buildExportedProfile', () => {
  beforeEach(() => {
    mockGetProfileByDID.mockResolvedValue({
      did: DID,
      name: 'Alice Anderson',
      avatar: AVATAR,
      socialLinks: [{ platform: SocialPlatform.INSTAGRAM, handle: 'alice' }],
    });
    jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(PRIVATE_KEY);
  });

  it('produces a file that validates, with uppercase platforms', async () => {
    const exported = await ProfileTransfer.buildExportedProfile(DID);

    expect(exported.type).toBe('local-first-auth:export');
    expect(exported.version).toBe(1);
    expect(exported.did).toBe(DID);
    expect(exported.publicKey).toBe(PUBLIC_KEY);
    expect(exported.socials).toEqual([{ platform: 'INSTAGRAM', handle: 'alice' }]);
    expect(exported.avatar).toBe(AVATAR);
    expect(ProfileTransfer.validateExportedProfile(exported).valid).toBe(true);
  });

  it('fails when the private key is missing from the device', async () => {
    jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(null);
    await expect(ProfileTransfer.buildExportedProfile(DID)).rejects.toMatchObject({
      code: 'PRIVATE_KEY_NOT_FOUND',
    });
  });

  it('fails when the profile is not on the device', async () => {
    mockGetProfileByDID.mockResolvedValue(null);
    await expect(ProfileTransfer.buildExportedProfile(DID)).rejects.toMatchObject({
      code: 'PROFILE_NOT_FOUND',
    });
  });

  describe('origin-scoped', () => {
    const ORIGIN = 'https://example.com';
    // The spec's test vector for this root key and origin.
    const SCOPED_DID = 'did:key:z6MksHmq5juqxMRUt6UYxnbCfprSmsEcaLd9riXhYZPB7hCF';

    it('carries the derived per-origin key and scope, never the root key', async () => {
      const exported = await ProfileTransfer.buildExportedProfile(DID, ORIGIN);

      expect(exported.scope).toBe(ORIGIN);
      expect(exported.did).toBe(SCOPED_DID);
      expect(exported.privateKey).not.toBe(PRIVATE_KEY);
      expect(deriveKeysFromPrivateKey(exported.privateKey).did).toBe(SCOPED_DID);
      expect(deriveKeysFromPrivateKey(exported.privateKey).publicKeyBase64).toBe(exported.publicKey);
    });

    it('is refused by import validation, pointing at the full export', async () => {
      const exported = await ProfileTransfer.buildExportedProfile(DID, ORIGIN);
      const result = ProfileTransfer.validateExportedProfile(exported);

      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain(ORIGIN);
      expect(result.errors.join(' ')).toContain('full profile export');
    });
  });
});

describe('round trip', () => {
  it('export -> wipe -> import preserves the DID and the key', async () => {
    mockGetProfileByDID.mockResolvedValue({
      did: DID,
      name: 'Alice Anderson',
      avatar: AVATAR,
      socialLinks: [{ platform: SocialPlatform.INSTAGRAM, handle: 'alice' }],
    });
    jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(PRIVATE_KEY);
    const saveKey = jest.spyOn(SecureStorage, 'saveDIDPrivateKey').mockResolvedValue();

    const json = ProfileTransfer.serializeExportedProfile(
      await ProfileTransfer.buildExportedProfile(DID)
    );

    // The device is wiped: no profile, no key.
    mockGetProfileByDID.mockResolvedValue(null);
    jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(null);

    const parsed = ProfileTransfer.parseExportedProfile(json);
    expect(parsed.valid).toBe(true);

    const result = await ProfileTransfer.importProfile(parsed.profile!);

    expect(result).toEqual({ did: DID, mode: 'created' });
    expect(saveKey).toHaveBeenCalledWith(DID, PRIVATE_KEY);
    expect(mockCreateProfile).toHaveBeenCalledWith(
      DID,
      'Alice Anderson',
      [{ platform: SocialPlatform.INSTAGRAM, handle: 'alice' }],
      AVATAR
    );
    expect(mockSetCurrentDid).toHaveBeenCalledWith(DID);
  });
});

describe('importProfile', () => {
  beforeEach(() => {
    jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(null);
    jest.spyOn(SecureStorage, 'saveDIDPrivateKey').mockResolvedValue();
    jest.spyOn(SecureStorage, 'deleteDIDPrivateKey').mockResolvedValue();
  });

  it('refuses a DID already on the device unless told to replace it', async () => {
    mockGetProfileByDID.mockResolvedValue({ did: DID, name: 'Existing' });

    await expect(ProfileTransfer.importProfile(validFile())).rejects.toMatchObject({
      code: 'PROFILE_EXISTS',
    });
    expect(SecureStorage.saveDIDPrivateKey).not.toHaveBeenCalled();
    expect(mockCreateProfile).not.toHaveBeenCalled();
  });

  it('updates in place when replacing', async () => {
    mockGetProfileByDID.mockResolvedValue({ did: DID, name: 'Existing' });

    const result = await ProfileTransfer.importProfile(validFile(), { replaceExisting: true });

    expect(result).toEqual({ did: DID, mode: 'replaced' });
    expect(mockUpdateProfile).toHaveBeenCalled();
    expect(mockCreateProfile).not.toHaveBeenCalled();
  });

  it('reports the conflict through getImportPreview', async () => {
    mockGetProfileByDID.mockResolvedValue({ did: DID, name: 'Existing' });

    const preview = await ProfileTransfer.getImportPreview(validFile());
    expect(preview.existingName).toBe('Existing');
  });

  it('rolls the key back when the database write fails on a fresh import', async () => {
    mockCreateProfile.mockRejectedValue(new Error('disk full'));

    await expect(ProfileTransfer.importProfile(validFile())).rejects.toMatchObject({
      code: 'DB_FAILED',
    });
    // No key was there before, so the orphan we just wrote must be removed.
    expect(SecureStorage.deleteDIDPrivateKey).toHaveBeenCalledWith(DID);
  });

  it('restores the previous key when the database write fails on a replace', async () => {
    const existingKey = base64.fromByteArray(
      ed25519.generateKeyPairFromSeed(new Uint8Array(32).fill(4)).secretKey
    );
    mockGetProfileByDID.mockResolvedValue({ did: DID, name: 'Existing' });
    jest.spyOn(SecureStorage, 'getDIDPrivateKey').mockResolvedValue(existingKey);
    mockUpdateProfile.mockRejectedValue(new Error('disk full'));

    await expect(
      ProfileTransfer.importProfile(validFile(), { replaceExisting: true })
    ).rejects.toMatchObject({ code: 'DB_FAILED' });

    // Blind-deleting here would have destroyed the key of the profile we were replacing.
    expect(SecureStorage.deleteDIDPrivateKey).not.toHaveBeenCalled();
    expect(SecureStorage.saveDIDPrivateKey).toHaveBeenLastCalledWith(DID, existingKey);
  });

  it('still imports if selecting the profile afterwards fails', async () => {
    mockSetCurrentDid.mockRejectedValue(new Error('nope'));
    await expect(ProfileTransfer.importProfile(validFile())).resolves.toMatchObject({
      mode: 'created',
    });
  });
});

describe('getDefaultExportFileName', () => {
  it('builds a filename with no colons in it', () => {
    const name = ProfileTransfer.getDefaultExportFileName(DID);
    expect(name).toBe('local-first-auth-profile-z6MkvDqGT54c.json');
    expect(name).not.toContain(':');
  });

  it('includes the origin host when scoped', () => {
    const name = ProfileTransfer.getDefaultExportFileName(DID, 'https://example.com');
    expect(name).toBe('local-first-auth-profile-example.com-z6MkvDqGT54c.json');
  });
});
