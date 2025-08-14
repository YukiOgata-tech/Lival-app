// src/hooks/useResultResume.ts
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export type ResultNotice = { roomId: string; roomName?: string | null };

export function useResultResume(uid?: string | null) {
  const [notice, setNotice] = useState<ResultNotice | null>(null);
  const listening = useRef(false);

  useEffect(() => {
    if (!uid) return;
    if (listening.current) return;
    listening.current = true;

    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;

      try {
        const roomsCol = collection(firestore, 'rooms');
        const q = query(
          roomsCol,
          where('members', 'array-contains', uid),
          where('status', '==', 'ended'),
          orderBy('finalizedAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        const doc = snap.docs[0];
        const data = doc.data() as any;

        // 既に見たならスキップ
        if (data?.seenBy?.[uid] === true) return;

        setNotice({ roomId: doc.id, roomName: data?.roomName ?? null });
      } catch {}
    });

    // 起動直後にも1回チェック
    (async () => {
      sub.listener?.('active');
    })();

    return () => sub.remove();
  }, [uid]);

  return { notice, clear: () => setNotice(null) };
}
