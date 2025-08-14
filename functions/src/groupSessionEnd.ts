import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/* ====== 調整パラメータ ====== */
const REGION = process.env.TASKS_LOCATION || 'asia-northeast1';

const XP_PER_MINUTE = 4;
const ROOM_XP_CAP    = 600;

const GROUP_STEP = 0.015;
const GROUP_CAP  = 1.15;

const RANK_BONUS_THRESH = 7;
const RANK_BONUS: Record<number, number> = { 1: 0.15, 2: 0.08, 3: 0.04 };

const COIN_PER_MINUTE = 2;

/* ====== ユーティリティ ====== */
function levelFromXp(total: number): number {
  let lv = 0;
  while ((lv + 1) * (lv + 1) * 120 <= total) lv++;
  return lv;
}
function resolvePlannedMinutes(room: any): number {
  return Number(room?.minutes ?? room?.plannedMinutes ?? 0) || 0;
}
function calcActualMinutes(room: any) {
  const start = room?.sessionStartAt?.toMillis?.();
  if (!start) return 0;
  const forcedEnd = room?.sessionForceEndedAt?.toMillis?.();
  const planned   = resolvePlannedMinutes(room);
  const plannedEnd = start + planned * 60_000;
  const end = typeof forcedEnd === 'number' ? forcedEnd : plannedEnd;
  const diffMs = Math.max(0, end - start);
  return Math.floor(diffMs / 60_000);
}
function groupMultiplier(n: number) {
  return Math.min(GROUP_CAP, 1 + Math.max(0, n - 1) * GROUP_STEP);
}
function rankBonusPct(rank: number | undefined, members: number) {
  if (!rank || members < RANK_BONUS_THRESH) return 0;
  return RANK_BONUS[rank] ?? 0;
}

/** 終了トリガ（強制 or 自動）で XP/コイン付与（v2） */
export const onGroupSessionEnded = onDocumentUpdated(
  { document: 'rooms/{roomId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data() as any;
    const after  = event.data?.after?.data()  as any;
    const roomId = event.params.roomId as string;

    const nowEndedByForce = !!after?.sessionForceEndedAt && !before?.sessionForceEndedAt;
    const nowEndedByStatus = before?.status !== 'ended' && after?.status === 'ended';
    if (!nowEndedByForce && !nowEndedByStatus) return;

    const members: string[] = Array.isArray(after?.members) ? after.members : [];
    if (!members.length) return;

    const minutes = calcActualMinutes(after);
    if (minutes <= 0) return;

    const n = members.length;
    const gMult = groupMultiplier(n);
    const basePerMember = minutes * XP_PER_MINUTE;

    // ランキング（任意）
    const rankIndex: Record<string, number> = {};
    try {
      const rankSnap = await db.doc(`rooms/${roomId}/ranking/server`).get();
      const ordered: string[] = rankSnap.exists ? (rankSnap.data()?.orderedUids ?? []) : [];
      ordered.forEach((uid, i) => (rankIndex[uid] = i + 1));
    } catch { /* noop */ }

    const startMs = after?.sessionStartAt?.toMillis?.() ?? Date.now();
    const endMs   = (after?.sessionForceEndedAt?.toMillis?.())
                 ?? (startMs + resolvePlannedMinutes(after) * 60_000);
    const txnBase = `roomEnd:${roomId}:${startMs}-${endMs}`;

    await Promise.all(
      members.map(async (uid) => {
        const userRef   = db.doc(`users/${uid}`);
        const ledgerRef = db.doc(`users/${uid}/xpLedger/${txnBase}:${uid}`);

        await db.runTransaction(async (tx) => {
          const led = await tx.get(ledgerRef);
          if (led.exists) return;

          const uSnap = await tx.get(userRef);
          const curXp    = Number(uSnap.data()?.xp ?? 0);
          const curCoins = Number(uSnap.data()?.coins ?? 0);

          const rank = rankIndex[uid];
          const rankPct = rankBonusPct(rank, n);

          let xp = Math.round(basePerMember * gMult * (1 + rankPct));
          if (xp > ROOM_XP_CAP) xp = ROOM_XP_CAP;
          if (xp < 0) xp = 0;

          const coins = Math.max(0, Math.floor(minutes * COIN_PER_MINUTE));

          const nextXp = curXp + xp;
          const nextLv = levelFromXp(nextXp);

          tx.set(ledgerRef, {
            roomId,
            cause: 'group_room_end',
            amount: xp,
            coinsGained: coins,
            minutes,
            membersCount: n,
            multipliers: { gMult, rankPct },
            period: {
              startAt: admin.firestore.Timestamp.fromMillis(startMs),
              endAt:   admin.firestore.Timestamp.fromMillis(endMs),
            },
            txnKey: `${txnBase}:${uid}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          tx.set(userRef, {
            xp: nextXp,
            level: nextLv,
            coins: curCoins + coins,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            groupSessionCount: (uSnap.data()?.groupSessionCount ?? 0) + 1,
            groupTotalMinutes: (uSnap.data()?.groupTotalMinutes ?? 0) + minutes,
          }, { merge: true });
        });
      })
    );
  }
);
