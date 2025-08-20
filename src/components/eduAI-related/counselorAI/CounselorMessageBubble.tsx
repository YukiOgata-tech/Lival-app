// src/components/eduAI-related/counselorAI/CounselorMessageBubble.tsx
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import type { EduAIMessage, EduAITag } from '@/storage/eduAIStorage';
import { TAGS, UNKNOWN_TAG } from '@/constants/eduAITags';
import TypewriterText from '@/components/animations/TypewriterText';
import CounselorLinkifiedText from './CounselorLinkifiedText';
import CounselorHighlightSweep from './CounselorHighlightSweep';

export type CounselorMessageBubbleProps = {
  message: EduAIMessage & { tags?: EduAITag[] };
  onLongPress?: (m: EduAIMessage & { tags?: EduAITag[] }) => void;
  /** このバブルでタイプライターを有効にするか（親の制御） */
  isTypewriter?: boolean;
  /** タイプライター完了時に親へ通知（親でIDクリア用） */
  onTypewriterDone?: () => void;
};

export default function CounselorMessageBubble({
  message: m,
  onLongPress,
  isTypewriter,
  onTypewriterDone,
}: CounselorMessageBubbleProps) {
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

  // アシスタント到着時に一度だけスイープ
  const [sweepOnce, setSweepOnce] = useState(false);
  useEffect(() => {
    if (!isUser) setSweepOnce(true);
  }, [isUser]);

  return (
    <Container>
      <Pressable
        onLongPress={onLongPress ? () => onLongPress(m) : undefined}
        android_ripple={isUser ? undefined : { color: '#c7d2fe' }}
        className={`max-w-[82%] px-3 py-2 my-1 rounded-2xl border overflow-hidden ${
          isUser ? 'bg-blue-600 border-blue-600' : 'bg-counselor-50 border-counselor-200'
        }`}
      >
        {/* スイープ（assistantのみ） */}
        {!isUser && <CounselorHighlightSweep run={sweepOnce} />}

        {/* 本文：必要なときだけタイプライター */}
        {!isUser && isTypewriter ? (
          <TypewriterText text={m.content ?? ''} variant="assistant" speed={30} onDone={onTypewriterDone} />
        ) : (
          <CounselorLinkifiedText text={m.content ?? ''} variant={isUser ? 'user' : 'assistant'} />
        )}

        {/* 発話者ラベル */}
        {m.role === 'assistant' && (
          <Text className={`text-[11px] mt-1 ${isUser ? 'text-white/70' : 'text-counselor-700'}`}>進路カウンセラー</Text>
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
                  <Text className="text-[10px]" style={{ color: spec.fg }}>
                    {spec.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </Pressable>
    </Container>
  );
}
