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
import ThreadsHeader from '@/components/eduAI-related/threads-parts/ThreadsHeader';

export default function EduAIThreadsScreen() {
  const nav = useNavigation<any>();

  const [threads, setThreads] = useState<EduAIThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // アクションシート（リネーム／削除）
  const [actions, setActions] = useState<{ open: boolean; thread?: EduAIThread | null }>({
    open: false, thread: null,
  });

  // 新規作成シート
  const [creatorOpen, setCreatorOpen] = useState(false);

  // フィルター
  const [filter, setFilter] = useState<FilterKey>('all');

  // Functions接続テスト状態
  const [pinging, setPinging] = useState(false);

  // ★ 選択モード & 選択集合
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    setEduAIRouterPreset((t.agent ?? 'auto') as AgentKey);
    if (t.agent === 'tutor') nav.navigate('EduAITutor');
    else if (t.agent === 'counselor') nav.navigate('EduAICounselor');
    else if (t.agent === 'planner') nav.navigate('EduAIPlanner');
    else nav.navigate('EduAIRouter');
  };

  /** 新規スレッド（プリセットに応じて遷移先を切り替え） */
  const startThread = (preset: AgentKey) => {
    setCreatorOpen(false);
    setEduAICurrentThreadId('');
    setEduAIRouterPreset(preset);
    if (preset === 'tutor') nav.navigate('EduAITutor');
    else if (preset === 'counselor') nav.navigate('EduAICounselor');
    else if (preset === 'planner') nav.navigate('EduAIPlanner');
    else nav.navigate('EduAIRouter');
  };

  /** Functions 到達テスト */
  const handlePing = async () => {
    try {
      setPinging(true);
      await ensureSignedIn();
      const functions = getFunctions(app, 'asia-northeast1');
      const { data } = await httpsCallable<any, { ok: boolean; uid: string | null; appId: string | null; now: string }>(
        functions, 'ping'
      )({});
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

  // === 選択モード系 ===
  const toggleSelectMode = () => {
    if (selectMode) { setSelected(new Set()); setSelectMode(false); }
    else { setSelected(new Set()); setSelectMode(true); }
  };
  const clearSelection = () => setSelected(new Set());
  const togglePick = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const bulkDelete = () => {
    if (selected.size === 0) return;
    Alert.alert('一括削除', `${selected.size}件のスレッドを削除しますか？`, [
      { text: 'キャンセル' },
      {
        text: '削除する', style: 'destructive',
        onPress: () => {
          [...selected].forEach(id => removeEduAIThread(id));
          load();
          setSelected(new Set());
          setSelectMode(false);
        }
      }
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      {/* === Header: コンポーネント化 === */}
      <ThreadsHeader
        selectMode={selectMode}
        selectedCount={selected.size}
        onToggleSelectMode={toggleSelectMode}
        onClearSelection={clearSelection}
        onBulkDelete={bulkDelete}
        pinging={pinging}
        onPing={handlePing}
        onWhoAmI={handleWhoAmI}
      />

      {/* フィルター */}
      <View className="px-4">
        <FilterPills value={filter} onChange={setFilter} />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <ThreadCard
            thread={item}
            onPress={() => (selectMode ? togglePick(item.id) : openThread(item))}
            onMore={() => !selectMode && setActions({ open: true, thread: item })}
            selectionMode={selectMode}
            selected={selected.has(item.id)}
            onToggleSelect={() => togglePick(item.id)}
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

      {/* アクションシート（リネーム／削除） */}
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
