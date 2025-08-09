// src/lib/GroupSession-related/groupLog.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

/** グループチャット用のシステムログをタイムラインに1件追加 */
export async function postGroupLog(roomId: string, text: string) {
  try {
    const col = collection(firestore, 'rooms', roomId, 'groupChats');
    const ref = await addDoc(col, {
      userId: null,
      type: 'log',
      text,
      createdAt: serverTimestamp(),
    });
    console.log('[groupLog] added:', ref.id, text);
  } catch (e: any) {
    console.warn('[groupLog] failed:', e?.code, e?.message);
  }
}
