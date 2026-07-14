/**
 * Import and export of Local First Auth profiles.
 *
 * Implements the portable profile format defined by the `local-first-auth-import-export`
 * npm package, so a profile can move between Antler and any mini app built on
 * `local-first-auth`. That package is browser-only (localStorage, `<a download>`), so we
 * reimplement the format rather than depend on it — the crypto is already identical.
 *
 * The private key is always the source of truth: the DID and public key are re-derived
 * from it and checked against the file, never trusted from it. Importing recovers an
 * existing identity; it never mints a new one.
 *
 * SECURITY: an exported profile contains a plaintext private key. Anyone holding it can
 * act as the user. Never log it, never send it anywhere, never leave it on disk.
 */

import * as base64 from 'base64-js';
import * as DID from './did';
import * as SecureStorage from './secure-storage';
import * as SocialLinks from './social-links';
import { AppStateFns, SocialLink, UserProfileFns } from './db/models';

/** Magic string identifying an export file. */
export const EXPORT_FILE_TYPE = 'local-first-auth:export';

/** Schema version of the export file. */
export const EXPORT_FILE_VERSION = 1;

/** Name used when a file carries no name, matching the reference implementation. */
const DEFAULT_PROFILE_NAME = 'anonymous';

const MAX_NAME_LENGTH = 100;
const MAX_SOCIAL_LINKS = 50;

// An avatar is rendered straight into <Image source={{ uri }} />. Restricting it to an
// inline data: image keeps a crafted file from pointing it at a remote URL, which would
// silently beacon out to that server on every render.
const AVATAR_DATA_URI_PATTERN = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_AVATAR_LENGTH = 2 * 1024 * 1024;

/** A social link as it appears in an export file, where the platform is UPPERCASE. */
export interface ExportedSocialLink {
  platform: string;
  handle: string;
}

/**
 * The exact shape of an exported `.json` file.
 *
 * Self-identifying (`type` + `version`) and internally consistent: `did` and `publicKey`
 * are re-derivable from `privateKey`.
 */
export interface ExportedProfile {
  type: typeof EXPORT_FILE_TYPE;
  version: typeof EXPORT_FILE_VERSION;
  /**
   * Present on an origin-scoped export: the WHATWG origin this identity is for. The file
   * then carries the per-origin derived key, not the root key, and is meant to be handed
   * to that mini app — Antler refuses to import it as a profile.
   */
  scope?: string;
  did: string;
  /** base64, 32-byte Ed25519 public key. */
  publicKey: string;
  /** base64, 64-byte Ed25519 secret key. Secret. */
  privateKey: string;
  name?: string;
  socials?: ExportedSocialLink[];
  /** data: URI. */
  avatar?: string | null;
  exportedAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  profile?: ExportedProfile;
}

/** What an import would write, once sanitized. */
export interface ProfileFields {
  did: string;
  name: string;
  socialLinks: SocialLink[];
  avatar: string | null;
  /** Links dropped because we don't recognise their platform. */
  skippedSocials: number;
}

export interface ImportPreview extends ProfileFields {
  /** A profile with this DID is already on the device. */
  existingName: string | null;
}

export interface ImportOptions {
  /** Overwrite a profile that already exists with this DID. Default false. */
  replaceExisting?: boolean;
  /** Select the imported profile after importing. Default true. */
  setAsCurrent?: boolean;
}

export interface ImportResult {
  did: string;
  mode: 'created' | 'replaced';
}

export type ProfileTransferErrorCode =
  | 'PROFILE_NOT_FOUND'
  | 'PRIVATE_KEY_NOT_FOUND'
  | 'KEY_MISMATCH'
  | 'PROFILE_EXISTS'
  | 'STORAGE_FAILED'
  | 'DB_FAILED';

export class ProfileTransferError extends Error {
  constructor(public readonly code: ProfileTransferErrorCode, message: string) {
    super(message);
    this.name = 'ProfileTransferError';
  }
}

/**
 * Validates an untrusted value against the export format. Never throws — inspect
 * `valid` and `errors`.
 *
 * Order matters. The private key is checked before anything derived from it, and a bad
 * key short-circuits: nothing below it would be meaningful.
 */
