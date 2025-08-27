import {onCall, CallableRequest} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

/**
 * 既存ユーザーデータのマイグレーション関数
 * 既存のWeb版ユーザーに不足しているフィールドを追加
 */
export const migrateExistingUsers = onCall(async (request: CallableRequest) => {
  // 認証情報の確認
  if (!request.auth) {
    throw new Error("Authentication required");
  }

  const uid = request.auth.uid;

  if (!uid) {
    throw new Error("User ID not found in authentication context");
  }

  const db = getFirestore();

  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User does not exist");
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    // roleフィールドがない場合は追加
    if (!userData?.role) {
      updates.role = "user";
    }

    // mobileProfileフィールドがない場合はnullで追加
    if (!Object.prototype.hasOwnProperty.call(userData, "mobileProfile")) {
      updates.mobileProfile = null;
    }

    // webProfileの構造チェック
    if (!userData?.webProfile) {
      updates.webProfile = {
        lastWebLogin: FieldValue.serverTimestamp(),
        isWebUser: true,
        preferences: {
          theme: "light" as const,
          notifications: true,
          language: "ja" as const,
        },
      };
    }

    // subscriptionの構造チェック
    if (!userData?.subscription) {
      updates.subscription = {
        plan: "free_web" as const,
        status: "active" as const,
        currentPeriodStart: FieldValue.serverTimestamp(),
        currentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    } else {
      // subscription構造の修正
      const subscription = userData.subscription as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(subscription, "stripeCustomerId")) {
        updates["subscription.stripeCustomerId"] = null;
      }
      if (!Object.prototype.hasOwnProperty.call(subscription, "stripeSubscriptionId")) {
        updates["subscription.stripeSubscriptionId"] = null;
      }
    }

    // 不足フィールドの追加
    const requiredFields = [
      "bio", "birthday", "gender", "currentMonsterId",
      "coins", "xp", "level",
      "groupSessionCount", "groupTotalMinutes",
      "individualSessionCount", "individualTotalMinutes",
    ];

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(userData, field)) {
        switch (field) {
        case "bio":
          updates[field] = "";
          break;
        case "birthday":
        case "gender":
          updates[field] = null;
          break;
        case "currentMonsterId":
          updates[field] = "monster-01";
          break;
        case "coins":
          updates[field] = 100; // 既存ユーザーにもボーナス
          break;
        case "xp":
          updates[field] = 0;
          break;
        case "level":
          updates[field] = 1;
          break;
        case "groupSessionCount":
        case "groupTotalMinutes":
        case "individualSessionCount":
        case "individualTotalMinutes":
          updates[field] = 0;
          break;
        default:
          // TypeScript exhaustiveness check
          break;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = FieldValue.serverTimestamp();
      await userRef.update(updates);

      logger.log("User migrated successfully:", uid, {
        updatedFields: Object.keys(updates),
      });

      return {
        success: true,
        message: "User data migrated successfully",
        updatedFields: Object.keys(updates),
      };
    } else {
      return {
        success: true,
        message: "No migration needed",
        updatedFields: [],
      };
    }
  } catch (error) {
    logger.error("Error migrating user data:", error);
    throw new Error("Failed to migrate user data");
  }
});
