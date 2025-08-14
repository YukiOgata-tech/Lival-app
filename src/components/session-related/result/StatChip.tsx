// src/components/session-related/result/StatChip.tsx
import React from 'react';
import { View, Text, Platform } from 'react-native';

export default function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View
      className="flex-row items-center rounded-full px-3 py-1 bg-white/90 dark:bg-neutral-900/60"
      style={{
        ...(Platform.OS === 'android'
          ? { elevation: 1 }
          : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }),
      }}
    >
      <View className="mr-1.5">{icon}</View>
      <Text className="text-[12px] text-neutral-800 dark:text-neutral-200">{label}</Text>
    </View>
  );
}
