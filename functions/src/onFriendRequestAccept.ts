// functions/src/onFriendRequestAccept.ts
import * as functions from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * users/{receiverId}/friendRequests/{senderId} の status が
 * pending → accepted に変わった瞬間、双方の friends を作成し
 * リクエストを削除する。
 */
export const onFriendRequestAccept = functions.onDocumentUpdated(
  "users/{receiverId}/friendRequests/{senderId}",
  async (event) => {
    interface ReqData { status: string; /* ... */ }
    const before = event.data?.before.data() as ReqData;
    const after = event.data?.after.data() as any;

    if (!before || !after) return; // 新規作成/削除はスキップ
    if (before.status === "pending" && after.status === "accepted") {
      const {receiverId, senderId} = event.params;
      const batch = db.batch();
      const since = admin.firestore.FieldValue.serverTimestamp();

      batch.set(db.doc(`users/${receiverId}/friends/${senderId}`), {since});
      batch.set(db.doc(`users/${senderId}/friends/${receiverId}`), {since});

      // リクエスト削除（履歴を残したいなら削除しなくても OK）
      if (event.data?.after.ref) {
        batch.delete(event.data.after.ref);
      }

      await batch.commit();
      console.log(`Friendship created between ${senderId} ↔ ${receiverId}`);
    }
  }
);
