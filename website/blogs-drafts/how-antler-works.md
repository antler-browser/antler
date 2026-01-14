---
title: "How Antler Works"
description: "Quick guide to building a mini app using the Local First Auth Spec"
date: "2025-11-24"
author: "Daniel Mathews"
author_image: "https://ax0.taddy.org/blog/about-us/danny-small-profile-pic.png"
author_url: "https://bsky.app/profile/dmathewwws.com"
---

# How Antler Works

![local-first-auth-workflow.png](https://ax0.taddy.org/antler/local-first-auth-workflow.png)

When a user downloads Antler, they create a profile that is stored locally on their device.

A profile contains:

- a [DID](https://www.w3.org/TR/did-1.0/) (a W3C Standard for identity) - a public key
- a private key
- a name
- link to socials (optional)
- an avatar (optional)

When a user scans a QR code, Antler opens your website inside a WebView and injects a `window.localFirstAuth` object.

The `window` object is available on all browsers, and as a developer it gives you access to useful browser features. For example, `window.location` lets you know the current url you are visiting in the browser. We made up a new property called `window.localFirstAuth` and use it as an interface to communicate between the Antler app and your website.

Your website calls `window.localFirstAuth.getProfileDetails()` and gets back cryptographically signed profile data as a JWT.

```json
{
  "iss": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "aud": "https://yourdomain.com",
  "iat": 1728393600,
  "exp": 1728397200,
  "type": "localFirstAuth:profile:details",
  "data":
    {
      "did": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "name": "Danny Mathews",
      "socials": [{ "platform": "INSTAGRAM", "handle": "dmathewwws" }]
    }
}
```

You should decode and verify that the public key in the `iss` field was used to sign this data. This way you know only someone with the private key for this DID could have sent it.

And voila, the user is instantly logged into your website. Profile details that were stored locally on the user's device were shared to your website and no servers were involved!

For more details, check out the full [Local First Auth Specification](./local-first-auth-specification.html)
