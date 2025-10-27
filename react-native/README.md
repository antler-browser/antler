# Antler

Antler is a React Native and Expo app, available on iOS and Android. It is a super-powered QR scanner useful for IRL hangouts. You create profiles (with DIDs), scan QR codes and pass data between the Antler app to complementary mini apps through a WebView.

Antler implements the **IRL Browser Standard**, a specification for secure communication between IRL Browser apps and third-party web applications (mini apps). 

## Tech Stack

- **React Native / Expo** - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **Expo Camera** - QR scanning and photo capture
- **DID** - Decentralized identity (W3C standard)
- **JWT** - For passing verified information between the app and mini apps via signed tokens
- **Ed25519** - Cryptographic signing for JWTs
- **SQLite + Drizzle ORM** - Local database with type-safe queries and migrations
- **Expo SecureStore** - Secure credential storage

## Prerequisites

- Node.js (v20 or higher)
- Yarn package manager
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

## Running the app locally

### 1. Install dependencies
```bash
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

## Development

### Building & Type Checking
```bash
# Type check and build (includes WebView minification)
yarn build

# Minify WebView JavaScript (run after editing /lib/*.raw.js files)
yarn minify-webview
```

### WebView JavaScript
The `window.irlBrowser` API injected into mini apps is pre-minified at build time for optimal performance:
- **Raw templates:** `lib/webview-injected.raw.js`, `lib/webview-console-intercept.raw.js`
- **Minified outputs:** Auto-generated `.min.ts` files (59% smaller)
- Run `yarn minify-webview` after editing raw templates

### Debugging WebView Mini Apps
Console logging from WebView to React Native is **disabled by default** for better performance (~20-30ms faster load). Instead, use:
- **iOS:** Safari → Develop → [Your Device] → WebView Inspector
- **Android:** Chrome → `chrome://inspect` → Inspect WebView

To re-enable console forwarding, see [`/docs/webview-console-forwarding.md`](./docs/webview-console-forwarding.md).

## IRL Browser Standard

Antler implements the IRL Browser Standard, which defines how IRL Browser apps communicate with third-party mini apps. Key features:

- **`window.irlBrowser` API**: JavaScript interface injected into WebView for mini apps to interact with the native app
  - `getProfileDetails()`: Get user profile as signed JWT
  - `getBrowserDetails()`: Get browser info (name, version, platform, permissions)
  - `close()`: Close WebView and return to camera
  - `requestPermission()`: Request additional permissions (future)

- **Event System**: Native app sends signed events to mini apps via `window.postMessage`
  - `irl:profile:disconnected`: User closed WebView
  - `irl:error`: Error from native app

For the complete specification, see [`/docs/irl-browser-standard.md`](./docs/irl-browser-standard.md).