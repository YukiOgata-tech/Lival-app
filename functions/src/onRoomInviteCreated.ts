import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REGION = process.env.TASKS_LOCATION || 'asia-northeast1';

/**
 * Expo Push 送信（Node 20 は fetch 内蔵）
 * tokens: ExponentPushToken[...] の配列
 * payload: { title, body, data }
 */
async function sendExpoPush(tokens: string[], payload: { title: string; body: string; data?: any }) {
  const valid = tokens.filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (!valid.length) return;

  // Expoは配列でまとめて送れる（最大100件/リクエスト推奨）
  const chunks: string[][] = [];
  for (let i = 0; i < valid.length; i += 100) chunks.push(valid.slice(i, i + 100));

  for (const chunk of chunks) {
    const messages = chunk.map(token => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      priority: 'high',
    }));
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn('[onRoomInviteCreated] Expo push failed', res.status, txt);
    }
  }
}

/**
 * 招待作成 → 受け手にプッシュ通知。
 *
 * ドキュメント構造の想定（必要に応じてフィールド名だけ合わせてください）:
 * - パス: rooms/{roomId}/invites/{inviteId}
 * - フィールド例:
 *   { fromUid: string, toUids?: string[], toUid?: string, message?: string }
 *
 * users/{uid}.expoPushTokens: string[] に Expoトークンが入っている想定。
 */
export const onRoomInviteCreated = onDocumentCreated(
  { document: 'rooms/{roomId}/invites/{inviteId}', region: REGION },
  async (event) => {
    const invite = event.data?.data() as any;
    if (!invite) return;

    const roomId = event.params.roomId as string;
    const fromUid: string | undefined = invite.fromUid;
    const list = Array.isArray(invite.toUids)
      ? (invite.toUids as string[])
      : invite.toUid
      ? [String(invite.toUid)]
      : [];

    if (!list.length) return;

    // ルーム名などをタイトルに使えるよう取得（任意）
    let roomName = 'ROOM';
    try {
      const r = await db.doc(`rooms/${roomId}`).get();
      roomName = (r.data()?.roomName as string) ?? roomName;
    } catch {}

    // 送信者名（任意）
    let fromName = 'someone';
    try {
      if (fromUid) {
        const u = await db.doc(`users/${fromUid}`).get();
        fromName = (u.data()?.displayName || u.data()?.name || 'someone') as string;
      }
    } catch {}

    // 受信者のExpoトークンを集める
    const tokenSet = new Set<string>();
    const userSnaps = await Promise.all(list.map(uid => db.doc(`users/${uid}`).get()));
    userSnaps.forEach(s => {
      const arr: string[] = (s.data()?.expoPushTokens ?? []) as string[];
      arr?.forEach(t => tokenSet.add(t));
    });

    const tokens = Array.from(tokenSet);
    if (!tokens.length) return;

    const title = `${fromName} から招待`;
    const body =
      invite.message?.trim()?.slice(0, 80) ||
      `${roomName} に参加しませんか？`;
    const data = { type: 'room-invite', roomId, fromUid };

    await sendExpoPush(tokens, { title, body, data });

    // （任意）通知済みフラグ
    try {
      await event.data?.ref.set(
        { notifiedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    } catch {}
  }
);
