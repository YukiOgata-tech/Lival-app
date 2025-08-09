// src/components/session-related/RoomChatInputBar.tsx
import React from 'react';
import { View, TextInput } from 'react-native';
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
  return (
    <View className="flex-row items-center px-3 pb-2 gap-2">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 rounded-xl border border-gray-300 dark:border-gray-700 text-base"
        editable={!loading}
        multiline
      />
      <Button
        mode="contained"
        onPress={onSend}
        disabled={!value.trim() || disabled || loading}
        loading={loading}
        className="rounded-xl px-4"
      >
        送信
      </Button>
    </View>
  );
}
