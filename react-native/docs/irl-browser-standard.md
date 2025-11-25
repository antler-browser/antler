# IRL Browser Specification

## Overview

The IRL Browser Specification defines how an IRL Browser (an iOS or Android mobile app) communicates with third-party web applications (mini apps). More specifically, when a user scans a QR code using an IRL Browser, this standard defines how their profile and other data get securely passed between the IRL Browser and the mini app.

## User Benefits

When a user downloads an IRL Browser (like Antler), they create a profile that is stored locally on their device. Whenever a user scans a QR code, their profile gets shared with the mini app. This means users don’t have to go through account creation and immediately get logged in. 

## Developer Benefits

The benefit of integrating with an IRL Browser is it transforms a regular QR code and allows you to:

- **Skip auth** – no auth systems, no user management, no password resets
- **Instant UX** – users scan and start using your app immediately
- **Deploy a website** – no app store submissions, no native code, no review process

There will always be a need for native mobile apps. IRL Browser mini apps fill a gap where building and maintaining a native app doesn’t make sense e.g.) social clubs, local community events, venues, pop-ups, game nights with friends, or any lightweight gathering where people are physically present.

## Lifecycle

```
1. User scans QR code using an IRL Browser
 2. IRL Browser loads URL in WebView
 3. IRL Browser injects window.irlBrowser JavaScript object
 4. Mini app calls window.irlBrowser.getProfileDetails() when ready
 5. IRL Browser generates and signs JWT with profile details
 6. Mini app verifies JWT & has access to profile details

 // Fetches IRL Manifest in the background
 7. IRL Browser parses HTML for <link rel="irl-manifest"> tag
 8. IRL Browser fetches manifest in background

 // If you require additional permissions at a later time
 9. Mini app calls window.irlBrowser.requestPermission('location')
 10. IRL Browser validates permission is declared in manifest
 11. If declared → IRL Browser shows user consent prompt
 12. If NOT declared → request is rejected (security)
 13. If user approves → IRL Browser sends location data via postMessage
```

## IRL Manifest

Every IRL mini app has a manifest file. The purpose is to showcase basic details about the mini app and explicitly state which permissions your mini app needs.

### Discovery

Mini apps declare their manifest using a `<link>` tag in the HTML `<head>`.

```html
<link rel="irl-manifest" href="/irl-manifest.json">
```

### manifest.json Schema

```json
{
  "name": "Coffee Shop",
  "description": "Cozy little bakery and coffee shop",
  "location": "123 Davie Street, Vancouver, BC",
  "icon": "https://example.com/icon.png",
  "type": "place",
  "permissions": ["profile"] //profile is granted by default
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name of the mini app |
| `description` | string | No | Short description of the mini app |
| `location` | string | No | Location of the experience |
| `icon` | string (URL) | No | App icon URL (recommended: 512x512px). **Note:** You can use an absolute url or a relative path like ./icon.png (which resolves to https://example.com/icon.png) |
| `type` | string | No | Context type: “place”, “event”, “club”, etc. |
| `permissions` | array | No | Requested permissions. “profile” is granted by default. |

**Note:** Currently, this spec just supports the profile permission. However, IRL Browsers are designed to be native containers that pass data to 3rd party mini apps. In the future, additional native capabilities could be exposed e.g.) location, bluetooth, or push notifications (if user explicitly grants permission).

## Decentralized Identifiers

When a user downloads an IRL Browser, they create a profile on the app. Under the hood, each profile is a DID ([Decentralized Identifier](https://www.w3.org/TR/did-1.0/) - a W3C standard) with additional details (like name, avatar, and links to socials). 

A DID is a text string that is used to identify a user. Here's an example:

![did-explain.png](https://ax0.taddy.org/antler/did-explain.png)

IRL Browsers use the `did:key` method, where the public key is the last part of the DID.

When you create a profile on an IRL Browser, your DID (which includes a public key) and a corresponding private key are generated and stored locally on your device. Whenever an IRL Browser sends data to a mini app, the payload is signed using the DID's private key, ensuring it came from the DID owner.

## JavaScript API

There are two ways IRL Browsers and mini apps communicate: 

1. **`window.irlBrowser`:** Use when your mini app wants to request data or initiate actions (e.g., get profile details or request permissions)
2. **`window.postMessage`:** Use when your mini app wants to be notified of events that happened in the IRL Browser (e.g., user closed the WebView)

### The `window.irlBrowser` Object

When your mini app loads inside an IRL Browser, a global `window.irlBrowser` object is injected. This allows you to 1) call methods and get back data and 2) check that the user is using an IRL browser.

```tsx
interface IRLBrowser {
  // Get profile details (name, socials)
  getProfileDetails(): Promise<string>;
  
