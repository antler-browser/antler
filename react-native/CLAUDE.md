# CLAUDE.md for React Native App

This file provides guidance to Claude Code (claude.ai/code) when working with the React Native app code in this repository.

## Project Overview
Antler is a super-powered QR scanner for IRL hangouts. Available on iOS and Android (React Native + Expo), it lets users create profiles (with DIDs), scan QR codes, and instantly access mini web apps through a WebView — no signup required.

For developers, Antler is a mobile SDK that provides a WebView environment for mini apps. Build simple, self-contained web apps that know users are physically present and can scan QR codes — no native code, no app stores, no auth systems needed.

## Key Files and Directories

### Application Structure
- `/app/screens/`: Screen components for each route
  - `/profile/`: Profile creation and viewing screens (NameScreen, SocialsScreen, AvatarScreen, ProfileScreen)
  - `/onboarding/`: Onboarding flow screens (WelcomeScreen, OnboardingNavigator)
  - `CameraScreen.tsx`: Main camera screen with QR scanning
  - `WebViewScreen.tsx`: In-app browser for external links
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
  - `secure-storage.ts`: Secure storage operations
  - `social-links.ts`: Social media link validation and formatting
  - `storage.ts`: AsyncStorage utilities
  - `user.ts`: User data management
  - `colors.ts`: Color constants
  - `navigation.ts`: Navigation types and constants
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
- AsyncStorage for non-sensitive data persistence
- SecureStorage for sensitive data (keys, credentials)
- Context providers for theme

### Storage Architecture
- **AsyncStorage**: User profiles, onboarding state, non-sensitive settings
- **SecureStorage**: Private keys, sensitive credentials
- Storage utilities in `/lib/storage.ts` and `/lib/secure-storage.ts`

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
- Completion state persisted in AsyncStorage

### Creating a Profile
- The profile creation flow is a three-step modal flow (Name → Socials → Avatar) with progress indicator, data validation at each step, and AsyncStorage persistence
- If a user does not have a profile, the first time you scan a QR code, the app will navigate to the profile creation flow.
- At the end of the profile creation flow, the user will have a generated DID (Decentralized Identifier) and it will be stored securely in SecureStorage.
- Profiles are a visual wrapper around a user's DID.

### Camera & QR Scanning
- Camera permissions handled by `CameraPermissions` component
- QR scanning implemented in `CameraView`
- Scanned QR codes resolve DIDs to load profiles
- Camera utilities in `/lib/camera.ts`
- When a QR code is scanned, if the user has a profile, the app will navigate to the WebView screen and pass in the DID into the WebView screen.

### DID Integration
- Decentralized Identity (DID) utilities in `/lib/did.ts`
- DIDs used for user identification and profile resolution
- Keys stored in SecureStorage
- JWT signing and verification supported

## Third Party Libraries
- Expo Camera for QR scanning and photo capture
- Expo Barcode Scanner for QR scanning
- Expo Image Picker for avatar selection
- react-native-webview for WebView screen
- Expo AsyncStorage for app data persistence
- Expo SecureStore for sensitive data

## Troubleshooting

### Common Issues
- **Theme Issues**: Ensure components use themed components from UI directory
- **Navigation Problems**: Check route params and navigation structure; verify param lists in `/lib/navigation.ts`
- **Build Errors**: Update Expo SDK or check TypeScript errors with `yarn build`
- **Storage Issues**: Check AsyncStorage and SecureStorage utilities; ensure data is properly serialized

### Debugging Tools
- React Native Debugger for runtime inspection
- Expo Dev Tools for device/emulator management
- TypeScript for compile-time checking
- `yarn test` for unit testing