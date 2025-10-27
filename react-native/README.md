# Antler

Antler is a React Native and Expo app, available on iOS and Android. It is a super-powered QR scanner useful for IRL hangouts. You create profiles (with DIDs), scan QR codes and pass data between the Antler app to complementary mini apps through a WebView. 

## Tech Stack

- **React Native / Expo** - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **Expo Camera** - QR scanning and photo capture
- **DID** - Decentralized identity
- **JWT** - For passing infomation verified infomation between the app and the web
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