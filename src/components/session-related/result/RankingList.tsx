// src/components/session-related/result/RankingList.tsx
import React from 'react';
import { View, Text } from 'react-native';
import ProgressBar from './ProgressBar';
import { msToClock } from './MySummaryCard';
import { RankRow } from './PodiumTop3';

export default function RankingList({ rows, plannedMs, meUid }: {
  rows: RankRow[];
  plannedMs?: number;
  meUid?: string | null;
}) {
  return (
    <View className="mt-6 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
      <View className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">全員の内訳（滞在時間）</Text>
      </View>
      {rows.map((r, idx) => {
        const me = r.uid === meUid;
        const pct = plannedMs ? Math.min(100, Math.round((r.stayMs / plannedMs) * 100)) : 0;
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
        return (
          <View
            key={r.uid}
            className={`px-4 py-3 ${idx !== rows.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''} ${me ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-3">
                <Text className="w-6 text-center">{medal}</Text>
                <View className="flex-1">
                  <Text
                    className={`text-[15px] ${me ? 'font-extrabold text-neutral-900 dark:text-white' : 'font-medium text-neutral-900 dark:text-neutral-50'}`}
                    numberOfLines={1}
                  >
                    {r.name ?? r.uid.slice(0, 6)}{me ? '（あなた）' : ''}
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{msToClock(r.stayMs)}</Text>
                </View>
              </View>
              <View className="w-[38%]">
                <ProgressBar value={pct} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
