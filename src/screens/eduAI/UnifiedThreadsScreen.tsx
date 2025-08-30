// src/screens/eduAI/UnifiedThreadsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Dimensions, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  runOnJS,
  cancelAnimation,
  runOnUI,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Image } from 'expo-image';

import {
  getEduAIThreads,
  EduAIThread,
  removeEduAIThread,
  renameEduAIThread,
  setEduAICurrentThreadId,
  setEduAIRouterPreset,
} from '@/storage/eduAIStorage';
import {
  getAItoolsChatThreads,
  removeAItoolsChatThread,
  renameAItoolsChatThread,
} from '@/storage/AItoolsChatStorage';

import ThreadCard from '@/components/eduAI-related/threads-parts/ThreadCard';
import ThreadCardTool from '@/components/eduAI-related/threads-parts/ThreadCardTool';
import FilterPills, { FilterKey } from '@/components/eduAI-related/threads-parts/FilterPills';
import AgentPickerSheet, { AgentKey } from '@/components/eduAI-related/threads-parts/AgentPickerSheet';
import ThreadActionsSheet from '@/components/eduAI-related/threads-parts/ThreadActionsSheet';
import BottomHubBar from '@/components/eduAI-related/threads-parts/BottomHubBar';
import CenterHero from '@/components/eduAI-related/threads-parts/CenterHero';

type Lane = 'center' | 'agent' | 'tool';

const W = Dimensions.get('window').width;
const TRAY_W = Math.min(W * 0.9, 380);
const SNAP_DIST = W * 0.28;

