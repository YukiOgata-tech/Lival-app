// functions/src/onFriendRequestAccept.ts
import * as functions from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// 初期化が複数回走らないようにする
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * users/{receiverId}/friendRequests/{senderId} の status が
 * pending → accepted に変わった瞬間、双方の friends を作成し
 * friendCount をインクリメントし、リクエストを削除する。
 */
export const onFriendRequestAccept = functions.onDocumentUpdated(
  "users/{receiverId}/friendRequests/{senderId}", // ★修正点: 正しいコレクションパスを監視
  async (event) => {
    interface ReqData {
      status: string;
      senderId: string;
      receiverId: string;
    }
    const before = event.data?.before.data() as ReqData;
    const after = event.data?.after.data() as ReqData;

    if (!before || !after) return;

    // status が pending -> accepted に変わったことを確認
    if (before.status === "pending" && after.status === "accepted") {
      const {senderId, receiverId} = event.params;

      if (!senderId || !receiverId) {
        console.error("Missing senderId or receiverId from event params");
        return;
      }

      const senderDoc = await db.doc(`users/${senderId}`).get();
      const receiverDoc = await db.doc(`users/${receiverId}`).get();

      const senderName = senderDoc.data()?.displayName ?? "";
      const receiverName = receiverDoc.data()?.displayName ?? "";

      const batch = db.batch();
      const since = admin.firestore.FieldValue.serverTimestamp();

      // 相互の friends サブコレクションにドキュメントを作成
      batch.set(db.doc(`users/${receiverId}/friends/${senderId}`), {since, name: senderName});
      batch.set(db.doc(`users/${senderId}/friends/${receiverId}`), {since, name: receiverName});

      // 双方の friendCount をインクリメント
      const increment = admin.firestore.FieldValue.increment(1);
      batch.update(db.doc(`users/${receiverId}`), {friendCount: increment});
      batch.update(db.doc(`users/${senderId}`), {friendCount: increment});

      // 処理済みのリクエストを削除
      if (event.data?.after.ref) {
        batch.delete(event.data.after.ref);
      }

      await batch.commit();
      console.log(`Friendship created and count updated between ${senderId} ↔ ${receiverId}`);
    }
  }
);
