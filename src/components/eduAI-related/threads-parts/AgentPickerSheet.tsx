// src/components/eduAI-related/threads-parts/AgentPickerSheet.tsx
import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { ShieldCheck, GraduationCap, BookOpenCheck, PencilRuler } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

export type AgentKey = 'auto' | 'tutor' | 'counselor' | 'planner';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (agent: AgentKey) => void;
};
const HEADER_ANIM = require('@assets/lotties/cutes-walking.json');

export default function AgentPickerSheet({ open, onClose, onPick }: Props) {
  const lottieRef = useRef<LottieView>(null);

  // 開くたびにクリーンに再生
  useEffect(() => {
    if (open) {
      lottieRef.current?.reset?.();
      lottieRef.current?.play?.();
    }
  }, [open]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 ">
          {/* ── Lottie */}
          <View className="items-center mb-2 absolute -top-14 right-4">
            <LottieView
              key={`agentpicker-lottie-${open ? 'open' : 'closed'}`} // 再利用防止
              ref={lottieRef}
              source={HEADER_ANIM}
              autoPlay
              loop
              style={{ width: 140, height: 150 }}
            />
          </View>

          <Text className="text-base font-semibold mb-3">新しいスレッド</Text>

          {/* 2列グリッドっぽく見えるカード群 */}
          <View className="flex-row">
            <Pressable
              onPress={() => onPick('auto')}
              className="flex-1 mr-2 rounded-2xl bg-slate-50 border border-slate-200 p-4"
            >
              <View className="flex-row items-center">
                <ShieldCheck size={18} color="#0f172a" />
                <Text className="ml-2 font-medium text-slate-900">司令塔（自動）</Text>
              </View>
              <Text className="text-[12px] text-slate-600 mt-1">
                発話内容を自動分類して最適なAIを選択
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onPick('tutor')}
              className="flex-1 ml-2 rounded-2xl bg-blue-50 border border-blue-200 p-4"
            >
              <View className="flex-row items-center">
                <BookOpenCheck size={18} color="#1d4ed8" />
                <Text className="ml-2 font-medium text-blue-800">家庭教師</Text>
              </View>
              <Text className="text-[12px] text-blue-700/80 mt-1">
                数式/画像OK。段階的に解法を案内
              </Text>
            </Pressable>
          </View>

          <View className="flex-row mt-3">
            <Pressable
              onPress={() => onPick('counselor')}
              className="flex-1 mr-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4"
            >
              <View className="flex-row items-center">
                <GraduationCap size={18} color="#059669" />
                <Text className="ml-2 font-medium text-emerald-800">進路カウンセラー</Text>
              </View>
              <Text className="text-[12px] text-emerald-700/80 mt-1">
                大学/制度の調査・根拠提示（Web検索ON対応）
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onPick('planner')}
              className="flex-1 ml-2 rounded-2xl bg-violet-50 border border-violet-200 p-4"
            >
              <View className="flex-row items-center">
                <PencilRuler size={18} color="#7c3aed" />
                <Text className="ml-2 font-medium text-violet-800">学習計画</Text>
              </View>
              <Text className="text-[12px] text-violet-700/80 mt-1">
                SMART/週間配分など実行可能なプラン作成
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} className="mt-4 py-3 rounded-xl bg-neutral-900">
            <Text className="text-center text-white font-medium">閉じる</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
