// src/components/session-related/result/PodiumTop3.tsx
import React from 'react';
import { View, Text } from 'react-native';
import ProgressBar from './ProgressBar';
import { msToClock } from './MySummaryCard';

export type RankRow = { uid: string; name?: string | null; stayMs: number };

export default function PodiumTop3({ rows, plannedMs, meUid }: {
  rows: RankRow[];
  plannedMs?: number;
  meUid?: string | null;
}) {
  const top3 = rows.slice(0, 3);
  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">TOP 3（滞在時間）</Text>
      {top3.length === 0 ? (
        <Text className="text-neutral-500 dark:text-neutral-400 mt-2">データがありません</Text>
      ) : (
        <View className="mt-3 flex-row items-end justify-between">
          {top3.map((r, i) => {
            const me = r.uid === meUid;
            const label = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            const pct = plannedMs ? Math.min(100, Math.round((r.stayMs / plannedMs) * 100)) : 0;
            return (
              <View key={r.uid} className={`flex-1 mx-1 items-center ${i === 0 ? 'mb-0' : 'mb-4'}`}>
                <Text className="text-2xl">{label}</Text>
                <Text
                  className={`mt-1 text-center text-[13px] ${me ? 'font-extrabold text-emerald-700 dark:text-emerald-300' : 'text-neutral-700 dark:text-neutral-200'}`}
                  numberOfLines={1}
                >
                  {r.name ?? r.uid.slice(0, 6)}{me ? '（あなた）' : ''}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">{msToClock(r.stayMs)}</Text>
                <View className="w-full mt-2">
                  <ProgressBar value={pct} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
