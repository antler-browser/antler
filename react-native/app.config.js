export default {
  expo: {
    name: "antler",
    slug: "antler",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "antler",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    jsEngine: "hermes",
    ios: {
      icon: "./assets/images/antler-icon.icon",
      bundleIdentifier: "com.antlerbrowser",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "Antler uses the camera to scan QR codes.",
        LSApplicationQueriesSchemes: [
          "mailto",
          "itms-apps"
        ],
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoadsInWebContent: true
        }
      }
    },
    android: {
      package: "com.antlerbrowser",
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
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
      [
        "expo-splash-screen",
        {
          image: "./assets/images/antler-mascot.png",
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
    extra: {
      eas: {
        projectId: "8b359e82-8f99-4253-bf36-2a6e10ed5a9a"
      }
    },
  }
};