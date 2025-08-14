// src/components/session-related/result/MySummaryCard.tsx
import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';

export function msToClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function MySummaryCard({
  stayMs,
  xp,
  coins,
  rank,
  plannedMs,
  title = 'あなたの滞在時間',
}: {
  stayMs: number;
  xp: number;
  coins: number;
  rank?: number;
  plannedMs?: number;
  title?: string;
}) {
  return (
    <View
      className="mt-4 rounded-2xl bg-white/95 dark:bg-neutral-900/70 px-4 py-3"
      style={{
        ...(Platform.OS === 'android'
          ? { elevation: 1 }
          : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }),
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[12px] text-neutral-600 dark:text-neutral-300">{title}</Text>
          <Text className="text-neutral-900 dark:text-white text-3xl font-extrabold mt-1">
            {msToClock(stayMs)}
          </Text>
          <View className="mt-2">
            <ProgressBar value={plannedMs ? (stayMs / plannedMs) * 100 : 0} />
          </View>
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <Ionicons name="sparkles-outline" size={16} color="#111827" />
            <Text className="ml-1 text-neutral-900 dark:text-white text-xl font-bold">+{xp}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Ionicons name="logo-bitcoin" size={16} color="#111827" />
            <Text className="ml-1 text-neutral-800 dark:text-neutral-100 text-base font-semibold">+{coins}</Text>
          </View>
          {rank ? (
            <View className="mt-1 rounded-full bg-amber-100 px-2 py-0.5">
              <Text className="text-amber-700 text-[12px] font-semibold">Rank {rank}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
