// src/components/session-related/RoomChatMessageBubble.tsx
import React from 'react';
import { View, Text } from 'react-native';
import type { ChatMessageType } from './chat/MessageTypes';

type Props = {
  text: string;
  type: ChatMessageType;
  isSelf?: boolean;
};

export default function RoomChatMessageBubble({ text, type, isSelf }: Props) {
  if (type === 'log') {
    return (
      <View className="w-full items-center my-1">
        <View className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <Text className="text-[12px] text-neutral-500 dark:text-neutral-300">{text}</Text>
        </View>
      </View>
    );
  }

  // AIは常に相手側扱い
  const isAi = type === 'ai';
  const align = isAi ? 'items-start' : (isSelf ? 'items-end' : 'items-start');
  const bubble =
    isAi
      ? 'bg-purple-500'
      : isSelf
        ? 'bg-blue-500'
        : 'bg-neutral-200 dark:bg-neutral-700';
  const textColor = isAi || isSelf ? 'text-white' : 'text-neutral-900 dark:text-neutral-100';

  return (
    <View className={`w-full my-1 ${align}`}>
      <View className={`max-w-[82%] px-3 py-2 rounded-2xl ${bubble}`}>
        <Text className={`${textColor} text-[14px] leading-5`}>{text}</Text>
      </View>
    </View>
  );
}
