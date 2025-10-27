# CLAUDE.md for React Native App

This file provides guidance to Claude Code (claude.ai/code) when working with the React Native app code in this repository.

## Project Overview
Antler is a super-powered QR scanner for IRL hangouts. Available on iOS and Android (React Native + Expo), it lets users create profiles (with DIDs), scan QR codes, and instantly access mini web apps through a WebView — no signup required.

For developers, Antler is a mobile SDK that provides a WebView environment for mini apps. Build simple, self-contained web apps that know users are physically present and can scan QR codes — no native code, no app stores, no auth systems needed.

Antler implements the **IRL Browser Standard**, a specification that defines how IRL Browsers communicate with third-party web applications (mini apps) through signed JWTs and a JavaScript API (`window.irlBrowser`). See `/docs/irl-browser-standard.md` for full specification.

## Key Files and Directories

### Application Structure
- `/app/screens/`: Screen components for each route
  - `/profile/`: Profile creation and viewing screens (NameScreen, SocialsScreen, AvatarScreen, ProfileScreen)
  - `/onboarding/`: Onboarding flow screens (WelcomeScreen, OnboardingNavigator)
  - `CameraScreen.tsx`: Main camera screen with QR scanning
  - `WebViewScreen.tsx`: IRL Browser container that injects `window.irlBrowser` API and handles bidirectional communication with mini apps
  - `ModalStackNavigator.tsx`: Modal navigation stack
  - `root.tsx`: Root navigation configuration
- `/app/components/`: Components organized by feature
  - `/camera/`: Camera-related components (CameraView, CameraPermissions, ProfileCarousel, ProfileOverlay)
  - `/ui/`: Shared UI components (ThemedView, ThemedText, ThemedButton, etc.)
- `/app/hooks/`: Custom React hooks
  - `useOnboarding.ts`: Onboarding state management
  - `useProfile.ts`: Profile data management
- `/lib/`: Utilities and service integrations
  - `camera.ts`: Camera and QR scanning utilities
  - `did.ts`: Decentralized identity (DID) utilities
  - `send-data.ts`: JWT signing utilities for WebView communication (IRL Browser Standard)
  - `webview-signing.ts`: Ephemeral ECDSA P-256 key pair generation and message signing for WebView XSS protection
  - `secure-storage.ts`: Secure storage operations
  - `social-links.ts`: Social media link validation and formatting
  - `colors.ts`: Color constants
  - `navigation.ts`: Navigation types and constants
  - `/db/`: Database schema, migrations, and model operations
    - `schema.ts`: Drizzle schema definitions
    - `index.ts`: Database connection and migration runner
    - `/migrations/`: SQL migration files
    - `/models/`: Database model operations (AppStateFns, UserProfileFns, ScanHistoryFns)
- `/docs/`: Documentation
  - `irl-browser-standard.md`: IRL Browser Standard specification
- `/assets/`: Static assets (fonts, icons, images)
- `index.tsx`: App entry point
- `app.config.js`: Expo configuration
- `tsconfig.json`: TypeScript configuration

## Development Commands

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Add new package
yarn add <package-name>

# Type checking
yarn build

# Run on iOS simulator
yarn ios

# Run on Android emulator
yarn android

# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate test coverage
yarn test:coverage

