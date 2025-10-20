---
title: "IRL Browser Standard - Technical Specification"
description: "Technical specification for the IRL Browser Standard"
date: "2025-10-20"
author: "Daniel Mathews"
author_image: "https://ax0.taddy.org/blog/about-us/danny-small-profile-pic.png"
author_url: "https://bsky.app/profile/dmathewwws.com"
---

# IRL Browser Standard - Technical Specification

## Overview

The IRL Browser Standard enables web applications (mini apps) to interact with users in physical spaces through QR codes, without requiring app downloads or account creation. Users maintain decentralized identifiers (DIDs) and profiles that are securely passed to mini apps via signed JWTs.

## Lifecycle

```
1. User scans QR code → https://example.com
2. IRL Browser (e.g., Antler) loads URL in WebView
3. IRL Browser injects window.irlBrowser JavaScript object
4. IRL Browser immediately sends signed profile JWT via postMessage
5. Mini app verifies JWT signature and uses profile data
6. IRL Browser parses HTML for <link rel="irl-manifest"> tag
7. IRL Browser fetches manifest in background

// Later, for additional permissions:
8. Mini app calls window.irlBrowser.requestPermission('location')
9. IRL Browser validates permission is declared in manifest
10. If declared → IRL Browser shows user consent prompt
11. If NOT declared → request is rejected (security)
12. If approved → IRL Browser sends signed permission data via postMessage
```

## IRL Manifest

### Discovery

Mini apps declare their manifest using a `<link>` tag in the HTML `<head>`.

```html
<link rel="irl-manifest" href="/irl-manifest.json">
```

### manifest.json Schema

```json
{  
	"version": "1.0",
	"name": "Coffee Shop",
	"description": "123 Davie Street, Vancouver, BC",
	"icon": "https://example.com/icon.png",
	"type": "place",
	"permissions": ["profile"] //profile is granted by default}
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `version` | string | Yes | IRL Browser Standard version (e.g., “1.0”) |
| `name` | string | Yes | Display name of the mini app |
| `description` | string | No | Short description of the mini app |
| `icon` | string (URL) | No | App icon URL (recommended: 512x512px) |
| `type` | string | No | Context type: “place”, “event”, “service”, etc. |
| `permissions` | array | No | Requested permissions: “profile”, “location”, “notifications” |

### Permission Types

- **`profile`**: Automatically granted. User’s DID and public profile data.
- **`location`**: Requires manifest declaration + user approval. GPS coordinates.
- **`notifications`**: Requires manifest declaration + user approval. Push notifications.

## JavaScript API

### Message Events

All data from the IRL Browser to the mini app is sent via `window.postMessage` with signed JWTs.

### Listening for Messages

```jsx
window.addEventListener('message', (event) => {
  const { jwt } = event.data;  // verify the JWT  const verifiedJWT = verifyAndDecodeJWT(jwt);  const { type, data: profile } = verifiedJWT.payload;  // handle the message based on the type  if (type === 'irl:profile') {
    console.log('User DID:', profile.iss);
    console.log('User Name:', profile.name);  
  }
});
```

### Message Types

| Type | Description | Automatic | Requires Permission |
| --- | --- | --- | --- |
| `irl:profile` | User profile data | Yes | No (always sent) |
| `irl:error` | Error data | No | No |

## JWT Structure

All data passed from the IRL Browser is signed with the user’s DID private key as a JWT.

### Header

```json
{  
	"alg": "EdDSA",  
	"typ": "JWT",
}
```

| Field | Description |
| --- | --- |
| `alg` | Algorithm used to sign the JWT. Use this when decoding the JWT. |
| `typ` | Type of the JWT. Always “JWT”. |

### Payload

```json
{  
	"iss": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK", // public key of the user's DID.  
	"iat": 1728393600,  
	"exp": 1728397200,
  "data": 
	  {
		  "type": "profile",
		  "name": "Alice Chen",
		  "avatar": "https://example.com/avatar.jpg",
		  "socials": [{ "platform": "x", "handle": "alice" }]  
		 }
}
```

| Claim | Description |
| --- | --- |
| `iss` | Issuer - Public key of the user’s DID. Use this when decoding the JWT. |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp (2 minutes default) |
| `data` | Type-specific payload |

### Best Practices

1. **Decoding & verifying the JWT** - Decode the JWT using the `alg`. Verify that the JWT has been signed by the user’s public key (`iss` field). Never trust unverified data.
2. **Validate expiration** - Check the `exp` field. Reject expired tokens.
3. **Handle permission denials** - Gracefully degrade if permission denied

## Error Handling

### Error Message Format

```jsx
{
  type: 'irl:error',  error: {
    code: 'PERMISSION_DENIED',    message: 'User denied location permission',    permission: 'location'  }
}
```

### Error Codes

| Code | Description |
| --- | --- |
| `PERMISSION_DENIED` | User denied permission request |
| `PERMISSION_NOT_DECLARED` | Permission not in manifest |

## Browser Detection

### Checking for IRL Browser Support

```jsx
if (typeof window.irlBrowser !== 'undefined') {
  // Running in an IRL Browser 
  const info = window.irlBrowser.getInfo();
  console.log(`Running in ${info.name} v${info.version}`);
} else {
  // Regular web browser - show message to download the IRL Browser  document.
  body.innerHTML = `    <h1>Scan with an IRL Browser</h1>    <p>Download Antler or another IRL Browser to access this experience</p>  `;
}
```

**License**: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

**Authors**: Daniel Mathews

**Last Modified**: 2025-10-20