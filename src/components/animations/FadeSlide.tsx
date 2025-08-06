// src/components/animations/FadeSlide.tsx
import React, { ReactNode, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  /** フェードイン完了までの時間 (ms) – default 400 */
  duration?: number;
  /** 開始遅延 (ms) – default 0 */
  delay?: number;
  /** スライド距離 (px) – 正: 下→上 / default 24 */
  from?: number;
};

export default function FadeSlide({
  children,
  duration = 400,
  delay = 0.2,
  from = 24,
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration,
      //delay,
      easing: Easing.out(Easing.exp),
    });
  }, [progress, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * from }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