export default function UnifiedThreadsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  /* ---------- data ---------- */
  const [aiThreads, setAiThreads] = useState<EduAIThread[]>([]);
  const [toolsThreads, setToolsThreads] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setAiThreads(getEduAIThreads());
    setToolsThreads(getAItoolsChatThreads());
  }, []);
  useEffect(() => { load(); }, []);
  const onRefresh = async () => {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 300);
  };

  /* ---------- lane & animation ---------- */
  const initialLane: Lane = (route.params?.initialLane as Lane) ?? 'center';
  const [lane, setLane] = useState<Lane>(initialLane);

  // -1(agent) / 0(center) / 1(tool)
  const initialSV: -1 | 0 | 1 = initialLane === 'agent' ? -1 : initialLane === 'tool' ? 1 : 0;
  const laneSV = useSharedValue<number>(initialSV);
  const drag   = useSharedValue<number>(initialSV);

  // 以前のレーン状態を保持する（戻ってきたときにセンターへ強制せず、ユーザーが見ていたレーンに戻す）

  // worklet: スナップ（UI/JSどちらからでも）
  const snapTo = (targetNum: -1 | 0 | 1, duration = 260) => {
    'worklet';
    cancelAnimation(drag);
    cancelAnimation(laneSV);
    laneSV.value = targetNum;
    drag.value = withTiming(targetNum, { duration }, (finished) => {
      if (finished) {
        const next: Lane = targetNum === -1 ? 'agent' : targetNum === 1 ? 'tool' : 'center';
        runOnJS(setLane)(next);
      }
    });
  };

  // JS 側（ボタン）からは UI スレッドへ
  const animateToLane = (target: Lane, duration = 260) => {
    setLane(target);
    const num: -1 | 0 | 1 = target === 'agent' ? -1 : target === 'tool' ? 1 : 0;
    runOnUI(snapTo)(num, duration);
  };

  /* ---------- gestures ---------- */
  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .minDistance(18)
    .onUpdate((e) => {
      const base = laneSV.value;
      let xnorm = base + e.translationX / (SNAP_DIST * 2.2);
      if (xnorm < -1) xnorm = -1;
      if (xnorm > 1)  xnorm = 1;
      drag.value = xnorm;
    })
    .onEnd((e) => {
      const movedEnough = Math.abs(e.translationX) > 14 || Math.abs(e.velocityX) > 800;
      if (!movedEnough) return;

      const v = e.velocityX;
      const x = drag.value;
      let targetNum: -1 | 0 | 1 = 0;
      if (v < -800 || x < -0.5) targetNum = -1;
      else if (v > 800 || x > 0.5) targetNum = 1;
      snapTo(targetNum, 220);
    });

  /* ---------- animated styles ---------- */
  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(drag.value), [0, 1], [0, 0.55]),
  }));
  const leftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drag.value, [-1, 0], [0, -TRAY_W]) },
      { scale: interpolate(drag.value, [-1, 0], [1, 0.96]) },
    ],
    opacity: interpolate(drag.value, [-1, 0], [1, 0.35]),
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drag.value, [0, 1], [TRAY_W, 0]) },
      { scale: interpolate(drag.value, [0, 1], [0.96, 1]) },
    ],
    opacity: interpolate(drag.value, [0, 1], [0.35, 1]),
  }));

  // 中央ヒーローのフェード/ヒット切替
  const heroStyle = useAnimatedStyle(() => {
    const a = Math.abs(drag.value);
    return {
      opacity: interpolate(a, [0, 0.04, 0.1], [1, 0.35, 0]),
      transform: [{ scale: interpolate(a, [0, 0.1], [1, 0.98]) }],
    };
  });
  const [heroPE, setHeroPE] = useState<'auto' | 'none'>('auto');
  useAnimatedReaction(
    () => Math.abs(drag.value) < 0.04,
    (isCenterLike) => { runOnJS(setHeroPE)(isCenterLike ? 'auto' : 'none'); }
  );

  /* ---------- open / actions ---------- */
  const openAiThread = (t: EduAIThread) => {
    setEduAICurrentThreadId(t.id);
    setEduAIRouterPreset((t.agent ?? 'auto') as AgentKey);
    if (t.agent === 'tutor') nav.navigate('EduAITutor');
    else if (t.agent === 'counselor') nav.navigate('EduAICounselor');
    else if (t.agent === 'planner') nav.navigate('EduAIPlanner');
    else nav.navigate('EduAIRouter');
  };

  const [creatorOpen, setCreatorOpen] = useState(false);
  const startAiThread = (preset: AgentKey) => {
    setCreatorOpen(false);
    setEduAICurrentThreadId('');
    setEduAIRouterPreset(preset);
    if (preset === 'tutor') nav.navigate('EduAITutor');
    else if (preset === 'counselor') nav.navigate('EduAICounselor');
    else if (preset === 'planner') nav.navigate('EduAIPlanner');
    else nav.navigate('EduAIRouter');
  };

  const [actions, setActions] = useState<{ open: boolean; thread?: any | null; lane?: 'agent' | 'tool' }>({ open: false });

  return (
    <GestureDetector gesture={pan}>
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* 背景のベール */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, backgroundColor: '#0b1220' }, veilStyle]} />

        {/* ===== 左：AI ===== */}
        <Animated.View style={[{ position: 'absolute', zIndex: 2, top: insets.top + 8, bottom: 0, left: 0, width: TRAY_W }, leftStyle]} className="px-3">
          <View className="flex-row items-center mb-3">
            <Image
              source={require('@assets/images/AIs.png')}
              style={{ width: 22, height: 22 }}
              contentFit="contain"
            />
            <Text className="ml-2 font-bold text-[18px] text-neutral-900 dark:text-white">キャラクターAI</Text>
            <Pressable onPress={() => animateToLane('center')} className="ml-auto px-2 py-1">
              <ChevronRight size={18} color="#94a3b8" />
            </Pressable>
          </View>

          <FilterPills value={'all'} onChange={(_k: FilterKey) => {}} />

          <FlatList
            className="mt-2"
            data={aiThreads}
            keyExtractor={(x) => x.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <ThreadCard
                thread={item}
                onPress={() => openAiThread(item)}
                onMore={() => setActions({ open: true, thread: item, lane: 'agent' })}
              />
            )}
            contentContainerStyle={{ paddingBottom: 160 }}
          />

          {/* 新規 */}
          <View style={{ position: 'absolute', right: 20, bottom: 88, zIndex: 10 }}>
            <Pressable onPress={() => setCreatorOpen(true)} className="w-12 h-12 rounded-full bg-neutral-900 items-center justify-center shadow-xl">
              <Plus color="white" size={24} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ===== 右：TOOLS ===== */}
        <Animated.View style={[{ position: 'absolute', zIndex: 2, top: insets.top + 8, bottom: 0, right: 0, width: TRAY_W }, rightStyle]} className="px-3">
          <View className="flex-row items-center mb-3">
            <Image
              source={require('@assets/images/tools-01.png')}
              style={{ width: 22, height: 22 }}
              contentFit="contain"
            />
            <Text className="ml-2 font-bold text-[18px] text-neutral-900 dark:text-white">AI TOOLS</Text>
            <Pressable onPress={() => animateToLane('center')} className="ml-auto px-2 py-1">
              <ChevronLeft size={18} color="#94a3b8" />
            </Pressable>
          </View>

          <FlatList
            className="mt-2"
            data={toolsThreads}
            keyExtractor={(x: any) => x.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <ThreadCardTool
                thread={item}
                onPress={() => {
                  if (item.type === 'ocr') nav.navigate('AItoolsOCRChatScreen', { threadId: item.id });
                  else if (item.type === 'translation') nav.navigate('AItoolsTranslationChatScreen', { threadId: item.id });
                }}
                onMore={() => setActions({ open: true, thread: item, lane: 'tool' })}
              />
            )}
            contentContainerStyle={{ paddingBottom: 160 }}
          />

          {/* 新規（TOOLS） */}
          <View style={{ position: 'absolute', right: 20, bottom: 88, zIndex: 10 }}>
            <View className="flex-row">
              <Pressable onPress={() => nav.navigate('AItoolsOCRChatScreen')} className="w-12 h-12 rounded-full bg-lime-600 items-center justify-center shadow-xl mr-3">
                <Text className="text-white font-extrabold">OCR</Text>
              </Pressable>
              <Pressable onPress={() => nav.navigate('AItoolsTranslationChatScreen')} className="w-12 h-12 rounded-full bg-sky-600 items-center justify-center shadow-xl">
                <Text className="text-white font-extrabold">翻</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ===== 中央ヒーロー（常時マウント） ===== */}
        <View pointerEvents={heroPE} style={{ position: 'absolute', zIndex: 0, left: 0, right: 0, bottom: 140, top: insets.top + 32, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={heroStyle}>
            <CenterHero onOpenAgent={() => animateToLane('agent')} onOpenTools={() => animateToLane('tool')} />
          </Animated.View>
        </View>

        {/* 下部ミニピル */}
        <BottomHubBar lane={lane} align="left" onBackCenter={() => animateToLane('center')} />

        {/* シート */}
        <AgentPickerSheet open={creatorOpen} onClose={() => setCreatorOpen(false)} onPick={(a) => startAiThread(a)} />
        <ThreadActionsSheet
          open={actions.open}
          onClose={() => setActions({ open: false })}
          defaultName={actions.thread?.title}
          thread={actions.thread}
          onRename={(name?: string) => {
            if (!actions.thread) return;
            if (actions.lane === 'agent') {
              if (typeof name === 'string') renameEduAIThread(actions.thread.id, name);
            } else if (actions.lane === 'tool') {
              if (typeof name === 'string') renameAItoolsChatThread(actions.thread.id, name);
            }
            load();
            setActions({ open: false, thread: null });
          }}
          onDelete={() => {
            if (!actions.thread) return;
            if (actions.lane === 'agent') removeEduAIThread(actions.thread.id);
            else if (actions.lane === 'tool') removeAItoolsChatThread(actions.thread.id);
            load();
            setActions({ open: false, thread: null });
          }}
        />
      </View>
    </GestureDetector>
  );
}
