// src/lib/authDebugger.ts - 認証状態のデバッグユーティリティ
import { firebaseAuth } from './firebase';
import { AuthClaimsCache, debugClaimsCache } from './authClaimsCache';

export class AuthDebugger {
  /**
   * 現在の認証状態とキャッシュ情報を出力（開発用）
   */
  static async debugCurrentState(): Promise<void> {
    if (!__DEV__) return;

    console.group('[AuthDebugger] Current Authentication State');
    
    const user = firebaseAuth.currentUser;
    if (!user) {
      console.log('❌ User: Not authenticated');
      console.groupEnd();
      return;
    }

    console.log('✅ User:', {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified
    });

    try {
      // トークン情報（キャッシュ利用）
      const tokenResult = await user.getIdTokenResult(false);
      console.log('🎫 Token (cached):', {
        issuedAt: new Date(tokenResult.issuedAtTime).toLocaleString(),
        expirationTime: new Date(tokenResult.expirationTime).toLocaleString(),
        signInProvider: tokenResult.signInProvider,
        role: (tokenResult.claims as any)?.role || 'NOT_SET'
      });

      // キャッシュ状態
      console.log('💾 Cache Status:');
      const cachedClaims = AuthClaimsCache.getClaims(user.uid);
      if (cachedClaims) {
        console.log('  ✅ Valid cache found:', {
          role: cachedClaims.role,
          verifiedAt: new Date(cachedClaims.verifiedAt).toLocaleString(),
          cacheValidUntil: new Date(cachedClaims.verifiedAt + 50 * 60 * 1000).toLocaleString()
        });
      } else {
        console.log('  ❌ No valid cache');
      }

    } catch (error) {
      console.error('❌ Token Error:', error);
    }

    console.groupEnd();
  }

  /**
   * 認証処理のパフォーマンス測定
   */
  static measureClaimsPerformance = (() => {
    const measurements: { [key: string]: number } = {};

    return {
      start: (operation: string) => {
        if (!__DEV__) return;
        measurements[operation] = performance.now();
      },
      end: (operation: string) => {
        if (!__DEV__) return;
        const startTime = measurements[operation];
        if (startTime) {
          const duration = performance.now() - startTime;
          console.log(`⏱️ [AuthPerf] ${operation}: ${duration.toFixed(2)}ms`);
          delete measurements[operation];
        }
      }
    };
  })();

  /**
   * 全キャッシュの状態表示
   */
  static debugCacheState(): void {
    if (!__DEV__) return;
    debugClaimsCache();
  }

  /**
   * パフォーマンス統計の表示
   */
  static logOptimizationStats(): void {
    if (!__DEV__) return;

    const user = firebaseAuth.currentUser;
    if (!user) return;

    const hasCache = AuthClaimsCache.hasValidClaims(user.uid);
    
    console.log('📊 [AuthOptimization] Stats:', {
      userAuthenticated: Boolean(user),
      hasCachedClaims: hasCache,
      optimizationLevel: hasCache ? 'MAXIMUM' : 'BASELINE',
      expectedApiCalls: hasCache ? 0 : 3,
      cacheHitRatio: hasCache ? '100%' : '0%'
    });
  }
}

// 開発環境でのみグローバルに露出（デバッグ用）
if (__DEV__) {
  (globalThis as any).AuthDebugger = AuthDebugger;
  console.log('🔧 AuthDebugger available globally in development');
}