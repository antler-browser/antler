# Expo Build & Submit Guide

Quick reference for building and submitting iOS/Android apps using Expo EAS.

## Pre-Build

Always run before building to ensure WebView JS is minified:

```bash
yarn build
```

## Increment Version on app.config.js

```bash
version: "1.1", // Increment the version number
```

## Build Commands

```bash
# iOS only
eas build --platform ios --profile production

# Android only
eas build --platform android --profile production
```

For development/testing builds:

```bash
eas build --platform ios --profile development
eas build --platform android --profile preview
```

## Submit Commands

```bash
# Submit latest iOS build to App Store Connect
eas submit --platform ios --latest

# Submit latest Android build to Google Play
eas submit --platform android --latest
```

## Useful Commands

```bash
# Check build status
eas build:list

# View/manage credentials
eas credentials

# Check current project config
eas config --platform ios
eas config --platform android
```

## Version Management

App versions are managed remotely by EAS (configured in `eas.json`). Production builds auto-increment the build number.

## Resources

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Credentials](https://docs.expo.dev/app-signing/managed-credentials/)
