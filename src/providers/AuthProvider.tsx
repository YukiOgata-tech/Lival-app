// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { firebaseAuth, firestore } from '@/lib/firebase';
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

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
};
