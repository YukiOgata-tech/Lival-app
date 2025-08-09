// src/components/session-related/RoomInfoHeader.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { firestore } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

type TimestampLike = { toMillis?: () => number } | null | undefined;

type RoomData = {
  roomName: string;
  goal?: string;
  minutes?: number;                  // エントランスで設定した分数
  roomTag?: string;                  // 'general' | 'study' | 'work' など
  hostUserId: string;
  members?: string[];
  createdAt?: TimestampLike;         // サーバ時刻推奨
  sessionStartAt?: TimestampLike;    // 任意：開始ボタン等で明示開始する場合
  sessionForceEndedAt?: TimestampLike; // 終了ボタン押下時に保存
};

type Props = {
  roomData: RoomData;
  roomId: string;
};

/* ------------------------------ utils ------------------------------ */
function tagToLabel(tag?: string) {
  if (!tag) return '一般用';
  const t = String(tag).toLowerCase();
  if (t === 'general' || t === '一般') return '一般用';
  if (t === 'study'   || t === '学習') return '学習用';
  if (t === 'work'    || t === '仕事' || t === '作業') return '作業用';
  if (t === 'focus'   || t === '集中') return '集中用';
  // 日本語ならそのまま“用”を付与、それ以外も “用” を付ける
  return /[一-龠ぁ-ゔァ-ヴー]/.test(tag) ? `${tag}用` : `${tag}用`;
}

function millis(v?: TimestampLike): number | undefined {
  if (!v) return undefined;
  // @ts-ignore
  if (typeof v?.toMillis === 'function') return v.toMillis();
  return undefined;
}

/* ---- このファイル内だけで完結するミニカウントダウン（小さく表示する想定） ---- */
function useSessionCountdownLocal(src: {
  minutes?: number;
  sessionStartAt?: TimestampLike;
  createdAt?: TimestampLike;
  sessionForceEndedAt?: TimestampLike;
}) {
  const totalMs = useMemo(() => Math.max(0, Math.floor((src.minutes ?? 0) * 60_000)), [src.minutes]);
  const startMs = useMemo(
    () => millis(src.sessionStartAt) ?? millis(src.createdAt) ?? Date.now(),
    [src.sessionStartAt, src.createdAt]
  );
  const plannedEnd = useMemo(() => startMs + totalMs, [startMs, totalMs]);
  const forceEnd = millis(src.sessionForceEndedAt);
  const effectiveEnd = useMemo(
    () => (forceEnd ? Math.min(forceEnd, plannedEnd) : plannedEnd),
    [forceEnd, plannedEnd]
  );

  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 0.5秒刻みの軽量タイマー（見た目は小さい表示なので十分）
    timerRef.current = setInterval(() => setNow(Date.now()), 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const remaining = Math.max(0, effectiveEnd - now);
  const elapsed = Math.max(0, Math.min(now - startMs, totalMs));
  const progress = totalMs > 0 ? Math.min(1, elapsed / totalMs) : 0;
  const isOver = remaining <= 0;

  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);
  const clock = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return { clock, progress, isOver };
}

function CountdownChip({
  minutes,
  sessionStartAt,
  createdAt,
  sessionForceEndedAt,
}: {
  minutes?: number;
  sessionStartAt?: TimestampLike;
  createdAt?: TimestampLike;
  sessionForceEndedAt?: TimestampLike;
}) {
  const { clock, progress, isOver } = useSessionCountdownLocal({
    minutes,
    sessionStartAt,
    createdAt,
    sessionForceEndedAt,
  });

  return (
    <View className="flex-row items-center gap-2">
      <View className="rounded-full px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800">
        <Text className="text-[12px] text-neutral-700 dark:text-neutral-200">残り {clock}</Text>
      </View>
      <View className="h-[4px] w-20 rounded bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        <View
          className="h-full bg-emerald-500 dark:bg-emerald-400"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>
      {isOver && (
        <View className="rounded-full px-2 py-0.5 bg-red-50 dark:bg-red-900/30">
          <Text className="text-[10px] text-red-600 dark:text-red-300">終了</Text>
        </View>
      )}
    </View>
  );
}

/* ------------------------------ Header ------------------------------ */
export default function RoomInfoHeader({ roomData, roomId }: Props) {
  const { top } = useSafeAreaInsets();
  const nav = useNavigation();
  const { user } = useAuth();
  const isHost = user?.uid === roomData.hostUserId;

  const onEndPress = () => {
    Alert.alert('セッションを終了しますか？', '終了すると結果画面に移動します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '終了する',
        style: 'destructive',
        onPress: async () => {
          try {
            // 集計・XP計算の共通終端として保存（各端末のカウントダウンも即ゼロへ）
            await updateDoc(doc(firestore, 'rooms', roomId), {
              sessionForceEndedAt: serverTimestamp(),
            });
          } catch (_) {}
          // TODO: 結果画面のルート名に合わせて変更してください
          // 例）nav.navigate('RoomResult' as never, { roomId } as never);
          // ここでは汎用的に roomId を渡しておきます
          // @ts-ignore
          nav.navigate('RoomResult', { roomId });
        },
      },
    ]);
  };

  const chips: string[] = [
    tagToLabel(roomData.roomTag),
    roomData.minutes ? `${roomData.minutes}分` : '',
    `${roomData.members?.length ?? 0}人`,
  ].filter(Boolean) as string[];

  return (
    <View className="bg-white dark:bg-neutral-900" style={{ paddingTop: top + 8 }}>
      <View
        className="mx-3 mb-3 rounded-2xl px-4 pt-3 pb-3 bg-white/95 dark:bg-neutral-900/95"
        style={{
          ...(Platform.OS === 'android'
            ? { elevation: 2 }
            : {
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }),
        }}
      >
        {/* タイトル & 終了ボタン（ホストのみ） */}
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 pr-2">
            <Text numberOfLines={1} className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {roomData.roomName || 'セッション'}
            </Text>
            <Text numberOfLines={1} className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">
              {roomData.goal || '目標未設定'} ／ {isHost ? 'ホスト' : '参加者'}として参加中
            </Text>
          </View>

          {isHost && (
            <Pressable
              onPress={onEndPress}
              hitSlop={8}
              className="rounded-2xl px-3 py-2 bg-red-500 active:bg-red-600"
              style={{
                ...(Platform.OS === 'android'
                  ? { elevation: 2 }
                  : {
                      shadowColor: '#000',
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                    }),
              }}
            >
              <Text className="text-white font-semibold">終了</Text>
            </Pressable>
          )}
        </View>

        {/* 情報チップ（折り返し対応）＋ 右側に小さめカウントダウン */}
        <View className="mt-3 flex-row items-center justify-between gap-3">
          <View className="flex-row flex-wrap gap-2">
            {chips.map((c) => (
              <View
                key={c}
                className="rounded-full px-3 py-1 bg-neutral-100 dark:bg-neutral-800"
                style={{
                  ...(Platform.OS === 'android'
                    ? { elevation: 1 }
                    : {
                        shadowColor: '#000',
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                      }),
                }}
              >
                <Text className="text-[12px] text-neutral-700 dark:text-neutral-200">{c}</Text>
              </View>
            ))}
          </View>

          <CountdownChip
            minutes={roomData.minutes}
            sessionStartAt={roomData.sessionStartAt ?? roomData.createdAt}
            sessionForceEndedAt={roomData.sessionForceEndedAt}
            createdAt={roomData.createdAt}
          />
        </View>
      </View>
    </View>
  );
}