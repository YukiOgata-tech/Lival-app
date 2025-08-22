// src/components/eduAI-related/threads-parts/CenterGuide.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles, Wand2 } from 'lucide-react-native';

type Props = {
  title?: string;
  subtitle?: string;
};

export default function CenterGuide({
  title = 'Unified AI Hub',
  subtitle = '左にスワイプ: キャラクターAI ／ 右にスワイプ: AI TOOLS',
}: Props) {
  return (
    <View pointerEvents="none" className="items-center w-full px-6">
      {/* タイトル・説明 */}
      <View className="w-full max-w-[520px] rounded-3xl px-5 py-6 bg-white/8 border border-white/15 backdrop-blur-md">
        <Text className="text-[22px] font-extrabold text-white tracking-wide">{title}</Text>
        <Text className="text-white/75 mt-2 leading-5">{subtitle}</Text>

        {/* 機能チップ */}
        <View className="flex-row gap-3 mt-4">
          <View className="flex-row items-center px-3 py-2 rounded-full bg-cyan-500/15 border border-cyan-400/30">
            <Sparkles size={16} color="#22d3ee" />
            <Text className="ml-2 text-cyan-100 text-[12px]">キャラクターAI（学習/相談/計画）</Text>
          </View>
          <View className="flex-row items-center px-3 py-2 rounded-full bg-lime-500/15 border border-lime-400/30">
            <Wand2 size={16} color="#a3e635" />
            <Text className="ml-2 text-lime-100 text-[12px]">AI TOOLS（OCR/翻訳 ほか）</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
