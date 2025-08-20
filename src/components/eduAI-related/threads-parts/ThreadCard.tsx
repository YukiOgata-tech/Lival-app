// src/components/eduAI-related/threads-parts/ThreadCard.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoreHorizontal, Check } from 'lucide-react-native';
import type { EduAIThread } from '@/storage/eduAIStorage';
import Animated, { LinearTransition, Keyframe } from 'react-native-reanimated';

const BADGE = {
  tutor:     { ring: 'ring-blue-500',    bgDot: 'bg-blue-500',    bg: 'bg-blue-50',    label: '家庭教師' },
  counselor: { ring: 'ring-emerald-500', bgDot: 'bg-emerald-500', bg: 'bg-emerald-50', label: '進路カウンセラー' },
  planner:   { ring: 'ring-violet-500',  bgDot: 'bg-violet-500',  bg: 'bg-violet-50',  label: '学習計画' },
  null:      { ring: 'ring-slate-400',   bgDot: 'bg-slate-500',   bg: 'bg-slate-50',   label: '未確定' },
} as const;

/** ===== 退場アニメ（Keyframeは同一プロパティ集合のみ） =====
 * グリッチ（scaleX/scaleY/rotateX）→ 斜め縮退 → フェードアウト
 * ※ サイズ潰し(height/margin/padding)は入れない（レイアウトに任せる）
 */
const TechnoExit = new Keyframe({
  0:   { opacity: 1, transform: [{ scaleX: 1 }, { scaleY: 1 }, { rotateX: '0deg' }] },
  20:  { opacity: 1, transform: [{ scaleX: 1.03 }, { scaleY: 0.98 }, { rotateX: '2deg' }] },
  40:  { opacity: 1, transform: [{ scaleX: 0.96 }, { scaleY: 1.02 }, { rotateX: '-2deg' }] },
  60:  { opacity: 0.85, transform: [{ scaleX: 0.55 }, { scaleY: 0.92 }, { rotateX: '55deg' }] },
  80:  { opacity: 0.55, transform: [{ scaleX: 0.25 }, { scaleY: 0.55 }, { rotateX: '82deg' }] },
  100: { opacity: 0, transform: [{ scaleX: 0.001 }, { scaleY: 0.001 }, { rotateX: '90deg' }] },
}).duration(520);

/** ふわっと入場 */
const SoftEnter = new Keyframe({
  0:   { opacity: 0, transform: [{ translateY: 6 }, { scale: 0.98 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(220);

type Props = {
  thread: EduAIThread;
  onPress: () => void;
  onMore: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

export default function ThreadCard({
  thread, onPress, onMore,
  selectionMode = false, selected = false, onToggleSelect,
}: Props) {
  const key = (thread.agent ?? 'null') as keyof typeof BADGE;
  const b = BADGE[key];

  const handleCardPress = selectionMode ? (onToggleSelect ?? (() => {})) : onPress;

  return (
    <Animated.View
      layout={LinearTransition.springify().stiffness(220).damping(20)}
      entering={SoftEnter}
      exiting={TechnoExit}  // ★ 修正後のKeyframe
      className="px-4"
    >
      <Pressable onPress={handleCardPress}>
        <View
          className={`relative mt-3 rounded-2xl ${b.bg} border border-white/60 ring-1 ${
            selected ? 'ring-2 ring-indigo-500' : b.ring
          } shadow-md`}
          style={{ overflow: 'hidden' }}
        >
          {/* 選択チェック */}
          {selectionMode && (
            <View
              className={`absolute left-3 top-3 w-5 h-5 rounded-full ${selected ? 'bg-indigo-600' : 'bg-white'}
                          border border-neutral-300 items-center justify-center`}
            >
              {selected ? <Check size={14} color="white" /> : null}
            </View>
          )}

          <View className="flex-row items-center px-4 pt-3">
            <View className={`w-2 h-2 rounded-full mr-2 ${b.bgDot}`} />
            <Text className="text-xs text-neutral-500">
              {b.label}
              <Text className="text-neutral-400">
                {'  ・  '}
                {new Date(thread.updatedAt || 0).toLocaleString()}
              </Text>
            </Text>

            {!selectionMode && (
              <Pressable onPress={onMore} hitSlop={10} className="ml-auto p-2 -mr-2">
                <MoreHorizontal size={18} color="#6b7280" />
              </Pressable>
            )}
          </View>

          <View className="px-4 py-3">
            <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
              {thread.title}
            </Text>
            {!!thread.lastMessagePreview && (
              <Text className="text-[12px] text-neutral-600 mt-1" numberOfLines={2}>
                {thread.lastMessagePreview}
              </Text>
            )}
          </View>

          {/* スキャンラインの薄い光 */}
          <View className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-b from-white/30 to-transparent" />
        </View>
      </Pressable>
    </Animated.View>
  );
}
