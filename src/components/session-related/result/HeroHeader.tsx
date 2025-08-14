// src/components/session-related/result/HeroHeader.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatChip from './StatChip';

export default function HeroHeader({
  roomName,
  roomTag,
  minutes,
  membersCount,
  timeLabel,
}: {
  roomName: string;
  roomTag?: string;
  minutes?: number | null;
  membersCount?: number | null;
  timeLabel?: string | null;
}) {
  const tag = roomTag ? `#${roomTag}` : '#general';

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#10b981' }}>
      <LinearGradient
        colors={['#34d399', '#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-5 pt-2 pb-8"
      >
        {/* タイトル行：左にルーム名、右にハッシュタグ */}
        <View className="flex-row items-end justify-between">
          <Text className="text-white font-extrabold text-[26px] leading-[30px] px-6 pt-2" numberOfLines={1}>
            {roomName}
          </Text>
          <View className="px-2 py-1 rounded-full bg-white/15 border border-white/25">
            <Text className="text-white/90 text-[11px]">{tag}</Text>
          </View>
        </View>

        {/* ステータス行：見やすい間隔＆折返し対応 */}
        <View className="mt-2 pb-2 px-2 flex-row flex-wrap gap-x-3 gap-y-2">
          <StatChip icon={<Ionicons name="time-outline" size={16} color="#111827" />} label={`${minutes ?? 0}分`} />
          <StatChip icon={<Ionicons name="people-outline" size={16} color="#111827" />} label={`${membersCount ?? 0}人`} />
          {timeLabel ? (
            <StatChip icon={<Ionicons name="calendar-outline" size={16} color="#111827" />} label={timeLabel} />
          ) : null}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
