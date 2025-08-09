// src/hooks/usePresenceStays.ts
import React from 'react';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

type StayDoc = {
  startAt: any; // Timestamp
  endAt?: any | null; // Timestamp | null
  source: 'focus' | 'blur' | 'fg' | 'bg'; // デバッグ用
};

export function usePresenceStays(roomId?: string) {
  const { user } = useAuth();
  const openStayId = useRef<string | null>(null); // 現在開いている stay の docId を保持
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const staysCol = user?.uid
    ? collection(firestore, 'rooms', roomId!, 'presence', user.uid, 'stays')
    : null;

  // 既存の未クローズ区間があればクローズ（再入室時の後始末）
  const closeAnyOpenStaysNow = React.useCallback(async () => {
    if (!staysCol) return;
    try {
      const qOpen = query(staysCol, where('endAt', '==', null), orderBy('startAt', 'desc'), limit(5));
      const snap = await getDocs(qOpen);
      await Promise.all(
        snap.docs.map(d => updateDoc(doc(staysCol, d.id), { endAt: serverTimestamp(), source: 'blur' }))
      );
    } catch (e) {
      console.warn('[presence] closeAnyOpenStaysNow failed', e);
    }
  }, [staysCol]);

  const openStay = React.useCallback(async (source: StayDoc['source']) => {
    if (!staysCol) return;
    try {
      // 念のため、開きっぱなしがあれば閉じてから新規開始
      await closeAnyOpenStaysNow();
      const ref = await addDoc(staysCol, { startAt: serverTimestamp(), endAt: null, source });
      openStayId.current = ref.id;
      // console.log('[presence] open', ref.id, source);
    } catch (e) {
      console.warn('[presence] open failed', e);
    }
  }, [staysCol, closeAnyOpenStaysNow]);

  const closeStay = React.useCallback(async (source: StayDoc['source']) => {
    if (!staysCol || !openStayId.current) return;
    try {
      await updateDoc(doc(staysCol, openStayId.current), { endAt: serverTimestamp(), source });
      // console.log('[presence] close', openStayId.current, source);
      openStayId.current = null;
    } catch (e) {
      console.warn('[presence] close failed', e);
    }
  }, [staysCol]);

  // 画面の入退室で open/close
  useFocusEffect(
    React.useCallback(() => {
      if (!roomId || !user?.uid) return;
      openStay('focus');
      return () => { closeStay('blur'); };
    }, [roomId, user?.uid, openStay, closeStay])
  );

  // アプリ前後面で open/close
  useEffect(() => {
    if (!roomId || !user?.uid) return;
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;

      if (prev === 'active' && (next === 'inactive' || next === 'background')) {
        closeStay('bg'); // 離脱でクローズ
      }
      if ((prev === 'inactive' || prev === 'background') && next === 'active') {
        openStay('fg');  // 復帰で再オープン
      }
    });
    return () => sub.remove();
  }, [roomId, user?.uid, openStay, closeStay]);
}
