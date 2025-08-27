import {onCall, CallableRequest} from "firebase-functions/v2/https";

import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

// マイグレーション関数をエクスポート
export {migrateExistingUsers} from "./migrations/user-migration";



interface InitializeUserRequest {
  platform?: "web" | "mobile";
}

// ユーザー作成時のデータベース初期化（Web・Mobile共通）
export const initializeUserData = onCall<InitializeUserRequest>(
  async (request: CallableRequest<InitializeUserRequest>) => {
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

      // ユーザーが既に存在する場合は何もしない
      if (userDoc.exists) {
        logger.log("User already exists:", uid);
        return {success: true, message: "User already initialized"};
      }

      // トークン情報の安全な取得
      const authToken = request.auth.token;
      const email = authToken?.email || null;
      const displayName = authToken?.name || email?.split("@")[0] || "ユーザー";
      const photoURL = authToken?.picture || "";
      const emailVerified = authToken?.email_verified || false;

      // 既存Web版構造と互換性のあるユーザー初期データを作成
      const userData = {
      // 基本プロフィール情報
        bio: "",
        birthday: null,
        displayName,
        email,
        emailVerified,
        gender: null,
        photoURL,
        role: "user" as const, // "admin" | "user" | "moderator"

        // ゲーミフィケーション要素（既存構造維持）
        coins: 100, // 初回ボーナス
        xp: 0,
        level: 1,
        currentMonsterId: "monster-01",

        // 学習データ（既存構造維持）
        groupSessionCount: 0,
        groupTotalMinutes: 0,
        individualSessionCount: 0,
        individualTotalMinutes: 0,

        // システム情報
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),

        // Web版専用フィールド（既存構造維持）
        subscription: {
          plan: (request.data?.platform === "mobile" ? "free" : "free_web") as
      | "free"
      | "free_web",
          status: "active" as const,
          currentPeriodStart: FieldValue.serverTimestamp(),
          currentPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        },
        webProfile: {
          lastWebLogin: FieldValue.serverTimestamp(),
          isWebUser: request.data?.platform !== "mobile",
          preferences: {
            theme: "light" as const,
            notifications: true,
            language: "ja" as const,
          },
        },

        // モバイル版専用フィールド（将来の統合用）
        mobileProfile: request.data?.platform === "mobile" ? {
          grade: null,
          school: null,
          subjects: [],
          goals: [],
          streak: 0,
          lastActiveAt: FieldValue.serverTimestamp(),
          platform: "mobile" as const,
          version: "1.0.0",
        } : null,
      };

      await userRef.set(userData);

      logger.log("User initialized successfully:", uid, {
        platform: request.data?.platform || "web",
        role: userData.role,
        subscription: userData.subscription.plan,
      });

      return {
        success: true,
        message: "User initialized successfully",
        userData: {
          displayName: userData.displayName,
          role: userData.role,
          subscription: userData.subscription,
          coins: userData.coins,
          xp: userData.xp,
          level: userData.level,
        },
      };
    } catch (error) {
      logger.error("Error initializing user data:", error);
      throw new Error("Failed to initialize user data");
    }
  });
