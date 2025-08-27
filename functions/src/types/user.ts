// 既存Web版構造と互換性を持つユーザーデータ型定義

export type Gender = "male" | "female";
export type SubscriptionPlan = "free_web" | "free" | "premium";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trial";
export type Theme = "light" | "dark";
export type Language = "ja" | "en";
export type UserRole = "user" | "admin" | "moderator";

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: FirebaseFirestore.Timestamp;
  currentPeriodEnd: FirebaseFirestore.Timestamp | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

export interface WebUserPreferences {
  theme: Theme;
  notifications: boolean;
  language: Language;
}

export interface WebProfile {
  lastWebLogin: FirebaseFirestore.Timestamp;
  isWebUser: boolean;
  preferences: WebUserPreferences;
}

export interface MobileProfile {
  grade: string | null;
  school: string | null;
  subjects: string[];
  goals: string[];
  streak: number;
  lastActiveAt: FirebaseFirestore.Timestamp;
  platform: "mobile";
  version: string;
}

export interface UserData {
  // 基本プロフィール（Web版既存構造）
  bio: string;
  birthday: FirebaseFirestore.Timestamp | null;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  gender: Gender | null;
  photoURL: string;
  role: UserRole;

  // ゲーミフィケーション要素（Web版既存構造）
  coins: number;
  xp: number;
  level: number;
  currentMonsterId: string;

  // 学習データ（Web版既存構造）
  groupSessionCount: number;
  groupTotalMinutes: number;
  individualSessionCount: number;
  individualTotalMinutes: number;

  // システム情報
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;

  // Web版専用フィールド
  subscription: UserSubscription;
  webProfile: WebProfile;

  // モバイル版専用フィールド（統合用）
  mobileProfile?: MobileProfile | null;
}

export interface InitializeUserRequest {
  platform?: "web" | "mobile";
}

export interface InitializeUserResponse {
  success: boolean;
  message: string;
  userData?: {
    displayName: string;
    role: string;
    subscription: UserSubscription;
    coins: number;
    xp: number;
    level: number;
  };
}
