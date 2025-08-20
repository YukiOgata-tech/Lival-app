// src/components/eduAI-related/counselorAI/CounselorHighlightSweep.tsx
import React, { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

export default function CounselorHighlightSweep({ run, style }: { run: boolean; style?: ViewStyle }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (run) {
      progress.value = 0;
      progress.value = withDelay(120, withTiming(1, { duration: 650 }));
    }
  }, [run, progress]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: -60 + progress.value * 240 }],
    opacity: 0.55 * (1 - Math.abs(0.5 - progress.value) * 2),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, bottom: 0, left: -60, width: 120 }, anim, style]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(99,102,241,0.22)', 'transparent']} // indigo-500 薄光
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}
