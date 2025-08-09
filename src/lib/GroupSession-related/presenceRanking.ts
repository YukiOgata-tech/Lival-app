// src/lib/GroupSession-related/presenceRanking.ts
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export type Stay = { startAt: Timestamp; endAt?: Timestamp | null };
export type RankItem = { uid: string; displayName?: string | null; totalMs: number };

// セッション用export
export function clampToSessionWindow(sessionStartMs?: number, sessionEndMs?: number) {
  if (sessionStartMs == null || sessionEndMs == null) return null;
  return { startMs: sessionStartMs, endMs: sessionEndMs };
}

function clampInterval(start: number, end: number, clampStart?: number, clampEnd?: number) {
  const s = Math.max(start, clampStart ?? start);
  const e = Math.min(end, clampEnd ?? end);
  return Math.max(0, e - s);
}

/**
 * 指定ルームの members について、presence/stays を集計してランキングを返す
 * @param roomId
 * @param sessionStartMs セッション開始（未指定なら無制限）
 * @param sessionEndMs   セッション終了（未指定なら未クローズ区間は「今」で代用）
 */
export async function buildPresenceRanking(roomId: string, sessionStartMs?: number, sessionEndMs?: number) {
  // ルーム情報とメンバー一覧の取得
  const roomSnap = await getDoc(doc(firestore, 'rooms', roomId));
  if (!roomSnap.exists()) return [];
  const room = roomSnap.data() as any;
  const members: string[] = room.members ?? [];

  // 開いている区間の終端に使う「今 or セッション終了時刻」
  const nowMs = Date.now();
  const openEnd = sessionEndMs ?? nowMs;

  const results: RankItem[] = [];

  for (const uid of members) {
    const staysSnap = await getDocs(collection(firestore, 'rooms', roomId, 'presence', uid, 'stays'));
    let totalMs = 0;

    staysSnap.forEach((d) => {
      const data = d.data() as any as Stay;
      const startMs = data.startAt?.toMillis?.() ?? 0;
      const endMs   = data.endAt?.toMillis?.() ?? openEnd;
      totalMs += clampInterval(startMs, endMs, sessionStartMs, sessionEndMs);
    });

    results.push({ uid, displayName: room.memberProfiles?.[uid]?.displayName ?? null, totalMs });
  }

  // 降順でランキング
  results.sort((a, b) => b.totalMs - a.totalMs);
  return results;
}
