// src/components/eduAI-related/threads-parts/CenterHero.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, Image, useWindowDimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { Sparkles, Wand2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { onOpenAgent: () => void; onOpenTools: () => void };

function SwipeHint({
  side,
  label,
  onPress,
}: {
  side: 'left' | 'right';
  label: string;
  onPress: () => void;
}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.6, 1]),
    transform: [{ translateX: interpolate(pulse.value, [0, 1], [0, side === 'left' ? -6 : 6]) }],
  }));

  return (
    <Animated.View style={anim} className="rounded-full overflow-hidden">
      <Pressable onPress={onPress} hitSlop={8} className="flex-row items-center px-4 py-2 rounded-full bg-slate-200/90">
        {side === 'left' ? <ChevronLeft size={22} color="#334155" /> : <ChevronRight size={22} color="#334155" />}
        <Text className="ml-1.5 text-[13px] font-semibold text-slate-700">{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CenterHero({ onOpenAgent, onOpenTools }: Props) {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 端末安全域も加味した左右ガター（見切れ防止の決め手）
  const gutter = Math.max(16, Math.max(insets.left, insets.right) + 8);

  const MAX_CONTENT_W = 560;
  const contentW = Math.min(W - gutter * 2, MAX_CONTENT_W);
  const isCompact = contentW < 360; // 360 未満なら縦積み

  // ロゴ / オーブ
  const logoW = Math.min(contentW * 0.62, 260);
  const logoH = Math.round(logoW * 0.24);
  const orb = Math.min(160, Math.floor(contentW * 0.42));
  const ringSize = orb + 22;

  // 中央オーブのパルス
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true);
  }, []);
  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.3]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.28, 0]),
  }));

  return (
    <View
      pointerEvents="box-none"
      className="w-full items-center self-center"
      style={{ maxWidth: MAX_CONTENT_W, paddingHorizontal: gutter }}
    >
      {/* ロゴ */}
      <Image
        source={require('@assets/images/header-Lival.png')}
        resizeMode="contain"
        style={{ width: logoW, height: logoH }}
        className="mb-2"
      />

      {/* リード文：親幅いっぱい + 明示改行 + 最小幅0で折り返し確実 */}
      <Text
        className="self-stretch text-center text-slate-700 text-[13px] leading-5 px-1 mb-3"
        numberOfLines={3}
        adjustsFontSizeToFit
        minimumFontScale={0.95}
      >
        3種類から学習に最適なAIを選べます。{'\n'}
        左へスワイプで エージェントAI（講師AI／進路相談／学習プラン）{'\n'}
        右へスワイプで AI TOOLS。
      </Text>

      {/* 中央オーブ */}
      <View className="items-center justify-center my-2">
        <Animated.View
          style={[{ width: ringSize, height: ringSize }, ring]}
          className="absolute rounded-full bg-indigo-500 shadow-lg"
        />
        <View
          style={{ width: orb, height: orb, borderRadius: orb / 2 }}
          className="overflow-hidden items-center justify-center bg-slate-900"
        >
          <LottieView
            autoPlay
            loop
            source={require('@assets/lotties/sandy-loading.json')}
            style={{ width: orb, height: orb }}
          />
        </View>
      </View>

      {/* スワイプ誘導ピル */}
      <View className="mt-3 flex-row items-center justify-center">
        <SwipeHint side="left" label="左へスワイプ" onPress={onOpenAgent} />
        <View className="w-3" />
        <SwipeHint side="right" label="右へスワイプ" onPress={onOpenTools} />
      </View>

      {/* カード群：左右見切れ防止（self-stretch + gap + min-w-0） */}
      <View className={`self-stretch mt-4 items-stretch ${isCompact ? 'flex-col' : 'flex-row'}`}>
        {/* エージェントAI */}
        <Pressable
          onPress={onOpenAgent}
          className={`rounded-2xl overflow-hidden border border-slate-300/60 bg-white/10 min-w-0 ${
            isCompact ? 'w-full mb-3' : 'flex-1 mr-2'
          }`}
        >
          <BlurView intensity={22} tint="default" style={StyleSheet.absoluteFillObject} />
          <View className="px-4 py-3">
            <View className="flex-row items-center mb-2 min-w-0">
              <Sparkles size={20} color="#22d3ee" />
              <Text className="ml-2 font-bold text-slate-900" numberOfLines={1}>
                エージェントAI
              </Text>
            </View>
            <Text className="text-[12px] leading-[18px] text-slate-600">
              会話で学びを深掘りする{'\n'}家庭教師・進路カウンセラー・学習プランナー。
            </Text>
          </View>
        </Pressable>

        {/* AI TOOLS */}
        <Pressable
          onPress={onOpenTools}
          className={`rounded-2xl overflow-hidden border border-slate-300/60 bg-white/10 min-w-0 ${
            isCompact ? 'w-full' : 'flex-1 ml-2'
          }`}
        >
          <BlurView intensity={22} tint="default" style={StyleSheet.absoluteFillObject} />
          <View className="px-4 py-3">
            <View className="flex-row items-center mb-2 min-w-0">
              <Wand2 size={20} color="#a3e635" />
              <Text className="ml-2 font-bold text-slate-900" numberOfLines={1}>
                AI TOOLS
              </Text>
            </View>
            <Text className="text-[12px] leading-[18px] text-slate-600">
              画像OCR・翻訳などの実用ツール。{'\n'}必要な処理をサッと実行。
            </Text>
          </View>
        </Pressable>
      </View>

      {/* フッターノート */}
      <Text className="mt-4 text-[11px] leading-4 text-slate-500 text-center px-2 self-stretch">
        スワイプまたはカードをタップして移動できます。{'\n'}
        作成済みスレッドは各レールに一覧表示されます。
      </Text>
    </View>
  );
}
