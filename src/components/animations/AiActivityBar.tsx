// src/components/animations/AiActivityBar.tsx
import React, { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const ALinear = Animated.createAnimatedComponent(LinearGradient);
const SCREEN_W = Dimensions.get('window').width;

export default function AiActivityBar({ active }: { active: boolean }) {
  const x = useSharedValue(-180);

  useEffect(() => {
    if (active) {
      x.value = withRepeat(
        withTiming(SCREEN_W + 180, { duration: 1200, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      x.value = withTiming(-180, { duration: 220 });
    }
  }, [active, x]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View className="h-[3px] overflow-hidden bg-counselor-50">
      <ALinear
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        colors={['#a5b4fc', '#6366f1', '#a5b4fc']} // indigo-200 → 500 → 200
        style={[{ width: 160, height: 3, opacity: 0.85 }, style]}
      />
    </View>
  );
}
