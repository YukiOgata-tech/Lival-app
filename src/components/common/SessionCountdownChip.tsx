import React from 'react';
import { View, Text } from 'react-native';
import { useSessionCountdown, SessionTimeSource } from '@/hooks/useSessionCountdown';

export default function SessionCountdownChip({ time }: { time: SessionTimeSource }) {
  const { clock, progress, isOver } = useSessionCountdown(time);

  return (
    <View className="flex-row items-center gap-2">
      <View className="rounded-full px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800">
        <Text className="text-[12px] text-neutral-700 dark:text-neutral-200">
          残り {clock}
        </Text>
      </View>
      {/* 細いプログレス（目立たせない） */}
      <View className="h-[4px] w-20 rounded bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        {(() => {
     const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress * 100))) : 0;
     return (
       <View
         className="h-full bg-emerald-500 dark:bg-emerald-400"
         style={{ width: `${pct}%` }}
       />
     );
   })()}
      </View>
      {isOver && (
        <View className="rounded-full px-2 py-0.5 bg-red-50 dark:bg-red-900/30">
          <Text className="text-[10px] text-red-600 dark:text-red-300">終了</Text>
        </View>
      )}
    </View>
  );
}