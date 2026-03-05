---
title: "Local First Auth Specification"
description: "Technical specification for client-side auth using locally stored profiles"
date: "2026-03-21"
author: "Daniel Mathews"
author_image: "https://ax0.taddy.org/blog/about-us/danny-small-profile-pic.png"
author_url: "https://bsky.app/profile/dmathewwws.com"
---

# Local First Auth Specification

## Overview

The Local First Auth Spec makes it easy to add auth to your website or mini app — no servers, no passwords, no third-party auth providers.

## Developer Benefits

- **Local-First Authentication** – New users just have to type in a name (and optionally add an avatar). A profile, including a public key and private key is created. A signed JWT is generated on the user's device to authenticate requests to your website or mini app.
- **Skip complex sign-up flow** – no user management, no email verification, no password resets

## Lifecycle

```
1. User scans QR code using a Local First Auth app
 2. App loads URL in WebView
 3. App injects window.localFirstAuth JavaScript object
 4. Mini app calls window.localFirstAuth.getProfileDetails() when ready
 5. App generates and signs JWT with profile details
 6. Mini app verifies JWT & has access to profile details

 // Fetches Local First Auth Manifest in the background
 7. App parses HTML for <link rel="local-first-auth-manifest"> tag
 8. App fetches manifest in background

 // If you require additional permissions at a later time
 9. Mini app calls window.localFirstAuth.requestPermission('location')
 10. App validates permission is declared in manifest
 11. If declared → App shows user consent prompt
 12. If NOT declared → request is rejected (security)
 13. If user approves → App sends location data via postMessage
```

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
  "permissions": ["profile"] //profile is granted by default
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

When Local First Auth is available a global `window.localFirstAuth` object is present. This allows you to 1) call methods and get back data and 2) check that the user has Local First Auth.

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
| `localFirstAuth:error` | Error data |
 |

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
| `iss` | Issuer - Public key of the user's DID. Use this when verifying the JWT. |
| `aud` | Intended Audience - The mini app that requested the JWT.  |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp (default is 2 minutes) |
| `type` | Local First Auth function or event type |
| `data` | Type-specific payload |

### Best Practices

1. **Decoding & verifying the JWT** - Never trust unverified data. Decode JWTs using the `alg`. Verify that the JWT has been signed by the user's public key (`iss` field).
2. **Validate audience -** Ensure the `aud` claim matches the domain of the mini app. This is set by the Local First Auth app based on the url that launched the WebView.
3. **Validate expiration** - Reject expired tokens. Check the `exp` field.

## Making Authenticated Requests

When your mini app needs to make an authenticated request on behalf of a user, call `getProfileDetails()`to get a valid JWT for them. This can be used directly as a Bearer token to make authenticated requests ie) no need to build session tokens or additional auth infrastructure.

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

**License for this specification**: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

**Author**: [Daniel Mathews](https://dmathewwws.com) (`danny@antlerbrowser.com`)

**Last Modified**: 2026-02-21
