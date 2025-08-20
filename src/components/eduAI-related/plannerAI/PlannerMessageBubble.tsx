// src/components/eduAI-related/plannerAI/PlannerMessageBubble.tsx
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import type { EduAIMessage, EduAITag } from '@/storage/eduAIStorage';
import { TAGS, UNKNOWN_TAG } from '@/constants/eduAITags';
import TypewriterText from '@/components/animations/TypewriterText';
import PlannerLinkifiedText from './PlannerLinkifiedText';
import PlannerHighlightSweep from './PlannerHighlightSweep';

export type PlannerMessageBubbleProps = {
  message: EduAIMessage & { tags?: EduAITag[] };
  onLongPress?: (m: EduAIMessage & { tags?: EduAITag[] }) => void;
  isTypewriter?: boolean;
  onTypewriterDone?: () => void;
};

export default function PlannerMessageBubble({
  message: m,
  onLongPress,
  isTypewriter,
  onTypewriterDone,
}: PlannerMessageBubbleProps) {
  const isUser = m.role === 'user';

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    isUser ? (
      <Animated.View className="px-3 items-end" entering={FadeInRight.springify().mass(0.6).damping(16)}>
        {children}
      </Animated.View>
    ) : (
      <Animated.View className="px-3 items-start" entering={FadeInDown.springify().mass(0.7).damping(15)}>
        {children}
      </Animated.View>
    );

  const [sweepOnce, setSweepOnce] = useState(false);
  useEffect(() => {
    if (!isUser) setSweepOnce(true);
  }, [isUser]);

  return (
    <Container>
      <Pressable
        onLongPress={onLongPress ? () => onLongPress(m) : undefined}
        android_ripple={isUser ? undefined : { color: '#ddd6fe' }} // violet-200
        className={`max-w-[82%] px-3 py-2 my-1 rounded-2xl border overflow-hidden ${
          isUser ? 'bg-blue-600 border-blue-600' : 'bg-violet-50 border-violet-200'
        }`}
      >
        {/* スイープ（assistantのみ） */}
        {!isUser && <PlannerHighlightSweep run={sweepOnce} />}

        {/* 本文：必要なときだけタイプライター */}
        {!isUser && isTypewriter ? (
          <TypewriterText text={m.content ?? ''} variant="assistant" speed={30} onDone={onTypewriterDone} />
        ) : (
          <PlannerLinkifiedText text={m.content ?? ''} variant={isUser ? 'user' : 'assistant'} />
        )}

        {/* 発話者ラベル */}
        {m.role === 'assistant' && (
          <Text className={`text-[11px] mt-1 ${isUser ? 'text-white/70' : 'text-violet-700'}`}>学習計画</Text>
        )}

        {/* タグ */}
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
}
