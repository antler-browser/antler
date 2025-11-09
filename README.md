# Antler

Antler makes it easy for developers to build local first-auth into their web applications. User's download the Antler app (or another IRL Browser), create a profile (a DID). Whenever they scan a QR code, they share their profile data with the third-party web application (mini app) through a WebView. 

Antler implements the [IRL Browser Standard](https://antlerbrowser.com/irl-browser-standard), a specification for secure communication between IRL Browser apps and mini apps.

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


