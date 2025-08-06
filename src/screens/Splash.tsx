// src/screens/Splash.tsx
import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

/**
 * アプリ全体の「最初の 1‒2 秒」を担当するスプラッシュ画面。
 * - ネイティブの LaunchScreen → Expo が表示
 * - フォントや Auth 状態がロード完了するまでユーザーにローディングを見せる
 * - ロード完了後に `SplashScreen.hideAsync()` を呼び、AppRouter が描画される
 */

export default function Splash() {
  const { colors } = useTheme();

  // カスタムフォントの
  const [fontsLoaded] = useFonts({
    Inter: require('../../assets/fonts/Inter-Variable.ttf'),
  });

  useEffect(() => {
    // すべてのリソースが揃ったらネイティブスプラッシュを隠す
    if (fontsLoaded) {
      (async () => {
        try {
          await SplashScreen.hideAsync();
        } catch {
          /* noop */
        }
      })();
    }
  }, [fontsLoaded]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <Image
        source={require('../../assets/Lival-icon-clearBG.png')}
        style={{ width: 120, height: 120, marginBottom: 24 }}
        resizeMode="contain"
      />
      <ActivityIndicator animating size="large" color={colors.primary} />
    </View>
  );
}
