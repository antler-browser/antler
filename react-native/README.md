# Antler

A camera-first, local-first React Native mobile application for iOS and Android. Antler enables users to create visual profiles, share social links, and connect through QR code scanning using decentralized identity (DID) technology.

## Tech Stack

- **React Native / Expo** - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **Expo Camera / Expo Barcode Scanner** - QR scanning and photo capture
- **DID** - Decentralized identity
- **Did-JWT** - For passing infomation verified infomation between the app and the web
- **AsyncStorage** - Local data persistence
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