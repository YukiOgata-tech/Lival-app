import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

// 任意タイミングで role: 'authenticated' を恒久的なカスタムクレームとして付与
export const ensureSupabaseAuthenticatedClaim = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  
  const uid = request.auth.uid;
  
  try {
    const user = await getAuth().getUser(uid);
    const existing = (user.customClaims ?? {}) as Record<string, unknown>;
    
    // 既にroleが設定されている場合は早期リターン（パフォーマンス向上）
    if (existing.role === "authenticated") {
      logger.info(`ensureSupabaseAuthenticatedClaim: Role already set for user ${uid}`);
      return { ok: true, uid, claims: existing, message: "Role already set" };
    }
    
    const merged = { ...existing, role: "authenticated" };
    await getAuth().setCustomUserClaims(uid, merged);
    
    logger.info(`ensureSupabaseAuthenticatedClaim: Custom claim 'role: authenticated' set for user ${uid}`);
    
    return { ok: true, uid, claims: merged, message: "Role set successfully" };
  } catch (error) {
    logger.error(`ensureSupabaseAuthenticatedClaim: Failed for user ${uid}`, error);
    throw new HttpsError('internal', 'Failed to set custom claims');
  }
});