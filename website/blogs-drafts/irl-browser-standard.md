---
title: "IRL Browser Standard"
description: "Technical specification for the IRL Browser Standard"
date: "2025-10-20"
author: "Daniel Mathews"
author_image: "https://ax0.taddy.org/blog/about-us/danny-small-profile-pic.png"
author_url: "https://bsky.app/profile/dmathewwws.com"
---

# IRL Browser Standard

## Overview

The IRL Browser Standard defines how an IRL Browser (an iOS or Android mobile app) communicates with third-party web applications (mini apps). More specifically, when a user scans a QR code using an IRL Browser, this standard defines how their profile and other data gets securely passed between the IRL Browser and the mini app.

## User Benefits

When a user downloads an IRL Browser (like Antler), they create a profile that is stored locally on their device. Whenever a user scans a QR code, their profile gets shared with the mini app. This means users don’t have to go through account creation and immediately gets logged in. 

## Developer Benefits

The benefit of integrating with an IRL Browser is it transforms a regular QR code and allows you to:

- **Skip auth** – no auth systems, no user management, no password resets
- **Instant UX** – users scan and start using your app immediately
- **Deploy a website** – no app store submissions, no native code, no review process

There will always be a need for native mobile apps. IRL Browser mini apps fill a gap where building and maintaining a native app doesn’t make sense e.g.) social clubs, local community events, venues, pop-ups, game nights with friends, or any lightweight gathering where people are physically present.

## Lifecycle