  // Get avatar as base64-encoded string
  getAvatar(): Promise<string | null>;
  
  // Get details about the IRL Browser
  getBrowserDetails(): BrowserDetails;
  
  // Request additional permissions (in the future)
  requestPermission(permission: string): Promise<boolean>;
  
  // Close the WebView (return to QR scanner)
  close(): void;
}
```

#### Getting profile details

`getProfileDetails()` returns the user’s profile details as a signed JWT. 

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

For security reasons, always reconstruct social links client-side rather than trusting URLs. Check out this code.

#### Getting a user’s avatar

`getAvatar()` returns the user’s base64-encoded avatar as a signed JWT. This image can be up to 1MB in size. If the user has no avatar, this will return null.

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

#### Getting browser details

`getBrowserDetails()` returns information about the IRL Browser.

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
| `name` | string | Yes | IRL Browser name |
| `version` | string | Yes | IRL Browser app version |
| `platform` | string | Yes | `ios` or `android` |
| `supportedPermissions` | array | Yes | The permission that this IRL Browser has implemented.  |

#### Checking for an IRL Browser

Your mini app can detect whether it's running inside an IRL Browser or a regular web browser.

```jsx
if (typeof window.irlBrowser !== 'undefined') {
  // Running in an IRL Browser 
  const info = window.irlBrowser.getInfo();
  console.log(`Running in ${info.name} v${info.version}`);
} else {
  // Regular web browser
  console.log('Not in an IRL Browser');
}
```

### Use `window.postMessage` to receive data from IRL Browser

A user may perform an action inside the IRL Browser that you want to know about. The IRL Browser sends event data to a mini app via `window.postMessage` using signed JWTs.

```jsx
window.addEventListener('message', async (event) => {
  try {
    if (!event.data?.jwt) { return }
    
    // verify JWT is valid
    const payload = await decodeAndVerifyJWT(event.data.jwt);
    
    // process message based on the type
    switch (payload.type) {
      case 'irl:profile:disconnected':
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

Check out this example code if you want to add decodeAndVerifyJWT to your project.

#### Possible message types

| Type | Description | Required Permission |
| --- | --- | --- |
| `irl:profile:disconnected` | User closed WebView | profile |
| `irl:error` | Error data | 
 |

##### Profile Disconnected

`irl:profile:disconnected` returns the same profile details mentioned above.

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

`irl:error` returns errors from an IRL Browser in the following format.

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

All data passed from the IRL Browser to a mini app is done via signed JWTs ([JSON Web Tokens](https://datatracker.ietf.org/doc/html/rfc7519)).

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
| `typ` | Type of the JWT. Always “JWT”. |

### JWT Payload

Decoded data inside the JWT Payload.

```json
{
  "iss": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "aud": "https://example.app",
  "iat": 1728393600,
  "exp": 1728397200,
  "type": "irl:profile:disconnected",
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
| `iss` | Issuer - Public key of the user’s DID. Use this when verifying the JWT. |
| `aud` | Intended Audience - The mini app that requested the JWT.  |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp (default is 2 minutes) |
| `type` | IRL Browser function or event type |
| `data` | Type-specific payload |

### Best Practices

1. **Decoding & verifying the JWT** - Never trust unverified data. Decode JWTs using the `alg`. Verify that the JWT has been signed by the user’s public key (`iss` field). 
2. **Validate audience -** Ensure the `aud` claim matches the domain of the mini app. This is set by the IRL Browser based on the url that launched the WebView.
3. **Validate expiration** - Reject expired tokens. Check the `exp` field. 

## Making Authenticated Requests

When your mini app needs to make an authenticated request on behalf of a user, call `getProfileDetails()`to get a valid JWT for them. This can be used directly as a Bearer token to make authenticated requests ie) no need to build session tokens or additional auth infrastructure. 

### Your Mini App (Client-Side)

```tsx
// Get profile JWT when you need to make an authenticated request
const jwt = await window.irlBrowser.getProfileDetails();

// Use it as a Bearer token in your requests
const response = await fetch('https://example.app/api/posts', {
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
    const payload = await verifyAndDecodeJWT(jwt);
    
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

See code example for verifyAndDecodeJWT. We decode & verify JWT signature including making sure the `aud` claim is for our mini app.

**License**: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

**Author**: [Daniel Mathews](https://dmathewwws.com) (`danny@antlerbrowser.com`)

**Last Modified**: 2025-10-23