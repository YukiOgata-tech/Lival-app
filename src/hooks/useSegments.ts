// src/hooks/useSegments.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

type Mode = 'idle' | 'focus' | 'break';
type FireTs = { toMillis?: () => number } | null | undefined;

type Props = {
  hostUserId?: string;
  mode?: Mode;
  minutes?: number;
  startedAt?: FireTs;
  index?: number;
};

function fmt(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function useSegments(roomId: string, props: Props) {
  const { user } = useAuth();
  const isHost = user?.uid && props.hostUserId === user.uid;
  const roomRef = useMemo(() => doc(firestore, 'rooms', roomId), [roomId]);

  // Firestore → ローカルへ反映（片方向）
  const [state, setState] = useState(() => ({
    mode: (props.mode ?? 'idle') as Mode,
    minutes: props.minutes ?? 0,
    startedAt: props.startedAt ?? null,
    index: props.index ?? 0,
  }));
  useEffect(() => {
    setState({
      mode: (props.mode ?? 'idle') as Mode,
      minutes: props.minutes ?? 0,
      startedAt: props.startedAt ?? null,
      index: props.index ?? 0,
    });
  }, [props.mode, props.minutes, props.startedAt, props.index]);

  // カウントダウン（セグメント専用。ROOM本体とは独立）
  const [now, setNow] = useState(Date.now());
  type IntervalId = ReturnType<typeof setInterval>;
  const timer = useRef<IntervalId | null>(null);
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  }, []);
  const segStartMs = typeof state.startedAt?.toMillis === 'function'
    ? state.startedAt!.toMillis!()
    : null;
  const segTotalMs = (state.minutes ?? 0) * 60_000;
  const segElapsed = state.mode === 'idle' || !segStartMs ? 0 : now - segStartMs;
  const segRemain = Math.max(0, segTotalMs - segElapsed);
  const countdown = {
    clock: state.mode === 'idle' ? '--:--' : fmt(segRemain),
    progress: state.mode === 'idle' || segTotalMs <= 0 ? 0 : Math.min(1, segElapsed / segTotalMs),
  };

  const [pending, setPending] = useState(false);

  const startFocus = useCallback(
    async (m = 25) => {
      if (!isHost) return;
      setPending(true);
      try {
        // ★ ROOM本体フィールド（minutes / sessionStartAt / status）は触らない
        await updateDoc(roomRef, {
          segmentMode: 'focus',
          segmentMinutes: m,
          segmentStartedAt: serverTimestamp(),
          segmentIndex: (state.index ?? 0) + 1,
          updatedAt: serverTimestamp(),
        } as any);
      } finally {
        setPending(false);
      }
    },
    [isHost, roomRef, state.index]
  );

  const startBreak = useCallback(
    async (m = 5) => {
      if (!isHost) return;
      setPending(true);
      try {
        await updateDoc(roomRef, {
          segmentMode: 'break',
          segmentMinutes: m,
          segmentStartedAt: serverTimestamp(),
          segmentIndex: (state.index ?? 0) + 1,
          updatedAt: serverTimestamp(),
        } as any);
      } finally {
        setPending(false);
      }
    },
    [isHost, roomRef, state.index]
  );

  const stop = useCallback(async () => {
    if (!isHost) return;
    setPending(true);
    try {
      // ★ 停止=セグメント終了。ROOMを終わらせない。
      await updateDoc(roomRef, {
        segmentMode: 'idle',
        // 保持したいなら minutes を残してもOK。UI上は mode が idle なら非表示。
        // segmentMinutes: null,
        // segmentStartedAt: null,
        updatedAt: serverTimestamp(),
      } as any);
    } finally {
      setPending(false);
    }
  }, [isHost, roomRef]);

  return {
    state,
    countdown,
    isHost: !!isHost,
    pending,
    startFocus,
    startBreak,
    stop,
  };
}

export default useSegments;
