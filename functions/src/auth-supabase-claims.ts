import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

// Gen2 HTTPSトリガー: ユーザー作成後にクライアントから呼び出してSupabase用のroleクレームを設定
export const setSupabaseRoleOnCreate = onCall(async (request) => {
  // 認証チェック（オプション - 必要に応じて）
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const uid = request.auth.uid;
  
  try {
    logger.info(`[setSupabaseRoleOnCreate] invoked by uid=${uid}`);
    // 現在のユーザー情報を取得
    const user = await getAuth().getUser(uid);
    const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
    
    // 既にroleが設定されている場合はスキップ
    if (existingClaims.role === "authenticated") {
      logger.info(`setSupabaseRoleOnCreate: Role already set for user ${uid}`);
      return { success: true, message: "Role already set" };
    }
    
    // roleクレームを追加
    const merged = { ...existingClaims, role: "authenticated" };
    await getAuth().setCustomUserClaims(uid, merged);
    
    logger.info(`setSupabaseRoleOnCreate: Custom claim 'role: authenticated' set for user ${uid}`);
    
    return { success: true, message: "Role set successfully" };
  } catch (err) {
    logger.error(`setSupabaseRoleOnCreate: Failed to set custom claim for user ${uid}`, err);
    throw new HttpsError('internal', 'Failed to set custom claims');
  }
});
