// src/components/eduAI-related/threads-parts/ThreadCard.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import type { EduAIThread } from '@/storage/eduAIStorage';

const BADGE = {
  tutor:      { ring: 'ring-blue-500',     bgDot: 'bg-blue-500',     bg: 'bg-blue-50',     label: '家庭教師' },
  counselor:  { ring: 'ring-emerald-500',  bgDot: 'bg-emerald-500',  bg: 'bg-emerald-50',  label: '進路カウンセラー' },
  planner:    { ring: 'ring-violet-500',   bgDot: 'bg-violet-500',   bg: 'bg-violet-50',   label: '学習計画' },
  null:       { ring: 'ring-slate-400',    bgDot: 'bg-slate-500',    bg: 'bg-slate-50',    label: '未確定' },
} as const;

type Props = {
  thread: EduAIThread;
  onPress: () => void;
  onMore: () => void;
};

export default function ThreadCard({ thread, onPress, onMore }: Props) {
  const key = (thread.agent ?? 'null') as keyof typeof BADGE;
  const b = BADGE[key];

  return (
    <Pressable onPress={onPress} className="px-4">
      <View
        className={`mt-3 rounded-2xl ${b.bg} border border-white/60 ring-1 ${b.ring} shadow-md`}
        style={{ overflow: 'hidden' }}
      >
        <View className="flex-row items-center px-4 pt-3">
          <View className={`w-2 h-2 rounded-full mr-2 ${b.bgDot}`} />
          <Text className="text-xs text-neutral-500">
            {b.label}
            <Text className="text-neutral-400">
              {'  ・  '}
              {new Date(thread.updatedAt || 0).toLocaleString()}
            </Text>
          </Text>
          <Pressable onPress={onMore} hitSlop={10} className="ml-auto p-2 -mr-2">
            <MoreHorizontal size={18} color="#6b7280" />
          </Pressable>
        </View>

        <View className="px-4 py-3">
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {thread.title}
          </Text>
          {!!thread.lastMessagePreview && (
            <Text className="text-[12px] text-neutral-600 mt-1" numberOfLines={2}>
              {thread.lastMessagePreview}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
