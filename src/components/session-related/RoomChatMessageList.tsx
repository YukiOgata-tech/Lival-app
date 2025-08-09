// src/components/session-related/RoomChatMessageList.tsx
import React, { useEffect, useRef } from 'react';
import { FlatList, View, Text } from 'react-native';
import RoomChatMessageBubble from './RoomChatMessageBubble';
import type { ChatMessage } from './chat/MessageTypes';

type Props = {
  messages: ChatMessage[];
  myUserId?: string;
};

export default function RoomChatMessageList({ messages, myUserId }: Props) {
  const ref = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    ref.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <FlatList
      ref={ref}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) =>
        item.type === 'log' ? (
          // ★ ここが追加：ログはここで確実に描画（Bubble未対応でも出る）
          <View className="my-1 w-full items-center px-3">
            <Text className="px-3 py-1 rounded-full text-xs text-neutral-600 bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200">
              {item.text}
            </Text>
          </View>
        ) : (
          <RoomChatMessageBubble
            text={item.text}
            type={item.type}
            isSelf={item.userId === myUserId}
          />
        )
      }
      contentContainerStyle={{ paddingBottom: 72, paddingTop: 8, paddingHorizontal: 12 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View className="mt-6 items-center">
          <Text className="text-gray-400">メッセージがありません</Text>
        </View>
      }
    />
  );
}
