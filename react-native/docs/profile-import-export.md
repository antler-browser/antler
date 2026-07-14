# Profile Import / Export

A user's Antler identity is an Ed25519 keypair whose private key never leaves the device. Import/export makes that identity **portable**: a profile can be moved to a new device, backed up, or carried between Antler and any mini app built on [`local-first-auth`](https://www.npmjs.com/package/local-first-auth).

The **DID is preserved**. Importing recovers an existing identity — it never mints a new keypair.

Per-origin DIDs — the identities mini apps actually see — are derived deterministically from the root private key (see the Per-Origin Key Derivation section of the spec), so importing a profile onto a new device reproduces the user's identity on every mini app they have used. Nothing per-site is exported because nothing per-site is stored.

## Interoperability

The file format is defined by the [`local-first-auth-import-export`](https://www.npmjs.com/package/local-first-auth-import-export) npm package. That package is browser-only (it depends on `localStorage`, `window`, `<a download>`), so Antler does not depend on it — `lib/profile-transfer.ts` reimplements the same format natively.

This is safe because the crypto is already identical: both use `@stablelib/ed25519`, and both derive `did:key` as `base58btc(0xed 0x01 ‖ publicKey)`. A file exported from Antler validates in the package, and a file exported from the package imports into Antler, in both directions, with the same DID.

## The file format (v1)

```json
{
  "type": "local-first-auth:export",
  "version": 1,
  "did": "did:key:z6MkvDqGT54cXesYGvABpF1UapVNwjCqRcafi4Px6Thv5T3Z",
  "publicKey": "6kpsY+KcUgq+9VB7Ey7F+ZVHdq6+vnuSQh7qaRRG0iw=",
  "privateKey": "BwcHBwcH...FEbSLA==",
  "name": "Alice Anderson",
  "socials": [{ "platform": "INSTAGRAM", "handle": "alice" }],
  "avatar": "data:image/jpeg;base64,...",
  "exportedAt": "2026-07-12T20:45:22.701Z"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `type` | yes | Always `local-first-auth:export`. |
| `version` | yes | Currently `1`. |
| `did` | yes | `did:key:z...` |
| `publicKey` | yes | **Standard base64**, 32 bytes. Not base64url, not base58. |
| `privateKey` | yes | **Standard base64**, 64 bytes. Plaintext secret. |
| `name` | no | Defaults to `anonymous` when absent. |
| `socials` | no | `platform` is **UPPERCASE** here (`INSTAGRAM`), lowercase in our `SocialPlatform` enum. |
| `avatar` | no | `data:` URI, or null. |
| `exportedAt` | no | ISO 8601. |

Three details are easy to get wrong:

1. `DID.generateDID()` returns its `publicKey` as **base58**; the file wants **base64**. They are the same 32 bytes in different clothes. Use `deriveKeysFromPrivateKey().publicKeyBase64`.
2. Social platforms are uppercase in the file and lowercase in the database. `SocialLinks.toExportPlatform` / `fromExportPlatform` handle the mapping, and are built from the enum so they cannot drift from it.
3. **The private key is the source of truth.** On import the DID and public key are re-derived from it and compared against the file. A mismatch means the file was corrupted or tampered with, and it is rejected.

## Validation

`validateExportedProfile()` never throws; it returns `{ valid, errors[], profile? }`. Checks run in order, and a bad private key short-circuits — nothing downstream of it is meaningful:

1. parses as a JSON object
2. `type` is the magic string
3. `version` is supported
4. `privateKey` is base64 decoding to exactly 64 bytes
5. `did` and `publicKey` re-derive from `privateKey` and match
6. `name` / `socials` / `avatar` are well-typed

`parseExportedProfile()` also accepts a **bare base64 private key** with no envelope — the key alone is a complete identity, so the envelope is synthesized and the name defaults to `anonymous`.

## Origin-scoped exports

Next to the full export, Antler can export the key for **one mini app**: the same v1 envelope with an extra `"scope": "<origin>"` field, carrying the per-origin *derived* key instead of the root key (`did`/`publicKey`/`privateKey` are all the derived values, so the file is still internally consistent). Handing a website its scoped file gives it exactly the identity it already knows the user by — and nothing else; the root key cannot be recovered from a derived key.

Semantics of `scope`:

- **With `scope`** — an origin-scoped identity. The holder must use it only for that origin and sign with the key directly. The browser-side `local-first-auth-import-export` package ignores unknown fields and signs with the stored key as-is, which is exactly right for that origin, so the handoff works without a package update.
- **Without `scope`** — a root identity, from which per-origin keys must be derived. (Web-context implementations holding a root export should derive for their own origin; that npm-package change is out of scope for this repo.)

Antler itself **refuses to import** a scoped file: importing a site key as a root profile would derive per-origin keys from an already-derived key — a broken identity everywhere. `validateExportedProfile()` rejects it with a message pointing at the full export. Scoped files are for handing out only.

## Transfer by QR code

The three ways in are a file, pasted text, and a **scanned QR code**. Show the export JSON as a QR on one device, scan it with another, and the camera hands the raw text to the import screen, which opens straight on the preview.

`isExportPayload()` is the gate. It runs on every scanned code, so it stays structural — trim, `{`, and the magic string — and leaves the crypto to `parseExportedProfile()`. Two consequences worth knowing:

- **The camera accepts the envelope only, not a bare private key**, even though `parseExportedProfile()` would take one. A QR code carries no filename and no user intent, so an unrelated base64 code that happened to decode to 64 bytes would drag the user into the import screen uninvited. Paste and the file picker still take a bare key.
- **A profile with an avatar will not fit in a QR code.** An avatar is a `data:` URI up to 2 MB against a QR ceiling of ~3 KB, so profiles transferred this way are realistically avatar-less. Nothing enforces this; QR encoders simply fail. File and clipboard transfer carry the avatar fine.

Real validation is still `parseExportedProfile()` — the same function the file picker and the paste box use. There is one parser and one preview, whatever the payload came in on. A scanned profile also does **not** route through profile creation first the way a scanned mini-app URL does: `importProfile()` creates the profile and selects it, and importing is precisely how a device with no identity gets one.

Handling the key on the way in:

- The camera's repeat-scan debounce briefly holds the raw payload as its comparison key (`lastScannedData`), and clears it after the scan interval. Memory-only and short-lived; it is never persisted or logged.
- The screen reads the route param once and immediately calls `setParams({ payload: undefined })`. React Navigation strips the `screen`/`params` it stashes on the *parent* `ModalStack` route as soon as the nested navigator commits, so clearing the child route is enough — there is no need to reach for `getParent()`. Navigation state is memory-only; the app persists none.
- Nothing on this path is logged. A `console.log` of a scanned payload would put a private key into Metro's output and into `lib/remote-debug.ts`'s stream.

## Multiple profiles

Antler holds many profiles; the browser package holds exactly one. So:

- **New DID** → appended as a new profile (`position = max + 1`) and selected as current.
- **DID already on the device** → the UI prompts to replace or cancel. Replacing overwrites the name, avatar and social links from the file, and keeps the device's `position` and scan history. The key and DID are identical either way, so re-importing the same profile is idempotent.
- No field-level merge. The file is the authority on profile content; the device is the authority on ordering and history.

Exporting from Antler into a mini app makes that profile the browser's **only** identity — the package stores a single profile at `local-first-auth:profile`.

A useful side effect of the replace path: if a device restored its database but not its keychain, the profile exists but cannot sign JWTs. Importing its export file repairs the key in place.

## Security

**The exported file contains the private key in plain text.** Anyone holding it can permanently act as the user. This matches v1 of the spec — encrypting it would break interoperability with mini apps, which have no way to decrypt it.

The code is built around that fact:

- The app shows a destructive-style warning before every export and every clipboard copy.
- Export files are written to the **cache directory**, which is excluded from iCloud backup on iOS and Android Auto Backup — writing to Documents would silently sync a plaintext key to the cloud.
- The temp file is deleted in a `finally` after the share sheet closes, the document picker's `copyToCacheDirectory` copy is deleted after it is read, and `sweepStaleExports()` runs at startup to clear anything a crash left behind.
- Nothing in this path is ever logged. Error messages never echo key material.
- An imported file is treated as hostile input: names and handles are sanitized, sizes and list lengths are bounded, unknown platforms are dropped rather than stored, and the avatar is whitelisted to an inline `data:image/...` URI so a crafted file cannot point it at a remote URL and beacon on every render.

## Where the code lives

| File | Role |
| --- | --- |
| `lib/profile-transfer.ts` | Format, validation, parsing, build-from-DB, import-to-DB. Pure enough to unit test. |
| `lib/profile-transfer-io.ts` | Native I/O only: cache file, share sheet, document picker, clipboard, startup sweep. |
| `lib/did.ts` | `deriveKeysFromPrivateKey()` / `isValidPrivateKey()` — the single home of the DID encoding. |
| `app/screens/profile/ExportProfileScreen.tsx` | Pick a profile → warn → share or copy. |
| `app/screens/profile/ImportProfileScreen.tsx` | Choose a file, paste, or receive a scanned payload → validate → preview → confirm. |
| `lib/camera.ts` | `handleScannedData()` classifies a scanned code as `profile` when `isExportPayload()` matches. |
| `app/components/camera/CameraView.tsx` | Routes a `profile` scan to the import screen, passing the raw text as a route param. |
| `__tests__/lib/profile-transfer.test.ts` | Round-trip, tamper rejection, bare key, platform mapping, rollback. |

The DID literal in the test is derived from a fixed seed and asserted as a constant. It is the contract with every other Local First Auth implementation: if a refactor breaks the multicodec prefix or the base58 encoding, that test fails loudly instead of quietly producing files no mini app can read.

## The import transaction

The private key (Keychain / AsyncStorage) and the profile row (SQLite) are separate stores and cannot be written atomically, so `importProfile()` chooses which half-write to survive:

1. Snapshot the existing key, if any.
2. Write the **key first**. A key with no profile row is unreachable and harmless, and a retry overwrites it with the same bytes. A profile row with no key is worse — it appears in the carousel and then fails to sign a JWT the moment a mini app opens.
3. Write the profile row and social links (`createProfileByDid` / `updateProfileByDID` are each already a single DB transaction).
4. If the DB write fails, put the key back exactly as it was — restore the snapshot, or delete it if there wasn't one. Blind-deleting would destroy the key of the profile being replaced.