export function validateExportedProfile(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, errors: ['This is not a Local First Auth profile.'] };
  }

  const data = input as Record<string, unknown>;
  const errors: string[] = [];

  if (data.type !== EXPORT_FILE_TYPE) {
    errors.push('This is not a Local First Auth profile export.');
  }

  if (data.version !== EXPORT_FILE_VERSION) {
    errors.push(
      `This profile was exported by a newer app and can't be read (version ${JSON.stringify(data.version)}).`
    );
  }

  // A scoped file carries a per-origin derived key. Importing it as a root profile would
  // derive per-origin keys from an already-derived key — a broken identity everywhere.
  if (data.scope !== undefined) {
    const origin =
      typeof data.scope === 'string' && data.scope.length <= 100 ? data.scope : 'a single mini app';
    errors.push(
      `This export is scoped to ${origin}. To move this profile to another device, use a full profile export.`
    );
    return { valid: false, errors };
  }

  if (!DID.isValidPrivateKey(data.privateKey)) {
    errors.push('The private key in this profile is missing or malformed.');
    return { valid: false, errors };
  }

  const derived = DID.deriveKeysFromPrivateKey(data.privateKey as string);

  if (data.did !== derived.did) {
    errors.push("This profile has been altered: its DID doesn't match its private key.");
  }

  if (data.publicKey !== derived.publicKeyBase64) {
    errors.push("This profile has been altered: its public key doesn't match its private key.");
  }

  if (data.name !== undefined && typeof data.name !== 'string') {
    errors.push('The name in this profile is malformed.');
  }

  if (data.socials !== undefined) {
    const wellFormed =
      Array.isArray(data.socials) &&
      data.socials.every(
        (link) =>
          typeof link === 'object' &&
          link !== null &&
          typeof (link as ExportedSocialLink).platform === 'string' &&
          typeof (link as ExportedSocialLink).handle === 'string'
      );
    if (!wellFormed) {
      errors.push('The social links in this profile are malformed.');
    }
  }

  if (data.avatar !== undefined && data.avatar !== null && typeof data.avatar !== 'string') {
    errors.push('The avatar in this profile is malformed.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], profile: input as ExportedProfile };
}

/**
 * Cheap structural check for an export envelope — no crypto, no database. Safe to run on
 * every scanned QR code. True means "worth handing to parseExportedProfile", not "valid".
 *
 * Unlike parseExportedProfile this rejects a bare private key. A QR code carries no
 * filename and no user intent, so any unrelated base64 that happened to decode to 64
 * bytes would pull the user into the import screen. The envelope says what it is.
 */
export function isExportPayload(raw: string): boolean {
  const trimmed = (raw ?? '').replace(/^﻿/, '').trim();
  return trimmed.startsWith('{') && trimmed.includes(`"${EXPORT_FILE_TYPE}"`);
}

/**
 * Turns raw text into a validated profile.
 *
 * Accepts a full export file, or a bare base64 private key — the key alone is a complete
 * identity, so the envelope around it can be synthesized.
 */
export function parseExportedProfile(raw: string): ValidationResult {
  // Files round-tripped through Files/Drive routinely pick up a BOM.
  const trimmed = (raw ?? '').replace(/^﻿/, '').trim();

  if (!trimmed) {
    return { valid: false, errors: ['This file is empty.'] };
  }

  if (!trimmed.startsWith('{')) {
    const key = trimmed.replace(/\s+/g, '');
    if (!DID.isValidPrivateKey(key)) {
      return { valid: false, errors: ['This is not a Local First Auth profile or private key.'] };
    }

    const derived = DID.deriveKeysFromPrivateKey(key);
    return validateExportedProfile({
      type: EXPORT_FILE_TYPE,
      version: EXPORT_FILE_VERSION,
      did: derived.did,
      publicKey: derived.publicKeyBase64,
      privateKey: key,
      name: DEFAULT_PROFILE_NAME,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { valid: false, errors: ["This file isn't valid JSON."] };
  }

  return validateExportedProfile(parsed);
}

/** `local-first-auth-profile-z6MkhaXgBZ.json`, or with the origin's host when scoped. */
export function getDefaultExportFileName(did: string, origin?: string): string {
  const slug = did.replace(/^did:key:/, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  const host = origin ? `${new URL(origin).hostname}-` : '';
  return `local-first-auth-profile-${host}${slug}.json`;
}

/**
 * Builds the exportable representation of a profile already on this device.
 *
 * The DID and public key come from the stored private key, not from the database, so the
 * file is internally consistent by construction.
 *
 * With `origin`, builds an origin-scoped export instead: the file carries the per-origin
 * derived key (the identity that mini app already knows) and a `scope` field, and never
 * exposes the root key.
 */
export async function buildExportedProfile(did: string, origin?: string): Promise<ExportedProfile> {
  const profile = await UserProfileFns.getProfileByDID(did);
  if (!profile) {
    throw new ProfileTransferError('PROFILE_NOT_FOUND', "That profile isn't on this device.");
  }

  const privateKey = await SecureStorage.getDIDPrivateKey(did);
  if (!privateKey) {
    throw new ProfileTransferError(
      'PRIVATE_KEY_NOT_FOUND',
      "This profile's private key is missing from this device, so it can't be exported."
    );
  }

  const rootDerived = DID.deriveKeysFromPrivateKey(privateKey);
  if (rootDerived.did !== did) {
    throw new ProfileTransferError(
      'KEY_MISMATCH',
      "The stored key doesn't match this profile, so it can't be exported."
    );
  }

  const derived = origin ? DID.deriveOriginKeys(privateKey, origin) : rootDerived;

  return {
    type: EXPORT_FILE_TYPE,
    version: EXPORT_FILE_VERSION,
    ...(origin ? { scope: origin } : {}),
    did: derived.did,
    publicKey: derived.publicKeyBase64,
    privateKey: origin ? base64.fromByteArray(derived.secretKeyBytes) : privateKey,
    name: profile.name,
    socials: (profile.socialLinks ?? []).map((link) => ({
      platform: SocialLinks.toExportPlatform(link.platform),
      handle: link.handle,
    })),
    avatar: profile.avatar ?? null,
    exportedAt: new Date().toISOString(),
  };
}

export function serializeExportedProfile(profile: ExportedProfile): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Reduces an export file to the fields we will actually write.
 *
 * Everything here is attacker-controlled — the name and handles land in the UI and in the
 * JWTs we hand to mini apps — so it is all sanitized, bounded, and whitelisted.
 */
export function toProfileFields(profile: ExportedProfile): ProfileFields {
  const derived = DID.deriveKeysFromPrivateKey(profile.privateKey);

  const name =
    (SocialLinks.sanitizeInput(profile.name ?? '') ?? '').slice(0, MAX_NAME_LENGTH).trim() ||
    DEFAULT_PROFILE_NAME;

  const socialLinks: SocialLink[] = [];
  let skippedSocials = 0;

  for (const link of (profile.socials ?? []).slice(0, MAX_SOCIAL_LINKS)) {
    const platform = SocialLinks.fromExportPlatform(link.platform);
    const handle = platform ? SocialLinks.normalizeHandle(platform, link.handle) : null;

    if (platform && handle) {
      socialLinks.push({ platform, handle });
    } else {
      skippedSocials += 1;
    }
  }
  skippedSocials += Math.max(0, (profile.socials?.length ?? 0) - MAX_SOCIAL_LINKS);

  const avatar =
    typeof profile.avatar === 'string' &&
    profile.avatar.length <= MAX_AVATAR_LENGTH &&
    AVATAR_DATA_URI_PATTERN.test(profile.avatar)
      ? profile.avatar
      : null;

  return { did: derived.did, name, socialLinks, avatar, skippedSocials };
}

/**
 * What importing this profile would do, so the UI can confirm before writing anything.
 */
export async function getImportPreview(profile: ExportedProfile): Promise<ImportPreview> {
  const fields = toProfileFields(profile);
  const existing = await UserProfileFns.getProfileByDID(fields.did);

  return { ...fields, existingName: existing?.name ?? null };
}

/**
 * Adopts the identity in an export file.
 *
 * The private key and the database are separate stores and cannot be written atomically,
 * so we choose which half-write we'd rather survive. The key goes first: a key with no
 * profile row is unreachable and harmless, and a retry overwrites it with the same bytes.
 * A profile row with no key is worse — it shows up in the carousel and then fails to sign
 * a JWT the moment the user opens a mini app with it.
 */
export async function importProfile(
  profile: ExportedProfile,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const { replaceExisting = false, setAsCurrent = true } = options;
  const { did, name, socialLinks, avatar } = toProfileFields(profile);

  const existing = await UserProfileFns.getProfileByDID(did);
  if (existing && !replaceExisting) {
    throw new ProfileTransferError(
      'PROFILE_EXISTS',
      'This profile is already on this device.'
    );
  }

  // Snapshot the key so a failed import can put back exactly what was there. Blind-deleting
  // on failure would destroy the key of the profile we were replacing.
  let previousKey: string | null = null;
  try {
    previousKey = await SecureStorage.getDIDPrivateKey(did);
  } catch {
    previousKey = null;
  }

  try {
    await SecureStorage.saveDIDPrivateKey(did, profile.privateKey);
  } catch {
    throw new ProfileTransferError(
      'STORAGE_FAILED',
      "Couldn't save this profile's key to secure storage."
    );
  }

  try {
    if (existing) {
      await UserProfileFns.updateProfileByDID(did, { name, socialLinks, avatar });
    } else {
      await UserProfileFns.createProfileByDid(did, name, socialLinks, avatar);
    }
  } catch {
    try {
      if (previousKey !== null) {
        await SecureStorage.saveDIDPrivateKey(did, previousKey);
      } else {
        await SecureStorage.deleteDIDPrivateKey(did);
      }
    } catch {
      // Best effort. An orphaned key is harmless, and reporting it would mask the real error.
    }
    throw new ProfileTransferError('DB_FAILED', "Couldn't save the imported profile.");
  }

  if (setAsCurrent) {
    try {
      await AppStateFns.setCurrentDid(did);
    } catch {
      // The profile is imported; which one is selected is cosmetic and recoverable.
    }
  }

  return { did, mode: existing ? 'replaced' : 'created' };
}
