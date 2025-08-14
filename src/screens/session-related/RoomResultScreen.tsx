// src/screens/session-related/RoomResultScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable, Platform, Share, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { buildPresenceRanking, clampToSessionWindow } from '@/lib/GroupSession-related/presenceRanking';
import { calcXP } from '@/lib/GroupSession-related/xp';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroHeader from '@/components/session-related/result/HeroHeader';
import MySummaryCard from '@/components/session-related/result/MySummaryCard';
import PodiumTop3, { RankRow } from '@/components/session-related/result/PodiumTop3';
import RankingList from '@/components/session-related/result/RankingList';

import { saveToCache } from '@/lib/GroupSession-related/groupResultCache';


type RoomStatus = 'active' | 'ended' | 'scheduled' | 'paused';

type RoomDoc = {
  roomName: string;
  roomTag?: string;
  minutes?: number;
  status?: RoomStatus;
  hostUserId: string;
  members?: string[];
  createdAt?: { toMillis: () => number };
  sessionStartAt?: { toMillis: () => number } | null;
  sessionForceEndedAt?: { toMillis: () => number } | null;
  memberProfiles?: Record<string, { displayName?: string | null; photoURL?: string | null }>;
  finalizedAt?: { toMillis: () => number } | null;
};

const COIN_PER_MINUTE_UI = 2;

export default function RoomResultScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();
  const { roomId, clientEndMs } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [saved, setSaved] = useState(false);



  // 共有関数の下あたりに追加
  const goBackToSession = () => {
    (nav as any).reset({
      index: 0,
      routes: [{ name: 'Main' }], // ← ルート名が違う場合はここを変更
    });
  };



  // 1) room 読み込みだけ
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!roomId) return;
      setLoading(true);
      const rs = await getDoc(doc(firestore, 'rooms', roomId));
      if (!rs.exists()) {
        Alert.alert('ルームが見つかりません');
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setRoom(rs.data() as RoomDoc);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [roomId]);

  // 2) room が決まってからウィンドウ算出→ presence ランキング（滞在時間）
const startMs = useMemo<number | undefined>(() => {
  const a = room?.sessionStartAt?.toMillis?.();
  const b = room?.createdAt?.toMillis?.();
  return a ?? b;
}, [room?.sessionStartAt, room?.createdAt]);

const plannedEndMs = useMemo<number | undefined>(() => {
  if (!startMs || !room?.minutes) return undefined;
  return startMs + room.minutes * 60_000;
}, [startMs, room?.minutes]);

// ★ 実終了: 強制終了 > 精算完了 > 予定終了
const effectiveEndMs = useMemo<number | undefined>(() => {
  if (!startMs) return undefined;
  const cands = [
    room?.sessionForceEndedAt?.toMillis?.(),
    room?.finalizedAt?.toMillis?.(),
    typeof clientEndMs === 'number' ? clientEndMs : undefined,
    plannedEndMs,
  ].filter((x): x is number => typeof x === 'number' && x > startMs);
  if (!cands.length) return undefined;
  return Math.min(...cands);
}, [room?.sessionForceEndedAt, room?.finalizedAt, clientEndMs, plannedEndMs, startMs]);
// ガント用のウィンドウ
const sessionWindowMs = useMemo(() => {
  if (!startMs || !effectiveEndMs) return 0;
  return Math.max(0, effectiveEndMs - startMs);
}, [startMs, effectiveEndMs]);

  useEffect(() => {
  let cancelled = false;
  (async () => {
    if (!roomId || !room) return;
    if (!startMs || !effectiveEndMs) return;

    const rank = await buildPresenceRanking(roomId, startMs, effectiveEndMs);
    if (cancelled) return;

    const windowMs = Math.max(0, effectiveEndMs - startMs);     // ★ここ
    const mapped: RankRow[] = rank.map((r: any) => ({
      uid: r.uid,
      name: room.memberProfiles?.[r.uid]?.displayName ?? r.displayName ?? null,
      stayMs: Math.max(0, Math.min(Number(r.totalMs ?? 0), windowMs)), // ★ここ
    }));
    mapped.sort((a, b) => b.stayMs - a.stayMs);
    setRows(mapped);
  })();
  return () => { cancelled = true; };
}, [roomId, room, startMs, effectiveEndMs]);


  // 結果画面に入ったら一度だけ精算トリガ（固定IDで二重防止）
  const settleOnce = useRef(false);
useEffect(() => {
  if (!roomId || !user?.uid || !room) return;
  if (room.finalizedAt) return;            // 既に精算済み
  if (room.status !== 'ended') return;     // ★ 終了後にだけリクエストを出す
  if (settleOnce.current) return;
  settleOnce.current = true;

  const ref = doc(firestore, 'rooms', roomId, '_settlements', 'auto'); // 固定IDで一度きり
  setDoc(ref, {
    requestedBy: user.uid,
    createdAt: serverTimestamp(),
  }, { merge: true }) // 既存なら上書き（onDocumentCreatedは最初の1回だけ発火）
    .catch(() => { settleOnce.current = false; });
}, [roomId, room?.status, room?.finalizedAt, user?.uid]);


