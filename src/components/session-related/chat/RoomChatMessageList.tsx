// src/components/session-related/chat/RoomChatMessageList.tsx
import React, { useEffect, useRef } from 'react';
import { FlatList, View, Text, ActivityIndicator } from 'react-native';
import RoomChatMessageBubble from './RoomChatMessageBubble';
import type { ChatMessage } from './MessageTypes';

type Props = {
  messages: ChatMessage[];
  myUserId?: string;
  loading?: boolean; // ★追加
};

export default function RoomChatMessageList({ messages, myUserId, loading }: Props) {
  const ref = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    ref.current?.scrollToEnd({ animated: true });
  }, [messages.length, loading]);

  return (
    <FlatList
      ref={ref}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) =>
        item.type === 'log' ? (
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
      contentContainerStyle={{ paddingBottom: 88, paddingTop: 8, paddingHorizontal: 12 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View className="mt-6 items-center">
          <Text className="text-gray-400">メッセージがありません</Text>
        </View>
      }
      ListFooterComponent={
        loading ? (
          <View className="w-full my-1 items-start px-3">
            <View className="max-w-[82%] px-3 py-2 rounded-2xl bg-purple-500/95">
              <View className="flex-row items-center gap-2">
                <ActivityIndicator />
                <Text className="text-white text-[14px]">AIが回答を生成中…</Text>
              </View>
            </View>
          </View>
        ) : null
      }
    />
  );
}
