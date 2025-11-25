---
title: "Open-Source"
description: "Antler is an open-source project"
date: "2025-10-20"
author: "Daniel Mathews"
author_image: "https://ax0.taddy.org/blog/about-us/danny-small-profile-pic.png"
author_url: "https://bsky.app/profile/dmathewwws.com"
---

# Open-Source

Antler is an [open-source](https://github.com/antler-browser/antler) monorepo with multiple applications:

[Mobile App](https://github.com/antler-browser/antler/blob/main/react-native/README.md) - React Native  / Expo app.

[Website](https://github.com/antler-browser/antler/blob/main/website/README.md) - HTML / CSS / Markdown.

## IRL Browser Specification

Antler uses an [open standard](./irl-browser-standard.html) to pass data between the app to your website. When users scan your QR code, their profile details on Antler get shared to your site - no auth friction, instant login, no account creation.

**Why using open specification matters:** Being an open specification means anyone can create an alternative to Antler. This means if you are a developer, you get the benefits of integrating your website with Antler and know you are not locked into a closed platform.

## Examples:

Here are some example apps you can fork to get started:

[Mini-App for a Meetup (Cloudflare - Recommended)](https://github.com/antler-browser/meetup-cloudflare): Uses Cloudflare Workers, Durable Object and D1 Storage.

[Mini-App for a Meetup (Self-hosted)](https://github.com/antler-browser/meetup-self-hosted): Same app as above but you can self-hosted via Docker.  

[Draw-on-my-phone:](https://github.com/antler-browser/draw-on-my-phone) Scan QR code to get into the same room, then you draw a word → pass your phone to the person next to you → they can guess your drawing, and so on (similar to Telestrations or Garlic Phone)