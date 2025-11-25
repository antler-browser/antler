# Antler

Antler is a React Native and Expo app, available on iOS and Android. It is a super-powered QR scanner useful for IRL hangouts. You create profiles (with DIDs), scan QR codes and pass data between the Antler app to complementary mini apps through a WebView.

Antler implements the **IRL Browser Specification**, a specification for secure communication between IRL Browser apps and third-party web applications (mini apps). 

## Tech Stack

- **React Native / Expo** - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **Expo Camera** - QR scanning and photo capture
- **DID** - Decentralized identity (W3C standard)
- **JWT** - For passing verified information between the app and mini apps via signed tokens
- **Ed25519** - Cryptographic signing for JWTs (profile data)
- **ECDSA P-256** - Ephemeral key signing for WebView message integrity (XSS protection)
- **SQLite + Drizzle ORM** - Local database with type-safe queries and migrations
- **Expo SecureStore** - Secure credential storage
- **esbuild** - Build-time JavaScript minification for WebView injection

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

# Minify WebView JavaScript (run after editing /lib/webview/*.raw.js files)
yarn minify-webview
```

### WebView JavaScript
The `window.irlBrowser` API injected into mini apps is pre-minified at build time for optimal performance:
- **Raw templates:** `lib/webview/webview-injected.raw.js`, `lib/webview/webview-console-intercept.raw.js`
- **Minified outputs:** Auto-generated `.min.ts` files (59% smaller)
- Run `yarn minify-webview` after editing raw templates

### Testing
```bash
# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate test coverage
yarn test:coverage
```

The test suite includes comprehensive tests covering:
- WebView API injection and signature verification
- JWT signing and data transfer
- XSS protection mechanisms
- Edge cases and error handling

### Debugging WebView Mini Apps
Console logging from WebView to React Native is **disabled by default** for better performance (~20-30ms faster load). Instead, use:
- **iOS:** Safari → Develop → [Your Device] → WebView Inspector
- **Android:** Chrome → `chrome://inspect` → Inspect WebView

To re-enable console forwarding, see [`/docs/webview-console-forwarding.md`](./docs/webview-console-forwarding.md).

### Backup Private Keys on iOS and Android
- **iOS:** SQLite database and private keys are backed up to iCloud Backup
- **Android:** SQLite database and private keys are backed up via Android Auto Backup

## IRL Browser Specification

Antler implements the IRL Browser Specification, which defines how IRL Browser apps communicate with third-party mini apps. Key features:

### JavaScript API

**`window.irlBrowser` API** - JavaScript interface injected into WebView for mini apps:
- `getProfileDetails()`: Get user profile as signed JWT
- `getAvatar()`: Get user avatar as signed JWT (or null)
- `getBrowserDetails()`: Get browser info (name, version, platform, permissions)
- `close()`: Close WebView and return to camera
- `requestPermission(permission)`: Request additional permissions (future)

**Event System** - Native app sends signed events to mini apps via `window.postMessage`:
- `irl:profile:disconnected`: User closed WebView (includes profile data)
- `irl:error`: Error from native app

### Security Architecture

**Dual Signing System** for maximum security:
1. **Profile JWTs** - Signed with user's DID private key (Ed25519, long-lived)
   - Used for: `getProfileDetails()`, `getAvatar()`, event messages
   - Verifiable by mini apps using the DID public key
   - Claims: `iss` (issuer DID), `iat`, `exp`, `type`, `data`

2. **WebView Internal Messages** - Signed with ephemeral ECDSA P-256 keys
   - Session-only keys generated per WebView session
   - Prevents XSS attacks from forging native app responses
   - Uses `crypto.subtle` for signature verification in WebView
   - Request ID validation prevents response cross-talk

**XSS Protection Mechanisms:**
- Signature verification on all native→WebView responses
- `Object.defineProperty()` + `Object.freeze()` on `window.irlBrowser` (prevents API tampering)
- Canonical JSON serialization for deterministic signature verification
- Timeout handling (5 second default)

**Browser Requirements:**
- iOS 11+ (Safari 11) or Android 5.0+ (Lollipop) with system WebView
- Requires `crypto.subtle` with ECDSA P-256 support

For the complete specification, see [`/docs/irl-browser-standard.md`](./docs/irl-browser-standard.md).