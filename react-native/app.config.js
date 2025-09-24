export default {
  expo: {
    name: "antler",
    slug: "antler",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "antler",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    jsEngine: "hermes",
    ios: {
      icon: "./assets/images/antler-icon.png",
      bundleIdentifier: "com.antlerbrowser",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to scan QR codes and capture photos."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.CAMERA"
      ]
    },
    plugins: [
      "expo-camera",
      "expo-barcode-scanner",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      [
        "expo-font",
        {
          fonts: [
            "assets/fonts/SourceSans3-Regular.ttf",
            "assets/fonts/SourceSans3-SemiBold.ttf",
            "assets/fonts/SourceSans3-Bold.ttf"
          ]
        }
      ]
    ],
    experiments: {
      reactCompiler: true
    }
  }
};