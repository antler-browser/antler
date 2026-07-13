/**
 * The native I/O half of profile import/export: files, the share sheet, the document
 * picker, the clipboard.
 *
 * Kept apart from `profile-transfer.ts` so the format and validation logic stays free of
 * native modules and can be unit tested directly.
 *
 * SECURITY: every string that moves through here contains a plaintext private key. The
 * files are written to the cache directory — which is excluded from iCloud backup on iOS
 * and from Android Auto Backup — and deleted as soon as they've been handed off. Nothing
 * here is ever logged.
 */

import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const EXPORT_FILE_PREFIX = 'local-first-auth-profile-';

// A real export is a few hundred KB at most (the avatar dominates). Anything far larger
// isn't a profile, and we'd rather not read it into memory to find that out.
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Writes the profile to a temporary file and hands it to the OS share sheet, then deletes
 * it — whether the share succeeded, failed, or was cancelled.
 */
export async function shareExportedProfile(json: string, fileName: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }

  const file = new File(Paths.cache, fileName);

  try {
    if (file.exists) file.delete();
    file.create();
    file.write(json);

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Export profile',
    });
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // sweepStaleExports() will get it at next launch.
    }
  }
}

export async function copyExportedProfile(json: string): Promise<void> {
  await Clipboard.setStringAsync(json);
}

/**
 * Opens the document picker and returns the file's text, or null if the user cancelled.
 *
 * `copyToCacheDirectory` means the picker drops its own copy of the file — a second
 * plaintext private key on disk — so we delete it as soon as we've read it.
 */
export async function pickProfileFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Deliberately broad: Android file providers routinely fail to expose .json under
    // application/json, which would grey the file out in the picker. The content is
    // validated either way, so the filter is only a convenience.
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  const asset = result.assets?.[0];
  if (result.canceled || !asset) {
    return null;
  }

  // The picker has already copied the file into the cache by now, so the size check lives
  // inside the try — the copy has to be deleted even when we refuse to read it. Some
  // Android providers don't report a size, so fall back to the local copy's.
  const file = new File(asset.uri);
  try {
    const size = typeof asset.size === 'number' ? asset.size : file.size;
    if (typeof size === 'number' && size > MAX_IMPORT_FILE_BYTES) {
      throw new Error("That file is too large to be a profile.");
    }
    return await file.text();
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // sweepStaleExports() clears the picker directory at next launch.
    }
  }
}

/**
 * Deletes any export file a previous run left behind — if the app was killed mid-share,
 * a plaintext private key is still sitting in the cache. Call this on startup.
 */
export function sweepStaleExports(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && entry.name.startsWith(EXPORT_FILE_PREFIX)) {
        entry.delete();
      }
    }

    // The document picker keeps its copies under DocumentPicker/, out of reach of the
    // prefix match above. It's only used for profile import, so clear the whole thing.
    const pickerDir = new Directory(Paths.cache, 'DocumentPicker');
    if (pickerDir.exists) pickerDir.delete();
  } catch {
    // Non-fatal; the OS clears the cache directory under pressure anyway.
  }
}
