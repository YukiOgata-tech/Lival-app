// src/lib/authClaimsCache.ts - クレーム状態のローカルキャッシュ
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ 
  id: 'auth-claims-cache',
  encryptionKey: 'claims-verification-key' // 簡易暗号化
});

interface ClaimsCacheEntry {
  uid: string;
  role: string;
  verifiedAt: number;
  tokenExpiry: number; // Firebase JWTの有効期限
}

export class AuthClaimsCache {
  private static readonly CACHE_KEY_PREFIX = 'claims-';
  private static readonly CACHE_VALIDITY_MS = 50 * 60 * 1000; // 50分（JWTより短く）

  /**
   * ユーザーのクレーム状態をキャッシュに保存
   */
  static setClaims(uid: string, role: string, tokenExpiry: number): void {
    const entry: ClaimsCacheEntry = {
      uid,
      role,
      verifiedAt: Date.now(),
      tokenExpiry
    };
    
    const key = this.getCacheKey(uid);
    storage.set(key, JSON.stringify(entry));
  }

  /**
   * キャッシュからクレーム状態を取得（期限チェック付き）
   */
  static getClaims(uid: string): ClaimsCacheEntry | null {
    try {
      const key = this.getCacheKey(uid);
      const cached = storage.getString(key);
      
      if (!cached) {
        return null;
      }

      const entry: ClaimsCacheEntry = JSON.parse(cached);
      const now = Date.now();

      // キャッシュの有効性チェック
      if (now > entry.verifiedAt + this.CACHE_VALIDITY_MS) {
        // 期限切れのキャッシュを削除
        storage.delete(key);
        return null;
      }

      // JWTトークンの有効期限チェック
      if (now > entry.tokenExpiry - 5 * 60 * 1000) { // 5分前にチェック
        // トークン期限切れ間近
        storage.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.warn('[ClaimsCache] Failed to get cached claims:', error);
      return null;
    }
  }

  /**
   * クレームが既に verified 状態かチェック
   */
  static hasValidClaims(uid: string): boolean {
    const cached = this.getClaims(uid);
    return cached !== null && cached.role === 'authenticated';
  }

  /**
   * 特定ユーザーのキャッシュを削除
   */
  static clearClaims(uid: string): void {
    const key = this.getCacheKey(uid);
    storage.delete(key);
  }

  /**
   * 全キャッシュをクリア（ログアウト時等）
   */
  static clearAllClaims(): void {
    const allKeys = storage.getAllKeys();
    allKeys.forEach(key => {
      if (key.startsWith(this.CACHE_KEY_PREFIX)) {
        storage.delete(key);
      }
    });
  }

  private static getCacheKey(uid: string): string {
    return `${this.CACHE_KEY_PREFIX}${uid}`;
  }
}

/**
 * 開発用：キャッシュ状態のデバッグ表示
 */
export const debugClaimsCache = (uid?: string) => {
  if (!__DEV__) return;
  
  if (uid) {
    const cached = AuthClaimsCache.getClaims(uid);
    console.log(`[ClaimsCache] Debug for ${uid}:`, cached);
  } else {
    const allKeys = storage.getAllKeys().filter(k => k.startsWith('claims-'));
    console.log(`[ClaimsCache] All cached claims:`, allKeys.length);
    allKeys.forEach(key => {
      const value = storage.getString(key);
      console.log(`${key}: ${value}`);
    });
  }
};