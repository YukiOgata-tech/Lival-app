// src/components/session-related/result/ProgressBar.tsx
import React from 'react';
import { View } from 'react-native';

export default function ProgressBar({ value }: { value: number }) {
  return (
    <View className="h-[8px] w-full rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700">
      <View className="h-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </View>
  );
}
