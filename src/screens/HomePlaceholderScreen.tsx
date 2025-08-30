// src/screens/HomePlaceholderScreen.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Sparkles, ArrowRight } from 'lucide-react-native';

export default function HomePlaceholderScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  return (
    <View
      className="flex-1 bg-neutral-950"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* ヘッダー */}
      <View className="px-5 py-4 border-b border-white/10">
        <Text className="text-white text-2xl font-bold">Home（仮）</Text>
        <Text className="text-white/60 text-[12px] mt-1">
          ここは暫定ホームです。後で本番のホーム画面に差し替えてください。
        </Text>
      </View>

      {/* 本文 */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="items-center">
          <Sparkles size={32} color="#a78bfa" />
          <Text className="text-white text-xl font-semibold mt-3">Lival AI Hub</Text>
          <Text className="text-white/70 text-center mt-2">
            AIツールの統合スレッドは、下のタブ
            <Text className="text-white">「AIツール」</Text>
            から利用できます。ここから直接開くこともできます。
          </Text>
        </View>

        <Pressable
          onPress={() => nav.navigate('ReceptionAI')}
          className="mt-6 px-5 py-3 rounded-2xl bg-cyan-400 active:opacity-90 flex-row items-center"
          style={{ shadowColor: '#22d3ee', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}
        >
          <Text className="text-black font-bold">受付AI（プロファイル登録）を開く</Text>
          <ArrowRight size={18} color="#000" style={{ marginLeft: 6 }} />
        </Pressable>
      </View>
    </View>
  );
}
