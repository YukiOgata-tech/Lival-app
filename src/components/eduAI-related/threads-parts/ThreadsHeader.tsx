// src/components/eduAI-related/threads-parts/ThreadsHeader.tsx
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckSquare, Square, FlaskConical, Globe2,
} from 'lucide-react-native';
import Animated, {
  useSharedValue, withTiming, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';

type Props = {
  title?: string;                   // 既定: "EduAI Chat"
  selectMode: boolean;
  selectedCount: number;
  onToggleSelectMode: () => void;
  onClearSelection: () => void;     // （内部で使用しないが、既存API互換のため残置）
  onBulkDelete: () => void;         // （選択モード内アクション。ヘッダーからは呼ばない想定）

  // テスト用
  pinging?: boolean;
  onPing?: () => void;
  onWhoAmI?: () => void;
};

/* 汎用：丸アイコンボタン（押下でスケール＆微グロー） */
function IconCircleButton({
  disabled, onPress, children, glow = false, testID,
}: {
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  glow?: boolean;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const pressIn = () => { scale.value = withSpring(0.92, { stiffness: 360, damping: 22 }); };
  const pressOut = () => { scale.value = withSpring(1, { stiffness: 260, damping: 20 }); };

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow ? 0.35 : 0,
  }));

  return (
    <Animated.View
      style={[{ shadowColor: '#8b5cf6', shadowRadius: glow ? 10 : 0, shadowOffset: { width: 0, height: 4 } }, anim]}
      className="mx-1"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="アクション"
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        className={`w-10 h-10 rounded-full items-center justify-center ${disabled ? 'bg-neutral-300' : 'bg-neutral-900'}`}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* 選択モードトグル：アイコンをクロスフェード／リング色を変化 */
function SelectToggle({
  active, count, onPress,
}: { active: boolean; count: number; onPress: () => void }) {
  const t = useSharedValue(active ? 1 : 0);
  useEffect(() => { t.value = withTiming(active ? 1 : 0, { duration: 180 }); }, [active]);

  const wrapAnim = useAnimatedStyle(() => ({
    // 背景色は NativeWind クラスで、リングの不透明度だけ可変
    shadowOpacity: active ? 0.4 : 0.2,
    shadowRadius: active ? 12 : 6,
  }));

  const iconSquare = useAnimatedStyle(() => ({ opacity: withTiming(1 - t.value, { duration: 120 }) }));
  const iconCheck  = useAnimatedStyle(() => ({ opacity: withTiming(t.value,     { duration: 120 }) }));

  return (
    <Animated.View style={wrapAnim}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: active }}
        onPress={onPress}
        className={`w-11 h-11 rounded-full items-center justify-center border
                    ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-neutral-900 border-neutral-900'}`}
      >
        {/* アイコン2枚重ねでクロスフェード */}
        <View className="absolute">
          <Animated.View style={iconSquare}><Square size={18} color="white" /></Animated.View>
          <Animated.View style={[{ position: 'absolute' }, iconCheck]}><CheckSquare size={18} color="white" /></Animated.View>
        </View>

        {/* バッジ：選択数（0のときは非表示） */}
        {count > 0 && (
          <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 items-center justify-center">
            <Text className="text-[10px] text-white font-semibold" numberOfLines={1}>
              {count > 99 ? '99+' : String(count)}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ThreadsHeader({
  title = 'EduAI Chat',
  selectMode,
  selectedCount,
  onToggleSelectMode,
  onClearSelection,   // 互換保持
  onBulkDelete,       // 互換保持
  pinging,
  onPing,
  onWhoAmI,
}: Props) {
  return (
    <View className="px-4 pt-12 pb-3 border-b border-neutral-200 bg-white">
      {/* 近未来: うっすらグロー */}
      <View className="absolute -top-6 right-4 w-[120px] h-[120px] rounded-full bg-indigo-300/20 blur-3xl" />
      <View className="absolute top-2 -left-6 w-[100px] h-[100px] rounded-full bg-violet-300/20 blur-3xl" />

      {/* タイトル */}
      <Text className="text-3xl font-extrabold tracking-tight text-neutral-900">{title}</Text>

      {/* 説明（タグ付けの一言も追加） */}
      <Text className="text-xs text-neutral-600 mt-1">
        スレッドを選択して続きから会話できます。重要な発話には
        <Text className="font-semibold"> タグ付け </Text>
        を行うと、レポート最適化や学習カリキュラム作成に活きます。
      </Text>

      {/* 操作行：右寄せ＝[Tests][Tests][Select] の順 */}
      <View className="flex-row items-center mt-3">
        <View className="ml-auto flex-row items-center">
          {/* (将来削除してもOK) テスト2ボタン：Flask / Globe */}
          <IconCircleButton
            testID="btn-functions-ping"
            disabled={!!pinging}
            onPress={onPing}
          >
            <FlaskConical size={18} color="white" />
          </IconCircleButton>
          <IconCircleButton
            testID="btn-http-whoami"
            disabled={!!pinging}
            onPress={onWhoAmI}
          >
            <Globe2 size={18} color="white" />
          </IconCircleButton>

          {/* 選択トグル（右端） */}
          <View className="ml-2">
            <SelectToggle
              active={selectMode}
              count={selectedCount}
              onPress={onToggleSelectMode}
            />
          </View>
        </View>
      </View>

      {/* 下線グラデ（アクセント） */}
      <LinearGradient
        colors={['#a5b4fc', '#8b5cf6', '#a5b4fc']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ height: 4, borderRadius: 999, marginTop: 10 }}
      />
    </View>
  );
}
