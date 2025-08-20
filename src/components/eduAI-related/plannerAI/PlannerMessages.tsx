// src/components/eduAI-related/plannerAI/PlannerMessages.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Keyboard, Pressable, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import type { EduAIMessage, EduAITag } from '@/storage/eduAIStorage';
import { TAGS, UNKNOWN_TAG } from '@/constants/eduAITags';

const LOADING_ANIM = require('@assets/lotties/loading-animation.json');
const INIT_LOADING_MS = 500;

type Props = {
  data: (EduAIMessage & { tags?: EduAITag[] })[];
  onLongPress?: (m: EduAIMessage & { tags?: EduAITag[] }) => void;
  typing?: boolean;
};

export default function PlannerMessages({ data, onLongPress, typing }: Props) {
  const listRef = useRef<FlatList<EduAIMessage>>(null);

  // --- 初期強制ローディング ---
  const [initialLoading, setInitialLoading] = useState(true);
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), INIT_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  // Lottie再生を常にクリーンに開始
  useEffect(() => {
    if (typing || initialLoading) {
      lottieRef.current?.reset?.();
      lottieRef.current?.play?.();
    }
  }, [typing, initialLoading]);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [data.length, typing, initialLoading]);

  const Bubble = ({ m }: { m: EduAIMessage & { tags?: EduAITag[] } }) => {
    const isUser = m.role === 'user';
    const scale = useRef(new Animated.Value(0.96)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (!isUser) {
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isUser, opacity, scale]);

    const Container = ({ children }: { children: React.ReactNode }) =>
      isUser ? (
        <View className="px-3 items-end">{children}</View>
      ) : (
        <Animated.View
          className="px-3 items-start"
          style={{ transform: [{ scale }], opacity }}
        >
          {children}
        </Animated.View>
      );

    return (
      <Container>
        <Pressable
          onLongPress={onLongPress ? () => onLongPress(m) : undefined}
          android_ripple={isUser ? undefined : { color: '#a7f3d0' }} // emerald-200
          className={`max-w-[82%] px-3 py-2 my-1 rounded-2xl border ${
            isUser ? 'bg-blue-600 border-blue-600' : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <Text className={isUser ? 'text-white' : 'text-neutral-900'}>{m.content}</Text>

          {m.role === 'assistant' && (
            <Text
              className={`text-[11px] mt-1 ${
                isUser ? 'text-white/70' : 'text-emerald-700'
              }`}
            >
              学習計画
            </Text>
          )}

          {/* タグバッジ */}
          {m.tags?.length ? (
            <View className="flex-row flex-wrap mt-1">
              {m.tags.map((k) => {
                const spec = TAGS[k as keyof typeof TAGS] ?? UNKNOWN_TAG;
                return (
                  <View
                    key={k}
                    className="px-2 py-1 mr-1 mt-1 rounded-full border"
                    style={{ backgroundColor: spec.bg, borderColor: spec.border }}
                  >
                    <Text className="text-[10px]" style={{ color: spec.fg }}>{spec.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Container>
    );
  };

  const showLoading = typing || initialLoading;

  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <Bubble m={item as any} />}
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
            <View className="max-w-[68%] px-3 py-2 my-1 rounded-2xl bg-emerald-50 border border-emerald-200">
              <LottieView
                key={`planner-loading-${initialLoading ? 'init' : 'typing'}`}
                ref={lottieRef}
                source={LOADING_ANIM}
                autoPlay
                loop
                style={{ width: 64, height: 64 }}
              />
              <Text className="text-[11px] mt-1 text-emerald-700">学習計画 が作成中…</Text>
            </View>
          </View>
        ) : null
      }
    />
  );
}
