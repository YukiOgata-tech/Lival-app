// src/components/session-related/home/RoomHomePanel.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Keyboard, Platform } from 'react-native';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import SessionCountdownChip from '@/components/common/SessionCountdownChip';
import { useSegments } from '@/hooks/useSegments';
import SegmentBanner from '@/components/session-related/home/SegmentBanner';
import SegmentControl from '@/components/session-related/home/SegmentControl';



type Task = {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  points?: number;
  assignees?: string[];
  archived?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export default function RoomHomePanel({ roomId, roomData }: { roomId: string; roomData: any }) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'doing' | 'done'>('all');

  const segmentProps = useMemo(() => ({
    hostUserId: roomData?.hostUserId,
    mode: roomData?.segmentMode,
    minutes: roomData?.segmentMinutes,
    startedAt: roomData?.segmentStartedAt,
    index: roomData?.segmentIndex,
  }), [
    roomData?.hostUserId, roomData?.segmentMode, roomData?.segmentMinutes,
    roomData?.segmentStartedAt, roomData?.segmentIndex,
  ]);

  const { state, countdown, isHost, pending, startFocus, startBreak, stop } = useSegments(roomId, segmentProps);

  // ---- Firestore購読（1本だけ） ----
  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(firestore, 'rooms', roomId, 'tasks'),
      where('archived', '==', false),
      orderBy('updatedAt', 'desc'),
      limit(200) // 200件まで。必要に応じて増減
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: true }, // キャッシュ→ネット順に反映
      (ss) => {
        setTasks(ss.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      }
    );
  }, [roomId]);

  // ---- メモ化：UI用の振り分け（通信なし） ----
  const grouped = useMemo(() => {
    const base = { todo: [] as Task[], doing: [] as Task[], done: [] as Task[] };
    for (const t of tasks) (base[t.status] as Task[]).push(t);
    return base;
  }, [tasks]);

  const viewItems = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  // ---- 操作：追加 / 状態トグル / アーカイブ（長押し） ----
  const addTask = useCallback(async () => {
    const title = input.trim();
    if (!title) return;
    setInput('');
    Keyboard.dismiss();
    await addDoc(collection(firestore, 'rooms', roomId, 'tasks'), {
      title,
      status: 'todo',
      points: 1,
      assignees: user?.uid ? [user.uid] : [],
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, [input, roomId, user?.uid]);

  const toggleStatus = useCallback(async (t: Task) => {
    const next: Task['status'] = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
    await updateDoc(doc(firestore, 'rooms', roomId, 'tasks', t.id), {
      status: next,
      updatedAt: serverTimestamp(),
    });
  }, [roomId]);

  const archiveTask = useCallback(async (t: Task) => {
    await updateDoc(doc(firestore, 'rooms', roomId, 'tasks', t.id), {
      archived: true,
      updatedAt: serverTimestamp(),
    });
  }, [roomId]);

  const TabBtn = ({ v, label }: { v: typeof filter; label: string }) => (
    <Pressable
      onPress={() => setFilter(v)}
      className={`px-3 py-1 rounded-full ${filter === v ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}
      hitSlop={8}
    >
      <Text className={`${filter === v ? 'text-white dark:text-neutral-900' : 'text-neutral-700 dark:text-neutral-200'} text-[12px]`}>
        {label}
      </Text>
    </Pressable>
  );

  const TaskRow = ({ item }: { item: Task }) => (
    <Pressable
      onPress={() => toggleStatus(item)}
      onLongPress={() => archiveTask(item)}
      className="mb-2 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] text-neutral-900 dark:text-neutral-100" numberOfLines={2}>
          {item.status === 'done' ? '✅ ' : item.status === 'doing' ? '🟡 ' : '⬜️ '} {item.title}
        </Text>
        <View className="ml-2 rounded-full px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800">
          <Text className="text-[11px] text-neutral-700 dark:text-neutral-200">{item.points ?? 1}pt</Text>
        </View>
      </View>
      <Text className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
        {item.status === 'todo' ? 'タップで「進行中」' : item.status === 'doing' ? 'タップで「完了」' : 'タップで「未着手」に戻す'} ／ 長押しで非表示
      </Text>
    </Pressable>
  );

  return (
    <View className="flex-1 px-4 py-3">
      {/* ヘッダ行：タイトル＋小タイマー */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">ホーム</Text>
        <SessionCountdownChip
          time={{
            minutes: roomData?.minutes,
            sessionStartAt: roomData?.sessionStartAt ?? roomData?.createdAt,
            sessionForceEndedAt: roomData?.sessionForceEndedAt ?? null,
          }}
        />
      </View>

      {/* 概況チップ（ローカル計算） */}
      <View className="flex-row flex-wrap gap-2 mb-3">
        <View className="rounded-full px-3 py-1 bg-neutral-100 dark:bg-neutral-800">
          <Text className="text-[12px] text-neutral-700 dark:text-neutral-200">未着手 {grouped.todo.length}</Text>
        </View>
        <View className="rounded-full px-3 py-1 bg-neutral-100 dark:bg-neutral-800">
          <Text className="text-[12px] text-neutral-700 dark:text-neutral-200">進行中 {grouped.doing.length}</Text>
        </View>
        <View className="rounded-full px-3 py-1 bg-neutral-100 dark:bg-neutral-800">
          <Text className="text-[12px] text-neutral-700 dark:text-neutral-200">完了 {grouped.done.length}</Text>
        </View>

        {/* フィルタ */}
        <View className="ml-auto flex-row items-center gap-6">
          <TabBtn v="all" label="すべて" />
          <TabBtn v="todo" label="未着手" />
          <TabBtn v="doing" label="進行中" />
          <TabBtn v="done" label="完了" />
        </View>
      </View>

      {/* 入力＋追加 */}
      <View
        className="flex-row items-center gap-2 mb-2 rounded-2xl px-3 py-2 bg-white dark:bg-neutral-900"
        style={{
          ...(Platform.OS === 'android'
            ? { elevation: 1 }
            : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }),
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTask}
          placeholder="タスクを追加（例：英語の長文読解 1 セクション）"
          returnKeyType="done"
          className="flex-1 text-[15px] text-neutral-900 dark:text-neutral-100"
        />
        <Pressable onPress={addTask} className="rounded-xl px-3 py-2 bg-neutral-900 dark:bg-white" hitSlop={8}>
          <Text className="text-white dark:text-neutral-900 font-medium">追加</Text>
        </Pressable>
      </View>
      {/* セグメントコントロール */}
      <SegmentBanner mode={state.mode} clock={countdown.clock} progress={countdown.progress} />
      <SegmentControl isHost={isHost} onFocus={startFocus} onBreak={startBreak} onStop={stop} pending={pending} activeMode={state.mode} />

      {/* リスト（フィルタ済） */}
      <FlatList
        data={viewItems}
        keyExtractor={(i) => i.id}
        renderItem={TaskRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListEmptyComponent={
          <View className="mt-8 items-center">
            <Text className="text-neutral-500 dark:text-neutral-400">まだタスクがありません</Text>
          </View>
        }
      />
    </View>
  );
}