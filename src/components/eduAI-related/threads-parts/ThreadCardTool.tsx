// src/components/threads-parts/ThreadCardTool.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';

type ToolThread = {
  id: string;
  type: 'ocr' | 'translation' | string;
  title: string;
  messages?: Array<{ content?: string; role?: string }>;
  updatedAt?: number;
};

type Props = {
  thread: ToolThread;
  onPress: () => void;
  onMore: () => void;
};

const BADGE = {
  ocr:          { dot: '#84cc16',  bg: '#ecfccb', label: 'OCR' },
  translation:  { dot: '#38bdf8',  bg: '#e0f2fe', label: '翻訳' },
  default:      { dot: '#94a3b8',  bg: '#e5e7eb', label: 'Tool' },
} as const;

export default function ThreadCardTool({ thread, onPress, onMore }: Props) {
  const b = (BADGE as any)[thread.type] ?? BADGE.default;
  const preview = (() => {
    const msgs = thread.messages ?? [];
    const last = msgs[msgs.length - 1];
    return (last?.content ?? '').slice(0, 60);
  })();

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-80">
      <View className="rounded-2xl bg-white border border-neutral-200 overflow-hidden">
        <View className="px-4 py-2 flex-row items-center border-b border-neutral-200">
          <View className="flex-row items-center">
            <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: b.dot }} />
            <Text className="ml-2 text-[12px] font-semibold" style={{ color: '#111827' }}>
              {b.label}
            </Text>
            <Text className="ml-2 text-[11px] text-neutral-500">
              {new Date(thread.updatedAt || 0).toLocaleString()}
            </Text>
          </View>
          <Pressable onPress={onMore} hitSlop={10} className="ml-auto p-2 -mr-2">
            <MoreHorizontal size={18} color="#6b7280" />
          </Pressable>
        </View>

        <View className="px-4 py-3">
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {thread.title}
          </Text>
          {!!preview && (
            <Text className="text-[12px] text-neutral-600 mt-1" numberOfLines={2}>
              {preview}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
