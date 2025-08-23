// src/components/AItools-related/AItoolsLoading.tsx
import { View, Image } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

export default function AItoolsLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <Image
        source={require('@assets/images/Lival-text.png')}
        style={{ width: 80, height: 80, opacity: 0.9 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#3ba2e3" style={{ marginTop: 24 }} />
    </View>
  );
}
