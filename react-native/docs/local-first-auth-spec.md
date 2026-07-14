# Local First Auth Specification

The Local First Auth Spec makes it easy to add auth to your website or mini app — no servers, no passwords, no third-party auth providers.

A practical use case: You can pass in your identity when you scan a QR code. If you pass in your identity, the website never asks you to log in or sign up, so you can start using it right away as a logged in user.

This is highly inspired by how WeChat works in China. WeChat is a super app. When a user opens it up and scans a QR code, it passes in their WeChat identity so they can interact with the website instantly — no login, no signup. This might sound like a minor UX improvement, but the real innovation is that users in China don't have to download an app for everything — they just scan a QR code and get most of the practical benefits of a native app. **The idea behind this spec is simple: Can we deliver the same great UX as WeChat using an open standard instead of a super app?**

## Developer Benefits

- **Local-First Authentication** – New users type in a name (and optionally add an avatar). A profile, including a public key and private key is created. A signed JWT is generated on the user's device to authenticate requests to your website or mini app.
- **Skip complex sign-up flow** – no user management, no email verification, no password resets

## Lifecycle

```
1.  User scans QR code using a Local First Auth app.
 2.  App loads URL in WebView
 3.  App injects window.localFirstAuth JavaScript object
 4.  Mini app calls window.localFirstAuth.getProfileDetails() when ready
 5.  App generates and signs JWT with profile details
 6.  Mini app verifies JWT & has access to profile details

 // Manifest & permissions
 7.  App parses HTML for <link rel="local-first-auth-manifest"> tag
 8.  App fetches manifest in background

 // If you require additional permissions at a later time
 9.  Mini app calls window.localFirstAuth.requestPermission('location')
 10. App validates permission is declared in manifest
 11. If declared → App shows user consent prompt
 12. If NOT declared → request is rejected (security)
 13. If user approves → App sends location data via postMessage
```

## Decentralized Identifiers

