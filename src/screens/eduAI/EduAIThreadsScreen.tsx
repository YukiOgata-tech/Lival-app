// src/screens/EduAIThreadsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus, Rocket } from 'lucide-react-native';

import {
  getEduAIThreads,
  EduAIThread,
  removeEduAIThread,
  renameEduAIThread,
  setEduAICurrentThreadId,
  setEduAIRouterPreset,
} from '@/storage/eduAIStorage';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, ensureSignedIn } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';

import ThreadCard from '@/components/eduAI-related/threads-parts/ThreadCard';
import FilterPills, { FilterKey } from '@/components/eduAI-related/threads-parts/FilterPills';
import AgentPickerSheet, { AgentKey } from '@/components/eduAI-related/threads-parts/AgentPickerSheet';
import ThreadActionsSheet from '@/components/eduAI-related/threads-parts/ThreadActionsSheet';

export default function EduAIThreadsScreen() {
  const nav = useNavigation<any>();

  const [threads, setThreads] = useState<EduAIThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ▶ 置き換え：アクションシート（リネーム／削除）
  const [actions, setActions] = useState<{ open: boolean; thread?: EduAIThread | null }>({
    open: false,
    thread: null,
  });

  // 新規作成シート
  const [creatorOpen, setCreatorOpen] = useState(false);

  // フィルター
  const [filter, setFilter] = useState<FilterKey>('all');

  // Functions接続テスト状態
  const [pinging, setPinging] = useState(false);

  const load = () =>
    setThreads(getEduAIThreads().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return threads;
    if (filter === 'draft') return threads.filter((t) => !t.agent);
    return threads.filter((t) => t.agent === filter);
  }, [threads, filter]);

  /** 既存スレッドを開く */
  const openThread = (t: EduAIThread) => {
    setEduAICurrentThreadId(t.id);
    // agent が未確定のスレッドだけ司令塔へ。確定していれば各画面へ直行
    setEduAIRouterPreset((t.agent ?? 'auto') as AgentKey);
    if (t.agent === 'tutor') nav.navigate('EduAITutor');
    else if (t.agent === 'counselor') nav.navigate('EduAICounselor');
    else if (t.agent === 'planner') nav.navigate('EduAIPlanner');
    else nav.navigate('EduAIRouter');
  };

  /** 新規スレッド（プリセットに応じて遷移先を切り替え） */
  const startThread = (preset: AgentKey) => {
    setCreatorOpen(false);
    setEduAICurrentThreadId(''); // 「新規」を示す空ID
    setEduAIRouterPreset(preset);

    if (preset === 'tutor') nav.navigate('EduAITutor');
    else if (preset === 'counselor') nav.navigate('EduAICounselor');
    else if (preset === 'planner') nav.navigate('EduAIPlanner');
    else nav.navigate('EduAIRouter'); // auto は司令塔へ
  };

  /** Functions 到達テスト */
  const handlePing = async () => {
    try {
      setPinging(true);
      await ensureSignedIn();
      const functions = getFunctions(app, 'asia-northeast1');
      const { data } = await httpsCallable<
        any,
        { ok: boolean; uid: string | null; appId: string | null; now: string }
      >(functions, 'ping')({});
      Alert.alert('Functions接続テスト', `OK\nuid: ${data.uid}\nappId: ${data.appId}\nnow: ${data.now}`);
    } catch (err: any) {
      const code = err?.code || err?.message || String(err);
      Alert.alert('Functions接続テスト', `NG: ${code}`);
    } finally {
      setPinging(false);
    }
  };

  /** whoami（HTTP） */
  const handleWhoAmI = async () => {
    try {
      setPinging(true);
      await ensureSignedIn();
      const pid = (app.options as any)?.projectId as string;
      const url = `https://asia-northeast1-${pid}.cloudfunctions.net/whoami`;
      const idToken = await getAuth(app).currentUser!.getIdToken(true);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
      const j = await r.json();
      Alert.alert('HTTP検証 (whoami)', JSON.stringify(j, null, 2));
    } catch (e: any) {
      Alert.alert('HTTP検証 (whoami)', 'NG: ' + (e?.message || String(e)));
    } finally {
      setPinging(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-12 pb-3 border-b border-neutral-200">
        <Text className="text-2xl font-extrabold tracking-tight">EduAI チャット</Text>
        <Text className="text-xs text-neutral-500 mt-1">スレッドを選択して続きから会話できます</Text>

        {/* テストボタン */}
        <View className="flex-row mt-2">
          <Pressable
            onPress={handlePing}
            disabled={pinging}
            className={`ml-auto px-3 py-1.5 rounded-full ${pinging ? 'bg-neutral-300' : 'bg-neutral-900'}`}
          >
            <Text className="text-white text-xs">{pinging ? 'Testing…' : 'Functions接続テスト'}</Text>
          </Pressable>
          <Pressable
            onPress={handleWhoAmI}
            disabled={pinging}
            className={`ml-2 px-3 py-1.5 rounded-full ${pinging ? 'bg-neutral-300' : 'bg-indigo-700'}`}
          >
            <Text className="text-white text-xs">HTTP検証</Text>
          </Pressable>
        </View>

        {/* フィルター */}
        <FilterPills value={filter} onChange={setFilter} />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <ThreadCard
            thread={item}
            onPress={() => openThread(item)}
            onMore={() => setActions({ open: true, thread: item })} // ← ここでアクションシートを開く
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View className="px-4 py-16 items-center">
            <Rocket size={32} color="#111827" />
            <Text className="mt-2 text-neutral-600">まだスレッドがありません。右下の + から作成できます。</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* FAB */}
      <View className="absolute right-5 bottom-8">
        <Pressable
          onPress={() => setCreatorOpen(true)}
          className="w-14 h-14 rounded-full bg-neutral-900 items-center justify-center shadow-xl"
        >
          <Plus color="white" size={26} />
        </Pressable>
      </View>

      {/* 新規作成シート（司令塔/家庭教師/進路/学習計画） */}
      <AgentPickerSheet
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onPick={(agent) => startThread(agent)}
      />

      {/* ===== 置き換え後のアクションシート ===== */}
      <ThreadActionsSheet
        open={actions.open}
        thread={actions.thread ?? null}
        onClose={() => setActions({ open: false, thread: null })}
        onRename={(newName) => {
          if (!actions.thread) return;
          const name = newName.trim();
          if (!name) return;
          renameEduAIThread(actions.thread.id, name);
          load();
          setActions({ open: false, thread: null });
        }}
        onDelete={() => {
          if (!actions.thread) return;
          removeEduAIThread(actions.thread.id);
          load();
          setActions({ open: false, thread: null });
        }}
      />
    </View>
  );
}
