export default {
  expo: {
    name: "antler",
    slug: "antler",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/antler-icon.png",
    scheme: "antler",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    jsEngine: "hermes",
    ios: {
      icon: "./assets/images/antler-icon.png",
      bundleIdentifier: "com.antlerbrowser",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "Antler uses the camera to scan QR codes."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/antler-icon.png",
        backgroundImage: "./assets/images/android-background.png",
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
          image: "./assets/images/antler-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
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