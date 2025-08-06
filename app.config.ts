import 'dotenv/config';

export default {
  expo: {
    name: "digital-detox-app",
    slug: "digital-detox-app",
    owner: "yukiogata_411",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    jsEngine: "hermes",
    splash: {
      image: "./assets/Lival-icon-clearBG.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yukiogata.lival"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yukiogata.lival",
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/Lival-text.png"
    },
    plugins: [
      "expo-router"
    ],
    scheme: "com.googleusercontent.apps.455840687099-6719qmpp5to00cer78l4u0hpauq0ka78",
    extra: {
      EXPO_PUBLIC_ALGOLIA_APP_ID: "WGDFHUPOIV",
      EXPO_PUBLIC_ALGOLIA_SEARCH_KEY: "e7d947c6c7992e91f3e527b7c73b126e",
      router: {},
      eas: {
        projectId: "cce38629-0904-4829-a5a3-4f539d311b18"
      }
    }
  }
};
