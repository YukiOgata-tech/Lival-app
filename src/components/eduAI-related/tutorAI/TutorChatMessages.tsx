// src/components/eduAI-related/tutorAI/TutorChatMessages.tsx
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { FlatList, Keyboard, View, Platform } from 'react-native';
import TutorMessage from './TutorMessage';
import TypingDots from '@/components/eduAI-related/tutorAI/TypingDots';
import type { EduAITag } from '@/storage/eduAIStorage';

export type TutorRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  tags?: EduAITag[]; // ← 追加
};

type Props = {
  data: TutorRow[];
  typing?: boolean;
  onLongPress?: (row: TutorRow) => void; // ← 追加
};

export type TutorChatMessagesHandle = {
  /** 一番下（最新）までスクロール */
  scrollToLatest: (animated?: boolean) => void;
};

const TutorChatMessages = forwardRef<TutorChatMessagesHandle, Props>(
  ({ data, typing, onLongPress }: Props, ref) => {
    const listRef = useRef<FlatList<TutorRow>>(null);

    const scrollToLatest = (animated = true) => {
      listRef.current?.scrollToEnd({ animated });
    };

    useImperativeHandle(ref, () => ({ scrollToLatest }));

    // 初回マウント時
    useEffect(() => {
      const id = setTimeout(() => scrollToLatest(false), 0);
      return () => clearTimeout(id);
    }, []);

    // 件数やタイピング変化で追従
    useEffect(() => {
      const id = setTimeout(() => scrollToLatest(true), 0);
      return () => clearTimeout(id);
    }, [data.length, typing]);

    return (
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TutorMessage
            role={item.role}
            content={item.content}
            images={item.images}
            tags={item.tags}
            onLongPress={onLongPress ? () => onLongPress(item) : undefined}
          />
        )}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 106 }}
        onContentSizeChange={() => scrollToLatest(true)}
        onLayout={() => scrollToLatest(false)}
        ListFooterComponent={
          typing ? (
            <View className="px-3 items-start">
              <View className="max-w-[72%] px-3 py-2 mt-1 mb-2 rounded-2xl bg-white/10 border border-white/15">
                <TypingDots size={7} />
              </View>
            </View>
          ) : null
        }
        initialNumToRender={Math.min(20, data.length)}
      />
    );
  }
);

export default TutorChatMessages;
