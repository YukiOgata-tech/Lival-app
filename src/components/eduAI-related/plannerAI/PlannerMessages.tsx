import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import type { EduAIMessage, EduAITag } from '@/storage/eduAIStorage';
import PlannerMessageBubble from './PlannerMessageBubble';

const LOADING_ANIM = require('@assets/lotties/loading-animation.json');
const INIT_LOADING_MS = 500;

type Props = {
  data: (EduAIMessage & { tags?: EduAITag[] })[];
  onLongPress?: (m: EduAIMessage & { tags?: EduAITag[] }) => void;
  typing?: boolean;
  /** このIDのメッセージだけタイプライター表示（履歴再入場で再発火しない） */
  typewriterMessageId?: string | null;
  /** タイプライター完了時に親へ通知（親側でIDをnullにして再入場発火を防止） */
  onTypewriterDone?: () => void;
};

export default function PlannerMessages({
  data,
  onLongPress,
  typing,
  typewriterMessageId,
  onTypewriterDone,
}: Props) {
  const listRef = useRef<FlatList<EduAIMessage>>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const lottieRef = useRef<LottieView>(null);

  // 初回だけ強制ローディング
  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), INIT_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  // Lottie をクリーンに再生
  useEffect(() => {
    if (typing || initialLoading) {
      lottieRef.current?.reset?.();
      lottieRef.current?.play?.();
    }
  }, [typing, initialLoading]);

  // 自動スクロール
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [data.length, typing, initialLoading]);

  const showLoading = typing || initialLoading;

  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => (
        <PlannerMessageBubble
          message={item as any}
          onLongPress={onLongPress}
          isTypewriter={item.role === 'assistant' && !!typewriterMessageId && item.id === typewriterMessageId}
          onTypewriterDone={onTypewriterDone}
        />
      )}
      contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => Keyboard.dismiss()}
      onTouchStart={() => Keyboard.dismiss()}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      initialNumToRender={20}
      windowSize={10}
      removeClippedSubviews
      ListFooterComponent={
        showLoading ? (
          <View className="px-3 items-start">
            <View className="max-w-[68%] px-3 py-2 my-1 rounded-2xl bg-violet-50 border border-violet-200">
              <LottieView
                key={`planner-loading-${initialLoading ? 'init' : 'typing'}`}
                ref={lottieRef}
                source={LOADING_ANIM}
                autoPlay
                loop
                style={{ width: 64, height: 64 }}
              />
              <Text className="text-[11px] mt-1 text-violet-700">学習計画 が作成中…</Text>
            </View>
          </View>
        ) : null
      }
    />
  );
}
