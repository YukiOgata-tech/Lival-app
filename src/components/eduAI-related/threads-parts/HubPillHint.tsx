// src/components/eduAI-related/threads-parts/HubPillHint.tsx
import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  text: string;
};

export default function HubPillHint({ text }: Props) {
  return (
    <View
      className="px-3 py-2 rounded-full bg-white/8 border border-white/15"
      style={{
        alignSelf: 'center',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
      }}
    >
      <Text className="text-[11px] text-white/90">{text}</Text>
    </View>
  );
}
