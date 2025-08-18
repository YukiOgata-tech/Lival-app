// src/components/eduAI-related/tutorAI/TypingDots.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

export default function TypingDots({ size=6 }: { size?: number }) {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(120),
        ])
      ).start();
    loop(a1, 0); loop(a2, 120); loop(a3, 240);
  }, [a1, a2, a3]);

  const Dot = ({ v }: { v: Animated.Value }) => (
    <Animated.View
      style={{
        width: size, height: size, marginHorizontal: 3, borderRadius: 9999,
        backgroundColor: '#0ea5e9',
        transform: [{ scale: v.interpolate({ inputRange: [0,1], outputRange: [0.7,1.2] }) }],
        shadowColor: '#22d3ee',
        shadowOpacity: 0.6,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 6,
        opacity: v.interpolate({ inputRange: [0,1], outputRange: [0.6, 1] }),
      }}
    />
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
      <Dot v={a1} /><Dot v={a2} /><Dot v={a3} />
    </View>
  );
}