const plannedWindow = useMemo(() => {
  if (!startMs || !effectiveEndMs) return undefined;
  return clampToSessionWindow(startMs, effectiveEndMs);
}, [startMs, effectiveEndMs]);

  const totalPlannedMs = sessionWindowMs;
  const me = useMemo(() => rows.find(r => r.uid === user?.uid), [rows, user?.uid]);
  const myRank = useMemo(
    () => (me ? rows.findIndex(r => r.uid === me.uid) + 1 : undefined),
    [me, rows]
  );
  const myXP = useMemo(
    () => (me ? calcXP({ focusMs: me.stayMs, plannedMs: totalPlannedMs, tag: room?.roomTag }) : 0),
    [me, totalPlannedMs, room?.roomTag]
  );
  const myCoins = useMemo(
    () => (me ? Math.floor(me.stayMs / 60_000) * COIN_PER_MINUTE_UI : 0),
    [me]
  );


  useEffect(() => {
  if (!roomId || !room) return;

  // finalizedAt が無いときは現在時刻をフォールバック（表示用）
  const finalizedAt =
    room.finalizedAt?.toMillis?.() ??
    room.sessionForceEndedAt?.toMillis?.() ??
    Date.now();
  // ここでは「予定時間」を表示用分数として入れておく（好みで滞在分にしてもOK）
  const durationMin = Math.max(0, Math.floor((room.minutes ?? 0)));

  saveToCache({
    roomId,
    title: room.roomName ?? 'Group Session',
    finalizedAt,
    durationMin,
    rank: myRank,
    xp: myXP,
    coins: myCoins,
  }).catch(() => {});
}, [roomId, room, me?.stayMs, myRank, myXP, myCoins]);

if (loading || !room) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }


  const saveResult = async () => {
    try {
      const snapRef = doc(collection(firestore, 'rooms', roomId, 'results'));
      await setDoc(snapRef, {
        createdAt: serverTimestamp(),
        sessionStartAt: startMs,
        effectiveEndAt: effectiveEndMs,
        minutes: room.minutes ?? null,
        ranking: rows.map((r, i) => ({
          rank: i + 1,
          uid: r.uid,
          displayName: r.name ?? null,
          stayMs: r.stayMs,
          xp: calcXP({ focusMs: r.stayMs, plannedMs: totalPlannedMs, tag: room.roomTag }),
        })),
      });
      setSaved(true);
      Alert.alert('保存しました');
    } catch (e: any) {
      Alert.alert('保存に失敗しました', e?.message ?? '');
    }
  };

  const shareResult = async () => {
    try {
      const msg =
        `「${room.roomName}」結果\n` +
        `参加者: ${room.members?.length ?? 0}人 / 設定: ${room.minutes ?? 0}分\n` +
        (me ? `あなた（滞在）: ${Math.floor(me.stayMs / 60000)}分 / 推定XP ${myXP}` : '');
      await Share.share({ message: msg });
    } catch {}
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      <HeroHeader
        roomName={room.roomName}
        roomTag={room.roomTag}
        minutes={room.minutes}
        membersCount={room.members?.length}
        timeLabel={plannedWindow
    ? `${new Date(plannedWindow.startMs).toLocaleTimeString()} - ${new Date(plannedWindow.endMs).toLocaleTimeString()}`
    : '集計中'}      />

      <ScrollView className="flex-1 px-5 mt-3" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <MySummaryCard
          stayMs={me?.stayMs ?? 0}
          xp={myXP}
          coins={myCoins}
          rank={myRank}
          plannedMs={totalPlannedMs}
          title="あなたの滞在時間"
        />

        <View className="mt-4" />

        <PodiumTop3 rows={rows} plannedMs={totalPlannedMs} meUid={user?.uid ?? null} />

        <RankingList rows={rows} plannedMs={totalPlannedMs} meUid={user?.uid ?? null} />
        </ScrollView>

        {/* 下部固定アクション（ホームインジケータを考慮） */}
      <SafeAreaView edges={['bottom']} className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <View className="px-5 py-3 flex-row items-center justify-between">
          <Pressable
            onPress={goBackToSession}
           className="flex-row items-center gap-1 px-4 py-2 rounded-full bg-neutral-200 dark:bg-neutral-800"
          >
            <Ionicons name="close-outline" size={16} color="#111827" />
            <Text className="text-neutral-900 dark:text-white font-semibold">閉じる</Text>
          </Pressable>

          <Pressable
            onPress={shareResult}
            className="flex-row items-center gap-1 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white"
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text className="text-white dark:text-neutral-900 font-semibold">共有</Text>
          </Pressable>

          {user?.uid === room.hostUserId ? (
            <Pressable
              onPress={saveResult}
              className={`px-4 py-2 rounded-full ${saved ? 'bg-neutral-300' : 'bg-emerald-600'}`}
            >
              <Text className={`font-semibold ${saved ? 'text-neutral-700' : 'text-white'}`}>
                {saved ? '保存済み' : '結果を保存'}
              </Text>
            </Pressable>
          ) : <View style={{ width: 88 }} /> /* レイアウトの均等化用スペーサ */}
        </View>
      </SafeAreaView>
        
    </View>
  );
}
