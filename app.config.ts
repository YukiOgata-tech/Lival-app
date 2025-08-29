import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
    name: "digital-detox-app",
    slug: "digital-detox-app",
    owner: "yukiogata_411",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    jsEngine: "hermes",
    splash: {
      image: "./assets/Lival-icon-clearBG.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yukiogata.lival",
      "infoPlist": {
        NSUserNotificationUsageDescription: "セッション終了時に通知をお送りします。",
        NSCameraUsageDescription: '問題を撮影して質問するために使用します',
        NSPhotoLibraryUsageDescription: '写真へのアクセスを許可してください。',
        NSPhotoLibraryAddUsageDescription: '写真への保存を許可してください。',
        NSMicrophoneUsageDescription: "テキスト入力時に、マイクの使用が必要です。"
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/lival-icon_1024x1024.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yukiogata.lival",
      edgeToEdgeEnabled: true,
      windowSoftInputMode: 'adjustResize',
      permissions: ['CAMERA', 'READ_MEDIA_IMAGES', 'POST_NOTIFICATIONS']
    },
    web: {
      favicon: "./assets/Lival-text.png"
    },
    plugins: [
      "expo-router",
      ['expo-image-picker', {
      photosPermission: '学習の質問に画像を添付するために、写真へのアクセスを許可してください。',
      cameraPermission: '問題の写真を撮影するために、カメラのアクセスを許可してください。',
      microphonePermission: 'テキスト音声入力をするためにマイクを許可してください。'
      }],
      ['expo-camera', {
        cameraPermission: '学習記録用の書籍バーコードスキャンのためカメラを使用します。'
      }],
      ['expo-build-properties', {
      ios: { newArchEnabled: true },
      android: { newArchEnabled: true },
    }],
    ['expo-notifications', { icon: './assets/icon.png', color: '#3B82F6' }],
    ],
    scheme: "lival",
    extra: {
      EXPO_PUBLIC_ALGOLIA_APP_ID: "WGDFHUPOIV",
      EXPO_PUBLIC_ALGOLIA_SEARCH_KEY: "e7d947c6c7992e91f3e527b7c73b126e",
      router: {},
      eas: {
        projectId: "cce38629-0904-4829-a5a3-4f539d311b18"
      }
    }
});
