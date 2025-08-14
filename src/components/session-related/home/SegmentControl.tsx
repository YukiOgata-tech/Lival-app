import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

export default function SegmentControl({
  isHost,
  onFocus,
  onBreak,
  onStop,
  pending,
  activeMode,
}: {
  isHost: boolean;
  onFocus: (m?: number) => void;
  onBreak: (m?: number) => void;
  onStop: () => void;
  pending?: boolean;
  activeMode?: 'idle' | 'focus' | 'break';
}) {
  if (!isHost) return null;

  const Btn = ({
    label,
    onPress,
    active,
  }: {
    label: string;
    onPress: () => void;
    active?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={pending}
      hitSlop={8}
      className={`rounded-xl px-3 py-2 ${
        active ? 'bg-emerald-200/60 dark:bg-emerald-800/60' : 'bg-neutral-100 dark:bg-neutral-800'
      }`}
    >
      <Text className="text-[13px] text-neutral-800 dark:text-neutral-200">{label}</Text>
    </Pressable>
  );

  return (
    <View className="mx-4 mb-2 mt-1 flex-row items-center gap-8">
      <View className="flex-row flex-wrap gap-2">
        <Btn label="集中 25分" onPress={() => onFocus(25)} active={activeMode === 'focus'} />
        <Btn label="集中 50分" onPress={() => onFocus(50)} active={activeMode === 'focus'} />
        <Btn label="休憩 5分" onPress={() => onBreak(5)} active={activeMode === 'break'} />
        <Btn label="休憩 10分" onPress={() => onBreak(10)} active={activeMode === 'break'} />
      </View>

      <Pressable
        onPress={onStop}
        disabled={pending}
        hitSlop={8}
        className={`ml-auto rounded-2xl px-3 py-2 ${pending ? 'bg-red-300' : 'bg-red-500'}`}
      >
        <View className="flex-row items-center gap-2">
          {pending && <ActivityIndicator size="small" />}
          <Text className="text-[13px] text-white">{pending ? '処理中…' : '停止'}</Text>
        </View>
      </Pressable>
    </View>
  );
}
