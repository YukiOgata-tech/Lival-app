// src/components/eduAI-related/threads-parts/BottomHubBar.tsx
import React from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

export type Lane = 'center' | 'agent' | 'tool';

type Props = {
  lane: Lane;
  onBackCenter: () => void;          // 中央へ戻るハンドラ
  align?: 'left' | 'center';         // レーン時は left 推奨
};

export default function BottomHubBar({
  lane,
  onBackCenter,
  align = 'left',
}: Props) {
  const insets = useSafeAreaInsets();

  // 中央時は非表示
  if (lane === 'center') return null;

  // 配置（左寄せ or 中央寄せ）
  const alignStyle: ViewStyle =
    align === 'center'
      ? { alignSelf: 'center', marginHorizontal: 0 }
      : { alignSelf: 'flex-start', marginLeft: 16 };

  // 現在のレーンに応じて矢印方向を変える
  // agent(左) → 中央へ戻るには右向き矢印
  // tool(右)  → 中央へ戻るには左向き矢印
  const ArrowIcon = lane === 'agent' ? ArrowRight : ArrowLeft;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 12 + insets.bottom,
        zIndex: 5,
      }}
    >
      <View
        className="flex-row items-center rounded-full bg-white/12 border border-white/20 backdrop-blur-md"
        style={[{ paddingVertical: 8, paddingHorizontal: 10, gap: 8 }, alignStyle]}
      >
        <Pressable
          onPress={onBackCenter}
          accessibilityRole="button"
          accessibilityLabel="中央へ戻る"
          hitSlop={8}
          className="flex-row items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/20 active:opacity-80"
        >
          <ArrowIcon size={16} color="#e5e7eb" />
          <Text className="ml-2 text-[12px] text-white/90">中央へ戻る</Text>
        </Pressable>
      </View>
    </View>
  );
}
