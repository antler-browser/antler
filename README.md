# Antler

Antler is a local-first mobile app platform that makes it easy for developers to build complementary mini apps — no signup required. You create profiles (with DIDs), scan QR codes and pass data between the Antler app to mini apps through a WebView.

## Monorepo Structure

- React Native Mobile App: `/react-native/`
- Static Website: `/website/`

```
antler/
├── react-native/
├── website/
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