# Lint code
yarn lint
```

## Architecture Patterns

### Navigation Structure
- Stack-based navigation with camera as the root screen
- Modal presentations for profile creation and viewing
- Three main navigation stacks:
  1. **Camera Stack** (root): CameraScreen → ProfileScreen (modal)
  2. **Modal Stack**: Profile creation flow and WebView
  3. **Onboarding Stack**: First-time user experience
- Navigation types and constants in `/lib/navigation.ts`
- Deep linking support through Expo Linking
- Navigation param lists:
  - `RootStackParamList`: Main app navigation
  - `ModalStackParamList`: Modal screens (profile form, webview)
  - `ProfileCreateOrEditStackParamList`: Profile form flow (Name → Socials → Avatar) - used for both creating and editing profiles
  - `OnboardingStackParamList`: Onboarding screens

### Component Organization
- Feature-based organization (`/camera`, `/profile`, `/onboarding`)
- Common UI components in `/ui` directory
- Screen components handle routing logic
- Themed components for consistent styling across light/dark modes

### State Management
- Custom hooks for feature-specific state (`useOnboarding`, `useProfile`)
- SQLite database for app data persistence
- SecureStorage for sensitive data (DID private keys, credentials)
- Context providers for theme

### Storage Architecture
- **SQLite Database**: User profiles, app state, social links, scan history
- **SecureStorage**: DID private keys (Ed25519) used for signing JWTs, sensitive credentials
- Database managed with Drizzle ORM for type-safe queries
- Database model operations in `/lib/db/models/` organized by entity:
  - `app-state.ts`: AppStateFns namespace for app state operations
  - `user-profile.ts`: UserProfileFns namespace for profile CRUD
  - `scan-history.ts`: ScanHistoryFns namespace for scan tracking
- Secure storage utilities in `/lib/secure-storage.ts`
- JWT signing utilities in `/lib/send-data.ts` for WebView communication

### Database Structure
- **`app_state`**: Global application state (current DID, welcome completion)
- **`user_profiles`**: User profile data (DID, name, avatar, position, timestamps)
- **`social_links`**: Social media links (platform, handle, profile DID)
- **`scan_history`**: QR scan history (URL, profile DID, timestamp)
- Automatic migrations run on app startup
- Foreign key constraints with cascade deletes
- Position-based ordering for profiles

### Database API
Database operations are organized into function namespaces by entity:
- `UserProfileFns`: Profile CRUD operations
- `AppStateFns`: App state CRUD operations
- `ScanHistoryFns`: Scan history CRUD operations
- `SocialLinkFns`: Social media link CRUD operations

## Development Workflow

### Adding New Screens
1. Create screen component in appropriate directory under `/app/screens/`
2. Add screen to navigation stack in `/app/screens/root.tsx` or appropriate navigator
3. Add route types to `/lib/navigation.ts` param lists
4. Export navigation constants in `/lib/navigation.ts`

### Creating New Components
1. Add component to appropriate feature directory (`/camera`, `/profile`, etc.)
2. Use themed components from `/app/components/ui/` for consistent theming
3. Follow existing patterns for styling and props
4. Export component if needed through feature directory index file

### Theming
1. Theme values in `/lib/colors.ts`
2. Use themed components from `/app/components/ui/` when possible
3. All themed components support both light and dark mode
4. Available themed components:
   - `ThemedView`, `ThemedText`, `ThemedButton`, `ThemedTextInput`
   - `HeaderBackButton`, `HeaderCloseButton`
   - `ProgressIndicator`, `Screen`

### Onboarding for new app downloads
- Onboarding state managed by `useOnboarding` hook
- First-time user experience starts with WelcomeScreen
- Completion state persisted in SQLite database
- Database migrations run automatically during initialization

### Creating a Profile
- The profile creation flow is a three-step modal flow (Name → Socials → Avatar) with progress indicator, data validation at each step, and SQLite database persistence
- If a user does not have a profile, the first time you scan a QR code, the app will navigate to the profile creation flow
- Profile creation generates a DID (Decentralized Identifier) stored securely in SecureStorage
- Profile data (name, avatar, social links) stored in SQLite via `UserProfileFns.createProfileByDid()`
- Profiles are a visual wrapper around a user's DID

### Camera & QR Scanning
- Camera permissions handled by `CameraPermissions` component
- QR scanning implemented in `CameraView`
- Scanned QR codes resolve DIDs to load profiles
- Camera utilities in `/lib/camera.ts`
- When a QR code is scanned, if the user has a profile, the app navigates to WebViewScreen and passes the user's DID as a parameter
- The DID is used to fetch profile data and sign JWTs for mini app communication

### DID Integration
- Decentralized Identity (DID) utilities in `/lib/did.ts`
- DIDs used for user identification and profile resolution
- Keys stored in SecureStorage
- JWT signing and verification supported

### WebView & Mini App Integration
- Implements the IRL Browser Standard for secure communication with third-party mini apps
- **JavaScript API Injection** (`/app/screens/WebViewScreen.tsx`):
  - `window.irlBrowser.getProfileDetails()`: Returns signed JWT with user profile (async)
  - `window.irlBrowser.getBrowserDetails()`: Returns browser info (name, version, platform, permissions)
  - `window.irlBrowser.requestPermission(permission)`: Request additional permissions (future)
  - `window.irlBrowser.close()`: Close WebView and return to camera
- **Message Handling**: WebViewScreen listens for messages from mini apps via `window.postMessage`
- **JWT Signing** (`/lib/send-data.ts`):
  - `getProfileDetailsJWT(did)`: Generates signed JWT for API responses
  - `sendDataToWebView(type, did)`: Generates signed JWT for events (e.g., profile disconnect)
  - Uses Ed25519 algorithm with user's DID private key
  - JWTs include claims: `iss` (issuer DID), `iat` (issued at), `exp` (expiration), `type` (message type), `data` (payload)
- **Event Types**:
  - `irl:profile:disconnected`: Sent when user closes WebView
  - `irl:error`: Error data from native app
- Mini apps verify JWTs using the DID public key (`iss` field) to ensure authenticity
- See `/docs/irl-browser-standard.md` for full specification
- **Security Architecture**:
  - **Dual Signing System**:
    - Profile JWTs: Signed with user's DID private key (Ed25519, long-lived, stored in SecureStore)
    - WebView internal messages: Signed with ephemeral ECDSA P-256 keys (session-only, prevents XSS)
  - **XSS Protection** (`/lib/webview-signing.ts`):
    - Fresh ECDSA P-256 key pair generated per WebView session
    - Public key injected into WebView for signature verification
    - All native→WebView internal messages signed to prevent XSS forgery attacks
    - WebView verifies signatures using `crypto.subtle` with ECDSA P-256
    - Uses sorted keys for deterministic serialization to ensure signature verification works correctly
  - **Browser Requirements**:
    - Requires `crypto.subtle` with ECDSA P-256 support
    - iOS 11+ (Safari 11)
    - Android 5.0+ (Lollipop) with system WebView
  - `window.ReactNativeWebView.postMessage()` is a one-way secure channel (WebView → Native)

## Third Party Libraries
- Expo Camera for QR scanning and photo capture
- Expo Image Picker for avatar selection
- react-native-webview for WebView screen
- expo-sqlite with Drizzle ORM for local database (type-safe queries and migrations)
- Expo SecureStore for sensitive data (DID private keys)
- @stablelib/ed25519 for Ed25519 cryptographic signing (JWT signatures)
- base64-js for base64 encoding/decoding

## Troubleshooting

### Common Issues
- **Theme Issues**: Ensure components use themed components from UI directory
- **Navigation Problems**: Check route params and navigation structure; verify param lists in `/lib/navigation.ts`
- **Build Errors**: Update Expo SDK or check TypeScript errors with `yarn build`
- **Database Issues**: Check migration logs in console; ensure schema matches migration files in `/lib/db/migrations/`
- **API Issues**: Use function namespaces (`AppStateFns`, `UserProfileFns`, `ScanHistoryFns`) for database operations

### Debugging Tools
- React Native Debugger for runtime inspection
- Expo Dev Tools for device/emulator management
- TypeScript for compile-time checking
- `yarn test` for unit testing