// src/components/eduAI-related/ChatMessages.tsx
import React, { useEffect, useRef } from 'react';
import { FlatList, Text, View, Keyboard, Pressable } from 'react-native';
import TypingDots from './tutorAI/TypingDots';
import type { EduAIMessage } from '@/storage/eduAIStorage';

type Props = {
  data: EduAIMessage[];
  onLongPress?: (m: EduAIMessage) => void;
  typing?: boolean;
  typingAgent?: 'tutor'|'counselor'|'planner'|null;
};

export default function ChatMessages({ data, onLongPress, typing, typingAgent }: Props) {
  const listRef = useRef<FlatList<EduAIMessage>>(null);

  // 入場時に最下部へ
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(t);
  }, []);

  // 追記のたびに最下部へ
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [data.length, typing]);

  const Bubble = ({ m }: { m: EduAIMessage }) => {
    const isUser = m.role === 'user';
    const bg = isUser ? '#2563eb' : '#e5e7eb';
    const color = isUser ? 'white' : '#0f172a';

    return (
      <View className={`px-3 ${isUser ? 'items-end' : 'items-start'}`}>
        <Pressable
          onLongPress={onLongPress ? () => onLongPress(m) : undefined}
          android_ripple={isUser ? undefined : { color: '#d1d5db' }}
          className="max-w-[82%] px-3 py-2 rounded-2xl my-1"
          style={{ backgroundColor: bg }}
        >
          <Text style={{ color }}>{m.content}</Text>
          {m.agent && m.role === 'assistant' && (
            <Text
              className="text-[11px] mt-1"
              style={{ color: isUser ? 'rgba(255,255,255,0.7)' : '#6b7280' }}
            >
              {m.agent === 'tutor'
                ? '家庭教師'
                : m.agent === 'counselor'
                ? '進路カウンセラー'
                : '学習計画'}
            </Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <Bubble m={item} />}
      contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => Keyboard.dismiss()}
      onTouchStart={() => Keyboard.dismiss()}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      initialNumToRender={20}
      windowSize={10}
      removeClippedSubviews
      ListFooterComponent={
        typing ? (
          <View className="px-3 items-start">
            <View className="max-w-[68%] px-3 py-2 rounded-2xl my-1 bg-[#e5e7eb]">
              <TypingDots />
              {typingAgent ? (
                <Text className="text-[11px] mt-1 text-neutral-500">
                  {typingAgent === 'tutor'
                    ? '家庭教師'
                    : typingAgent === 'counselor'
                    ? '進路カウンセラー'
                    : '学習計画'}{' '}
                  が作成中…
                </Text>
              ) : null}
            </View>
          </View>
        ) : null
      }
    />
  );
}
