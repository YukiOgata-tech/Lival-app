import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

//const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = admin.firestore();

export const settleOnRequest = onDocumentCreated('rooms/{roomId}/_settlements/{sid}', async (event) => {
  const roomRef = event.params.roomId
    ? db.collection('rooms').doc(event.params.roomId)
    : null;
  if (!roomRef) return;

  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) return;
  const room = roomSnap.data() as any;

  // すでに精算済みなら何もしない
  if (room.finalizedAt) {
    await event.data?.ref.update({ skipped: 'already_finalized', at: admin.firestore.FieldValue.serverTimestamp() });
    return;
  }
  // 終了していなければスキップ（手動/自動終了どちらでもOK）
  if (room.status !== 'ended') {
    await event.data?.ref.update({ skipped: 'not_ended', at: admin.firestore.FieldValue.serverTimestamp() });
    return;
  }

  // minutes の算出（開始〜終了／計画分でクランプ）
  const start = room.sessionStartAt?.toDate?.()?.getTime?.() ?? room.createdAt?.toDate?.()?.getTime?.();
  const planned = Number(room.minutes ?? 0);
  const forced = room.sessionForceEndedAt?.toDate?.()?.getTime?.();
  if (!start || !planned) return;

  const plannedEnd = start + planned * 60_000;
  const end = forced ?? plannedEnd;
  const elapsedMin = Math.max(0, Math.floor((end - start) / 60_000));
  const minutes = Math.min(planned, elapsedMin);

  // ここはあなたのXP/コイン計算に合わせて（最小実装）
  const coins = minutes * 2;
  const xp = minutes * 10;

  const members: string[] = Array.isArray(room.members) ? room.members : [];
  await db.runTransaction(async (tx) => {
    for (const uid of members) {
      const uref = db.collection('users').doc(uid);
      const usnap = await tx.get(uref);
      const cur = usnap.exists ? (usnap.data() as any) : {};
      tx.set(uref, {
        xp: Number(cur.xp ?? 0) + xp,
        coins: Number(cur.coins ?? 0) + coins,
        groupSessionCount: Number(cur.groupSessionCount ?? 0) + 1,
        groupTotalMinutes: Number(cur.groupTotalMinutes ?? 0) + minutes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    tx.update(roomRef, { finalizedAt: admin.firestore.FieldValue.serverTimestamp() });
    // 任意：結果スナップ・メモなど
  });

  await event.data?.ref.update({ doneAt: admin.firestore.FieldValue.serverTimestamp(), minutes, xp, coins });
});
