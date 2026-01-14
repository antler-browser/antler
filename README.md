# Antler

Antler makes it easy for developers interact with mini apps that use the [Local First Auth Specification](https://antlerbrowser.com/local-first-auth-specification). User's download the Antler app, create a profile (a DID). Whenever they scan a QR code, they share their profile data with the mini app through a WebView. 

## Monorepo Structure

- React Native Mobile App: `/react-native/`
- Static Website: `/website/`
- Cloudflare Worker: `/cloud/` (for .well-known files)

```
antler/
├── react-native/
├── website/
└─── cloud/
``` 

## Quick Start (React Native App)
    
### 1. Install dependencies
```bash
cd react-native
yarn install
```

### 2. Start the development server
```bash
yarn start
```

### 3. Run the app on iOS or Android
```bash
yarn ios
yarn android
```
