// src/components/eduAI-related/ChatInput.tsx
import React from 'react';
import { View, TextInput, Pressable, Text, NativeSyntheticEvent, TextInputSubmitEditingEventData } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  value: string;
  onChange: (t: string) => void;
  onSend: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

export default function ChatInput({ value, onChange, onSend, placeholder, autoFocus, disabled }: Props) {
  const insets = useSafeAreaInsets();
  const sendDisabled = disabled ?? value.trim().length === 0;

  const doSend = () => { if (!sendDisabled) onSend(); };
  const onSubmit = (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => doSend();

  return (
    <View
      className="border-t border-neutral-200 bg-white"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      <View className="flex-row items-center px-4 py-3">
        <TextInput
          className="flex-1 bg-neutral-100 rounded-xl px-3 py-2"
          placeholder={placeholder ?? 'メッセージを入力'}
          value={value}
          onChangeText={onChange}
          multiline={false}
          blurOnSubmit
          returnKeyType="send"
          enablesReturnKeyAutomatically
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
        />
        <Pressable
          onPress={doSend}
          disabled={sendDisabled}
          className={`ml-2 px-4 py-2 rounded-xl ${sendDisabled ? 'bg-neutral-300' : 'bg-blue-600'}`}
          accessibilityRole="button"
          accessibilityLabel="送信"
          hitSlop={8}
        >
          <Text className="text-white font-semibold">送信</Text>
        </Pressable>
      </View>
    </View>
  );
}
