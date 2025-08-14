// src/components/session-related/chat/RoomChatInputBar.tsx
import React from 'react';
import { View, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
};

export default function RoomChatInputBar({
  value,
  onChangeText,
  onSend,
  disabled,
  loading,
  placeholder = 'メッセージを入力…',
}: Props) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      style={{ paddingBottom: Math.max(bottom, 8) }}
    >
      <View className="flex-row items-end px-3 pt-2 pb-1 gap-2">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 text-base"
          editable={!loading}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 44, maxHeight: 120 }}
        />
        <Button
          mode="contained"
          onPress={onSend}
          disabled={!value.trim() || disabled || loading}
          loading={loading}
          className="rounded-xl"
        >
          送信
        </Button>
      </View>
    </View>
  );
}