When a user creates a profile a DID ([Decentralized Identifier](https://www.w3.org/TR/did-1.0/) - a W3C standard) is generated along with additional details (like name, avatar, and links to socials).

A DID is a text string that is used to identify a user. Here's an example:

![did-explain.png](https://ax0.taddy.org/antler/did-explain.png)

Local First Auth uses the `did:key` method, where the public key is the last part of the DID.

When you create a profile, your DID (which includes a public key) and a corresponding private key are generated and stored on your device. Whenever data is sent to a web app, the payload is signed using the DID's private key, ensuring that only the user who created the profile could have sent that data.

## JavaScript API

The `window.localFirstAuth` object is the primary interface for interacting with Local First Auth. It is available via both client-side libraries and native apps.

1. **`window.localFirstAuth`:** Use when your app wants to request data or initiate actions (e.g., get profile details or request permissions)
2. **`window.postMessage`:** Used primarily by native apps to notify your app of events (e.g., user closed the WebView)

### The `window.localFirstAuth` Object

When your mini app loads inside a Local First Auth app, a global `window.localFirstAuth` object is injected. This allows you to 1) call methods and get back data and 2) check that the user is using a Local First Auth app.

```tsx
interface LocalFirstAuth {
  // Get profile details (name, socials)
  getProfileDetails(): Promise<string>;

  // Get avatar as base64-encoded string
  getAvatar(): Promise<string | null>;

  // Get details about the Local First Auth host app
  getAppDetails(): AppDetails;

  // Request additional permissions (in the future)
  requestPermission(permission: string): Promise<boolean>;

  // Close the WebView (return to QR scanner)
  close(): void;
}
```

#### Getting profile details

`getProfileDetails()` returns the user's profile details as a signed JWT.

```tsx
{
  "did": "did:key:123456789abcdefghi",
  "name": "Danny Mathews",
  "socials": [
    { "platform": "INSTAGRAM", "handle": "dmathewwws" }
  ]
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `did` | string | Yes | User's Decentralized Identifier (DID) |
| `name` | string | Yes | User's display name |
| `socials`  | array | No | Links to social accounts |

For security reasons, always reconstruct social links client-side rather than trusting URLs. Check out [this code](https://github.com/antler-browser/meetup-cloudflare/blob/main/shared/src/social-links.ts#L353).

#### Getting a user's avatar

`getAvatar()` returns the user's base64-encoded avatar as a signed JWT. This image can be up to 1MB in size. If the user has no avatar, this will return null.

```tsx
{
  "did": "did:key:123456789abcdefghi",
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `did` | string | Yes | User's Decentralized Identifier (DID) |
| `avatar` | string | Yes | User's avatar as base64-encoded string |

#### Getting app details

`getAppDetails()` returns information about the Local First Auth app.

```tsx
{
  "name": "Antler",
  "version": "1.0.0",
  "platform": "ios",
  "supportedPermissions": ["profile"]
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | App name |
| `version` | string | Yes | App version |
| `platform` | string | Yes | `ios`, `android`, or `web` |
| `supportedPermissions` | array | Yes | The permissions that this app has implemented.  |

#### Checking for Local First Auth

Your app can detect whether Local First Auth is available.

```jsx
if (typeof window.localFirstAuth !== 'undefined') {
  // Local First Auth is available
  const info = window.localFirstAuth.getAppDetails();
  console.log(`Running in ${info.name} v${info.version} (${info.platform})`);
} else {
  // No Local First Auth available
  console.log('Local First Auth not detected');
}
```

### Use `window.postMessage` to receive data from Local First Auth app

A user may perform an action inside the Local First Auth app that you want to know about. The app sends event data to your app via `window.postMessage` using signed JWTs.

```jsx
window.addEventListener('message', async (event) => {
  try {
    if (!event.data?.jwt) { return }

    // verify JWT is valid
    const payload = await decodeAndVerifyJWT(event.data.jwt);

    // process message based on the type
    switch (payload.type) {
      case 'localFirstAuth:profile:disconnected':
        const { type, ...profile } = payload.data;
        console.log('User DID:', payload.iss);
        console.log('User Name:', profile.name);
        break;
      default:
        console.warn('Unknown message type:', payload.data.type);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});
```

Check out this [example code](https://github.com/antler-browser/meetup-cloudflare/blob/main/shared/src/jwt.ts#L23) if you want to add `decodeAndVerifyJWT` to your project.

#### Possible message types

| Type | Description | Required Permission |
| --- | --- | --- |
| `localFirstAuth:profile:disconnected` | User closed WebView | profile |
| `localFirstAuth:error` | Error data | — |

##### Profile Disconnected

`localFirstAuth:profile:disconnected` returns the same profile details mentioned above.

```json
{
  "did": "did:key:123456789abcdefghi",
  "name": "Danny Mathews",
  "socials": [
    { "platform": "INSTAGRAM", "handle": "dmathewwws" }
  ]
}
```

##### Error Handling

`localFirstAuth:error` returns errors from a Local First Auth app in the following format.

```json
{
  "code": "PERMISSION_NOT_DECLARED",
  "message": "Permission not in manifest"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | Yes | Unique error code |
| `message` | string | Yes | More details on the error code received |

## JWT Structure

All data passed from the Local First Auth app to a mini app is done via signed JWTs ([JSON Web Tokens](https://datatracker.ietf.org/doc/html/rfc7519)).

### JWT Header

It's useful to know what algorithm to use to decode the JWT. If you use a JWT library, this part is usually done behind the scenes for you.

```json
{
  "alg": "EdDSA",
  "typ": "JWT"
}
```

| Field | Description |
| --- | --- |
| `alg` | Algorithm used to sign the JWT. |
| `typ` | Type of the JWT. Always "JWT". |

### JWT Payload

Decoded data inside the JWT Payload.

```json
{
  "iss": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "aud": "https://yourdomain.com",
  "iat": 1728393600,
  "exp": 1728397200,
  "type": "localFirstAuth:profile:disconnected",
  "data":
    {
      "did": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "name": "Danny Mathews",
      "socials": [{ "platform": "INSTAGRAM", "handle": "dmathewwws" }]
    }
}
```

| Claim | Description |
| --- | --- |
| `iss` | Issuer - The user's per-origin DID for this mini app. Use this when verifying the JWT. It is stable for your origin and portable across the user's devices, but different on every other site. |
| `aud` | Intended Audience - The origin of the URL that launched the WebView (e.g. `https://yourdomain.com`). |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp (default is 2 minutes) |
| `type` | Local First Auth function or event type |
| `data` | Type-specific payload |

### Best Practices

1. **Decoding & verifying the JWT** - Never trust unverified data. Decode JWTs using the `alg`. Verify that the JWT has been signed by the user's public key (`iss` field).
2. **Validate audience -** Ensure the `aud` claim equals your origin. This is set by the Local First Auth app from the origin of the url that launched the WebView.
3. **Validate expiration** - Reject expired tokens. Check the `exp` field.
4. **`iss` is per-site** - Use `iss` as your durable per-user identifier for your site only. Do not expect it to match a DID seen by any other mini app — every origin sees a different DID for the same user.

## Making Authenticated Requests

When your mini app needs to make an authenticated request on behalf of a user, call `getProfileDetails()` to get a valid JWT for them. This can be used directly as a Bearer token to make authenticated requests, i.e., no need to build session tokens or additional auth infrastructure.

### Your Mini App (Client-Side)

```tsx
// Get profile JWT when you need to make an authenticated request
const jwt = await window.localFirstAuth.getProfileDetails();

// Use it as a Bearer token in your requests
const response = await fetch('https://yourdomain.com/api/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'},
    body: JSON.stringify({ content: 'Hello world' })
  }
);

if (response.ok) {
  console.log('Post created successfully');
}
```

### Your Backend

Your backend checks for a valid JWT before processing the rest of the request. The JWT contains the DID of the user making the request.

```tsx
app.post('/api/posts', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { content } = req.body;

    // Get User's JWT
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization header' });
    }

    const jwt = authHeader.slice(7).trim();

    if (!jwt) { return res.status(401).json({ error: 'No token provided' }); }

    // Decode and verify JWT signature using DID public key
    const payload = await decodeAndVerifyJWT(jwt);

    // Process authenticated request
    await db.posts.create({
      content,
      authorId: payload.iss  // User's DID from JWT
    });

    res.json({ success: true });

  } catch (error) {
    res.status(401).json({ error: 'Invalid JWT' });
  }
});
```

**Note**: You will most likely need a new JWT for each request as JWTs expire after 2 minutes.

See [code example](https://github.com/antler-browser/meetup-cloudflare/blob/main/shared/src/jwt.ts#L23) for `decodeAndVerifyJWT`. We decode & verify JWT signature including making sure the `aud` claim is for our mini app.

## Privacy: Per-Origin Key Derivation

When you create a profile on a Local First Auth app, your DID (which includes a public key) and a corresponding private key are generated and stored locally on your device. This is the profile's **root key**, and it never signs data shown to mini apps. Instead, each website gets its own DID, derived deterministically from the root key and the website's origin. The payload a mini app receives is signed with that per-origin key, ensuring it came from the DID owner — and because the derivation is deterministic, the same user always reappears as the same DID on the same site (including after moving devices via profile export/import), while different sites see unrelated DIDs and cannot correlate the user with each other.

Local First Auth apps MUST NOT sign mini-app payloads with the profile's root key. Instead, for each origin they MUST derive an Ed25519 keypair as:

```
originSeed = HKDF-SHA256(
  ikm  = rootSeed,                                 // first 32 bytes of the 64-byte Ed25519 secret key
  salt = UTF-8("local-first-auth:origin-key:v1"),
  info = UTF-8(origin),
  length = 32
)
```

where `rootSeed` is the 32-byte Ed25519 seed of the profile's root key, and `origin` is the [WHATWG origin](https://url.spec.whatwg.org/#origin) of the URL that launched the WebView, serialized as `scheme://host[:port]` (lowercase, default ports omitted, no trailing slash). `originSeed` is used as an Ed25519 seed and the resulting public key is encoded as a `did:key` exactly as the root DID is.

This construction is normative: two implementations holding the same root key MUST derive identical per-origin DIDs, so a user's identity on every site survives profile export/import between apps.

Because the origin is the boundary, subdomains, schemes, and ports each scope a **distinct** DID: `https://app.acme.com`, `https://www.acme.com`, and `https://acme.com` are three different identities. Mini apps should publish one canonical origin in their QR codes — moving origins (e.g. `www` to apex) means returning users reappear with new DIDs.

**Test vectors** — root private key (base64) `BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwfqSmxj4pxSCr71UHsTLsX5lUd2rr6+e5JCHuppFEbSLA==`, root DID `did:key:z6MkvDqGT54cXesYGvABpF1UapVNwjCqRcafi4Px6Thv5T3Z`:

| Origin | Per-origin DID |
| --- | --- |
| `https://example.com` | `did:key:z6MksHmq5juqxMRUt6UYxnbCfprSmsEcaLd9riXhYZPB7hCF` |
| `https://other.app` | `did:key:z6MkuPzxjqnHVeV3eupgRqjD9Me4EhAyKoohjU6PkkoBhLSt` |
| `http://localhost:8787` | `did:key:z6MkoShWB63jPRQAMhWJD3J2Gq5BizC65JnRetMj5uj7EepD` |

## Profile Export Format

A profile can be exported as a JSON file, either to move a whole identity to another device/app or to hand a single site's identity to that site. Both use the same v1 envelope; the optional `scope` field distinguishes them:

```json
{
  "type": "local-first-auth:export",
  "version": 1,
  "scope": "https://example.com",
  "did": "did:key:z6Mk...",
  "publicKey": "<base64 32-byte Ed25519 public key>",
  "privateKey": "<base64 64-byte Ed25519 secret key>",
  "name": "...",
  "socials": [],
  "avatar": "...",
  "exportedAt": "..."
}
```

- `did` and `publicKey` MUST re-derive from `privateKey` — a file that is not internally consistent MUST be rejected.
- **No `scope`** — the file is a **root identity** (a full profile export for moving devices). Holders MUST derive per-origin keys from it as defined above and MUST NOT sign mini-app payloads with it directly.
- **`scope` present** — the file is an **origin-scoped identity**: it carries the already-derived key for that one origin. The holder MUST use it only for that origin and sign with the key directly. Importing a scoped file as a full/root profile MUST be rejected — deriving per-origin keys from an already-derived key would create an identity unrelated to the user's.

An origin-scoped export lets a user hand a website the exact key that website already knows them by, without ever exposing the root key.

## Local First Auth Manifest

Every mini app has a manifest file. The purpose is to showcase basic details about the mini app and explicitly state which permissions your mini app needs.

### Discovery

Mini apps declare their manifest using a `<link>` tag in the HTML `<head>`.

```html
<link rel="local-first-auth-manifest" href="/local-first-auth-manifest.json">
```

### manifest.json Schema

```json
{
  "name": "Coffee Shop",
  "description": "Cozy little bakery and coffee shop",
  "location": "123 Davie Street, Vancouver, BC",
  "icon": "https://yourdomain.com/icon.png",
  "type": "place",
  "permissions": ["profile"]
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name of the mini app |
| `description` | string | No | Short description of the mini app |
| `location` | string | No | Location of the experience |
| `icon` | string (URL) | No | App icon URL (recommended: 512x512px). **Note:** You can use an absolute url or a relative path like ./icon.png (which resolves to https://yourdomain.com/icon.png) |
| `type` | string | No | Context type: "place", "event", "club", etc. |
| `permissions` | array | No | Requested permissions. "profile" is granted by default. |

**Note:** Currently, this spec just supports the 'profile' permission. However, Local First Auth apps are designed to be native containers that pass data to 3rd party mini apps. In the future, additional native capabilities could be exposed e.g.) location, bluetooth, or push notifications (if user explicitly grants permission).

## Useful Libraries

- [local-first-auth](https://github.com/antler-browser/local-first-auth): If a user does not have a Local First Auth app, this library allows you to create one client-side in the browser.
- [local-first-auth-import-export](https://github.com/antler-browser/local-first-auth-import-export): This library allows you to import and export a profile / keys from a JSON file.

**License**: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

**Author**: [Daniel Mathews](https://dmathewwws.com) (`danny@antlerbrowser.com`)

**Last Modified**: 2026-07-14