```
1. User scans QR code using an IRL Browser (e.g., Antler)
 2. IRL Browser loads URL in WebView
 3. IRL Browser injects window.irlBrowser JavaScript object
 4. IRL Browser immediately sends signed data in a JWT using postMessage
 5. Mini app verifies JWT signature and uses profile data

 // Fetches IRL Manifest in the background
 6. IRL Browser parses HTML for <link rel="irl-manifest"> tag
 7. IRL Browser fetches manifest in background

 // If you require additional permissions at a later time
 8. Mini app calls window.irlBrowser.requestPermission('location')
 9. IRL Browser validates permission is declared in manifest
 10. If declared → IRL Browser shows user consent prompt
 11. If NOT declared → request is rejected (security)
 12. If user approves → IRL Browser sends location data via postMessage
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
	"version": "1.0",
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
| `version` | string | Yes | IRL Browser Standard version (e.g., “1.0”) |
| `name` | string | Yes | Display name of the mini app |
| `description` | string | No | Short description of the mini app |
| `icon` | string (URL) | No | App icon URL (recommended: 512x512px) |
| `type` | string | No | Context type: “place”, “event”, “club”, etc. |
| `permissions` | array | No | Requested permissions. “profile” is granted by default. |

**Note:** Currently, this spec just supports the profile permission. However, IRL Browsers are designed to be native containers that pass data to 3rd party mini app. In the future, additional native capabilities could be exposed e.g.) location, bluetooth, or push notifications (if user has been explicit permission).

## **Decentralized Identifiers**

When a user downloads an IRL Browser, they create a profile on the app. Under the hood, each profile is a DID ([Decentralized Identifier](https://www.w3.org/TR/did-1.0/) - a W3C standard) with additional details (like name, avatar, and links to socials). 

A DID is a text string that is used to identify a user. Here's an example:

![did-explain.png](https://ax0.taddy.org/antler/did-explain.png)

IRL Browsers use the `did:key` method, where the public key is the last part of the DID.

When you create a profile on an IRL Browser, your DID (which includes a public key) and a corresponding private key are generated and stored locally on your device. Whenever an IRL Browser sends data to a mini app, the payload is signed using the DID's private key, ensuring it came from the DID owner.

## JavaScript API

There are two ways IRL Browsers and mini apps communicate: 

1. `window.postMessage`: Useful when you want to receive data from an IRL Browser
2.  `window.irlBrowser`: Useful when you want to initiate an action inside an IRL Browser

### Use `window.postMessage` to receive data from IRL Browser

All user data passed from an IRL Browser to a mini app is sent via `window.postMessage` and signed using JWTs.

```jsx
window.addEventListener('message', async (event) => {
  try {
	  if (!event.data?.jwt) { return }
	  
	  // verify JWT is valid 
	  const payload = await decodeAndVerifyJWT(event.data.jwt);

		// process message based on the type
	  switch (payload.data.type) {
		  case 'irl:profile:connected':
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

### Message Types

| Type | Description | Requred Permission |
| --- | --- | --- |
| `irl:profile:connected` | User launched mini app | profile |
| `irl:profile:disconnected` | User closed WebView | profile |
| `irl:error` | Error data | 
 |

**Profile Data**

`irl:profile:connected` and `irl:profile:disconnected` return profile details in the following format.

```json
{
	"type": "irl:profile:connected",
	"name": "Danny Mathews",
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
	"socials": [
		{ "platform": "INSTAGRAM", "handle": "dmathewwws" }
	]  
}
```

For security reasons, it is best to reconstruct all items in the socials array on the client side. Check out this code.

**Error Handling**

`irl:error` returns errors from an IRL Browser in the following format.

```json
{
	"type": "irl:error",
	"code": "PERMISSION_NOT_DECLARED",
	"message": "Permission not in manifestn",
}
```

### The `window.irlBrowser` Object

When your mini app loads inside an IRL Browser, a global `window.irlBrowser` object is injected. This allows you to 1) check that the user is using an IRL browser and 2) initiate an on an IRL Browser

### Checking for an IRL Browser

```jsx
if (typeof window.irlBrowser !== 'undefined') {
  // Running in an IRL Browser 
  const info = window.irlBrowser.getInfo();
  console.log(`Running in ${info.name} v${info.version}`);
} else {
  // Regular web browser - show message to download an IRL Browser
  body.innerHTML = `<h1>Scan with an IRL Browser</h1>
	  <p>Download Antler or another IRL Browser to access this experience</p>
  `;
}

```

### Initiate an action

```tsx
interface IRLBrowser {
  // Get information about the IRL Browser
  getInfo(): IRLBrowserInfo;
  
  // Request additional permissions (in the future)
  requestPermission(permission: string): Promise<boolean>;
  
  // Close the WebView (return to QR scanner)
  close(): void;
}
```

```tsx
interface IRLBrowserInfo {
  name: string;        // e.g., "Antler"
  version: string;     // e.g., "1.0.0"
  platform: "ios" | "android";
  supportedPermissions: string[];
}
```

## JWT Structure

All data passed from the IRL Browser to a mini app is done via signed JWTs ([JSON Web Tokens](https://datatracker.ietf.org/doc/html/rfc7519)).

### JWT Header

Useful to know what algorithm to use to decode the JWT. If you use a JWT library, this part is usually done behind the scenes for you. 

```json
{  
	"alg": "EdDSA",  
	"typ": "JWT",
}
```

| Field | Description |
| --- | --- |
| `alg` | Algorithm used to sign the JWT. |
| `typ` | Type of the JWT. Always “JWT”. |

### JWT Payload

Decoded Data inside the JWT Payload.

```json
{  
	"iss": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
	"iat": 1728393600,  
	"exp": 1728397200,
  "data": 
	  {
		  "type": "irl:profile:connected",
		  "name": "Danny Mathews",
		  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
		  "socials": [
			  { "platform": "INSTAGRAM", "handle": "dmathewwws" }
			]  
		}
}
```

| Claim | Description |
| --- | --- |
| `iss` | Issuer - Public key of the user’s DID. Use this when verifying the JWT. |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp (default is 2 minutes) |
| `data` | Type-specific payload |

### Best Practices

1. **Decoding & verifying the JWT** - Never trust unverified data. Decode JWTs using the `alg`. Verify that the JWT has been signed by the user’s public key (`iss` field). 
2. **Validate expiration** - Reject expired tokens. Check the `exp` field. 

**License**: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

**Author**: [Daniel Mathews](https://dmathewwws.com) (`danny@antlerbrowser.com`)

**Last Modified**: 2025-10-23