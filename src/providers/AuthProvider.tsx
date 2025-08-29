// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { firebaseAuth, firestore } from '@/lib/firebase';
import { callCallable } from '@/lib/functionsCallable';
import { ErrorHandler, safeAsync } from '@/lib/errors';
import { AuthClaimsCache } from '@/lib/authClaimsCache';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

type AuthCtx = { user: User | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ user: null, loading: true });
export const useAuth = () => useContext(Ctx);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthCtx>({ user: null, loading: true });
  const claimsProcessingRef = useRef<Set<string>>(new Set()); // 重複処理防止

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (u) => {
      console.log('[auth] state changed →', !!u);
      if (!u) {
        setState({ user: null, loading: false });
        return;
      }

      try {
        const ref = doc(firestore, 'users', u.uid);
        const snap = await getDoc(ref);

        // Firestore ↔︎ Firebase Auth の emailVerified を同期
        if (!snap.exists()) {
          await setDoc(ref, {
            email: u.email,
            emailVerified: u.emailVerified,
            createdAt: serverTimestamp(),
            level: 1,
            xp: 0,
          });
        } else if (snap.data().emailVerified !== u.emailVerified) {
          await updateDoc(ref, { emailVerified: u.emailVerified });
        }
      } catch (err) {
        // Firestore 権限／ネットワークエラーでもアプリが固まらないように
        ErrorHandler.handleNetworkError(err, 'firestore_user_sync');
      } finally {
        // ★ ここで必ず Splash を抜ける
        setState({ user: u, loading: false });
      }
    });

    return unsubscribe; // cleanup
  }, []);

  // 最適化された Supabase RLS クレーム管理（キャッシュ活用）
  useEffect(() => {
    const ensureSupabaseClaims = async () => {
      const u = state.user;
      if (!u) {
        // ログアウト時はキャッシュをクリア
        AuthClaimsCache.clearAllClaims();
        return;
      }

      // ★ 重複処理防止チェック
      if (claimsProcessingRef.current.has(u.uid)) {
        console.log('[auth][claims] Already processing claims for', u.uid);
        return;
      }

      // ★ ローカルキャッシュから確認（最速パス）
      if (AuthClaimsCache.hasValidClaims(u.uid)) {
        console.log('[auth][claims] Valid claims found in cache, skipping verification');
        return;
      }

      // 処理開始フラグ
      claimsProcessingRef.current.add(u.uid);

      await safeAsync(async () => {
        // ★ キャッシュされた現在のトークンでまず確認（API呼び出しなし）
        const currentToken = await u.getIdTokenResult(false); // キャッシュ利用
        const currentRole = (currentToken.claims as any)?.role;
        
        if (currentRole === 'authenticated') {
          console.log('[auth][claims] role=authenticated confirmed from current token');
          // キャッシュに保存
          AuthClaimsCache.setClaims(u.uid, currentRole, currentToken.expirationTime);
          return;
        }

        console.log('[auth][claims] Claims not found, initiating attachment process');

        // ★ 最新トークンで再確認してからクレーム付与
        await u.getIdToken(true); // 強制更新（必要時のみ）
        const refreshedToken = await u.getIdTokenResult();
        const refreshedRole = (refreshedToken.claims as any)?.role;
        
        if (refreshedRole === 'authenticated') {
          console.log('[auth][claims] Claims found after token refresh');
          AuthClaimsCache.setClaims(u.uid, refreshedRole, refreshedToken.expirationTime);
          return;
        }

        // ★ クレーム付与の実行
        await attemptClaimsAttachment(u);

        // ★ 付与後の確認とキャッシュ保存
        await u.getIdToken(true);
        const finalToken = await u.getIdTokenResult();
        const finalRole = (finalToken.claims as any)?.role;
        
        if (finalRole === 'authenticated') {
          console.log('[auth][claims] Claims successfully attached and verified');
          AuthClaimsCache.setClaims(u.uid, finalRole, finalToken.expirationTime);
        } else {
          throw new Error('Claims attachment verification failed');
        }
      }, (error) => {
        // エラー時はキャッシュをクリアして次回再試行を許可
        AuthClaimsCache.clearClaims(u.uid);
        ErrorHandler.handleAuthError(error, 'supabase_claims_attachment', {
          userId: u.uid,
          cacheStatus: 'cleared_after_error'
        });
      }).finally(() => {
        // 処理完了フラグをクリア
        claimsProcessingRef.current.delete(u.uid);
      });
    };

    ensureSupabaseClaims();
  }, [state.user?.uid]);

  // クレーム付与の試行ロジック
  const attemptClaimsAttachment = async (user: User): Promise<void> => {
    const methods = [
      { name: 'setSupabaseRoleOnCreate', primary: true },
      { name: 'ensureSupabaseAuthenticatedClaim', primary: false }
    ];

    let lastError: any = null;

    for (const method of methods) {
      try {
        console.log(`[auth][claims] trying ${method.name}`);
        await callCallable(method.name);
        console.log(`[auth][claims] ${method.name} succeeded`);
        return; // 成功時は即座に返す
      } catch (error) {
        lastError = error;
        console.warn(`[auth][claims] ${method.name} failed:`, error);
        
        if (method.primary) {
          continue; // プライマリ失敗時はフォールバックを試行
        }
      }
    }

    // 全ての方法が失敗した場合
    throw new Error(`All claims attachment methods failed. Last error: ${lastError?.message}`);
  };

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
};
