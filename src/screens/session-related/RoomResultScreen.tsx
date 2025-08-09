import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { buildPresenceRanking, clampToSessionWindow } from '@/lib/GroupSession-related/presenceRanking';
import { calcXP } from '@/lib/GroupSession-related/xp';

type RoomDoc = {
  roomName: string;
  roomTag?: string;
  minutes?: number;
  hostUserId: string;
  members?: string[];
  createdAt?: { toMillis: () => number };
  sessionStartAt?: { toMillis: () => number } | null;
  sessionForceEndedAt?: { toMillis: () => number } | null;
  memberProfiles?: Record<string, { displayName?: string | null; photoURL?: string | null }>;
};

type RankItem = {
  uid: string;
  displayName?: string | null;
  totalMs: number;
};

function msToClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-full px-3 py-1 bg-neutral-100 dark:bg-neutral-800"
      style={{
        ...(Platform.OS === 'android'
          ? { elevation: 1 }
          : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }),
      }}
    >
      <Text className="text-[12px] text-neutral-700 dark:text-neutral-200">{children}</Text>
    </View>
  );
}

export default function RoomResultScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();
  const { roomId } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [ranks, setRanks] = useState<RankItem[]>([]);
  const [saved, setSaved] = useState(false);

  const isHost = room && user?.uid === room.hostUserId;

  const sessionStartMs = useMemo(
    () => room?.sessionStartAt?.toMillis?.() ?? room?.createdAt?.toMillis?.(),
    [room?.sessionStartAt, room?.createdAt]
  );
  const plannedEndMs = useMemo(
    () => (sessionStartMs && room?.minutes ? sessionStartMs + room.minutes * 60_000 : undefined),
    [sessionStartMs, room?.minutes]
  );
  const effectiveEndMs = useMemo(() => {
    const forced = room?.sessionForceEndedAt?.toMillis?.();
    if (forced && plannedEndMs) return Math.min(forced, plannedEndMs);
    return forced ?? plannedEndMs ?? undefined;
  }, [room?.sessionForceEndedAt, plannedEndMs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!roomId) return;
      setLoading(true);

      // ルーム読込
      const rs = await getDoc(doc(firestore, 'rooms', roomId));
      if (!rs.exists()) {
        Alert.alert('ルームが見つかりません');
        setLoading(false);
        return;
      }
      const rdata = rs.data() as RoomDoc;
      if (cancelled) return;
      setRoom(rdata);

      // ランキング集計
      const rank = await buildPresenceRanking(
        roomId,
        sessionStartMs,
        effectiveEndMs
      );
      if (cancelled) return;
      setRanks(rank);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // room の時刻は buildPresenceRanking 内で使用するため、初回ロード後に反映される

  const myRow = useMemo(() => ranks.find(r => r.uid === user?.uid), [ranks, user?.uid]);
  const totalMs = useMemo(() => (room?.minutes ? room.minutes * 60_000 : 0), [room?.minutes]);
  const plannedWindow = useMemo(
    () => clampToSessionWindow(sessionStartMs, effectiveEndMs),
    [sessionStartMs, effectiveEndMs]
  );

  const myXP = useMemo(() => {
    if (!myRow) return 0;
    return calcXP({ focusMs: myRow.totalMs, plannedMs: totalMs, tag: room?.roomTag });
  }, [myRow, totalMs, room?.roomTag]);

  const saveResult = async () => {
    if (!roomId || !room) return;
    try {
      const snapRef = doc(collection(firestore, 'rooms', roomId, 'results'));
      await setDoc(snapRef, {
        createdAt: serverTimestamp(),
        sessionStartAt: sessionStartMs ?? null,
        effectiveEndAt: effectiveEndMs ?? null,
        minutes: room.minutes ?? null,
        ranking: ranks.map((r, i) => ({
          rank: i + 1,
          uid: r.uid,
          displayName: room.memberProfiles?.[r.uid]?.displayName ?? null,
          totalMs: r.totalMs,
          xp: calcXP({ focusMs: r.totalMs, plannedMs: totalMs, tag: room.roomTag }),
        })),
      });
      setSaved(true);
      Alert.alert('保存しました');
    } catch (e: any) {
      Alert.alert('保存に失敗しました', e?.message ?? '');
    }
  };

  if (loading || !room) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* ヘッダ */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          結果：{room.roomName}
        </Text>
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          <Chip>{room.roomTag ? `${room.roomTag}用` : '一般用'}</Chip>
          {room.minutes ? <Chip>{room.minutes}分</Chip> : null}
          <Chip>{`${room.members?.length ?? 0}人`}</Chip>
          {plannedWindow && (
            <Chip>
              期間 {new Date(plannedWindow.startMs).toLocaleTimeString()} -{' '}
              {new Date(plannedWindow.endMs).toLocaleTimeString()}
            </Chip>
          )}
        </View>
      </View>

      {/* 本文 */}
      <ScrollView className="flex-1 px-4">
        {/* 自分の結果カード */}
        {myRow && (
          <View
            className="mt-3 rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-900/20"
            style={{
              ...(Platform.OS === 'android'
                ? { elevation: 1 }
                : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }),
            }}
          >
            <Text className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">あなたの結果</Text>
            <View className="mt-2 flex-row items-end justify-between">
              <View>
                <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                  {msToClock(myRow.totalMs)}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  集中時間（presenceベース）
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{myXP}</Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">獲得XP</Text>
              </View>
            </View>
          </View>
        )}

        {/* ランキング */}
        <View className="mt-6">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">ランキング</Text>
          <View className="mt-2 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {ranks.length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-neutral-500 dark:text-neutral-400">データがありません</Text>
              </View>
            ) : (
              ranks.map((r, idx) => {
                const me = r.uid === user?.uid;
                const rankLabel = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                return (
                  <View
                    key={r.uid}
                    className={`flex-row items-center justify-between px-4 py-3 ${idx !== ranks.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''} ${me ? 'bg-neutral-50 dark:bg-neutral-800/40' : ''}`}
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="w-6 text-center text-base">{rankLabel}</Text>
                      <View>
                        <Text className="text-[15px] font-medium text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                          {room.memberProfiles?.[r.uid]?.displayName ?? r.displayName ?? r.uid.slice(0, 6)}
                          {me ? '（あなた）' : ''}
                        </Text>
                        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {msToClock(r.totalMs)}
                        </Text>
                      </View>
                    </View>
                    {/* 進捗バー（小さめ） */}
                    <View className="w-[34%] items-end">
                      <View className="h-[6px] w-full rounded bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                        <View
                          className="h-full bg-emerald-500 dark:bg-emerald-400"
                          style={{
                            width: `${Math.min(100, Math.round((r.totalMs / (totalMs || 1)) * 100))}%`,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* 保存（ホストのみ） */}
        {isHost ? (
          <Pressable
            onPress={saveResult}
            className={`mt-6 mb-10 self-center rounded-2xl px-5 py-3 ${saved ? 'bg-neutral-300' : 'bg-neutral-900 dark:bg-white'}`}
          >
            <Text className={`font-semibold ${saved ? 'text-neutral-700' : 'text-white dark:text-neutral-900'}`}>
              {saved ? '保存済み' : 'この結果を保存'}
            </Text>
          </Pressable>
        ) : (
          <View className="mb-10" />
        )}
      </ScrollView>
    </View>
  );
}