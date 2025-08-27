// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { firebaseAuth, firestore } from '@/lib/firebase';
import { callCallable } from '@/lib/functionsCallable';
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
        console.warn('[auth] Firestore sync failed:', err);
      } finally {
        // ★ ここで必ず Splash を抜ける
        setState({ user: u, loading: false });
      }
    });

    return unsubscribe; // cleanup
  }, []);

  // ログイン後に Supabase RLS 用の role クレームを付与（不足時のみ）
  useEffect(() => {
    (async () => {
      const u = state.user;
      if (!u) return;
      try {
        // 最新トークンを取得してクレーム確認
        await u.getIdToken(true);
        const token = await u.getIdTokenResult();
        const role = (token.claims as any)?.role;
        if (role === 'authenticated') {
          console.log('[auth][claims] role=authenticated already present');
          return;
        }

        // まず setSupabaseRoleOnCreate を試し、not-found は自動フォールバック
        try {
          console.log('[auth][claims] calling setSupabaseRoleOnCreate');
          await callCallable('setSupabaseRoleOnCreate');
          console.log('[auth][claims] setSupabaseRoleOnCreate: ok');
        } catch (e1) {
          console.warn('[auth][claims] setSupabaseRoleOnCreate failed → fallback ensureSupabaseAuthenticatedClaim', e1);
          try {
            await callCallable('ensureSupabaseAuthenticatedClaim');
            console.log('[auth][claims] ensureSupabaseAuthenticatedClaim: ok');
          } catch (e2) {
            console.warn('[auth][claims] ensureSupabaseAuthenticatedClaim failed. skip', e2);
            return;
          }
        }

        // 付与後にトークンを更新してクレーム反映
        await u.getIdToken(true);
        const after = await u.getIdTokenResult();
        console.log('[auth][claims] after-update role=', (after.claims as any)?.role);
      } catch {
        // 無視（ネットワークや権限の瞬断に頑健に）
      }
    })();
  }, [state.user?.uid]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
};
