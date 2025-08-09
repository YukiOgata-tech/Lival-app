// src/hooks/useGroupRoomLifecycleLogs.ts
import React from 'react';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { postGroupLog } from '@/lib/GroupSession-related/groupLog';
import { useAuth } from '@/providers/AuthProvider';

export function useGroupRoomLifecycleLogs(roomId: string) {
  const { user } = useAuth();
  const display = user?.displayName ?? (user?.uid ? `ユーザー(${user.uid.slice(0, 6)})` : '誰か');

  // 画面のフォーカス/アンフォーカス＝入室/退室
  useFocusEffect(
    React.useCallback(() => {
      postGroupLog(roomId, `${display} が入室しました`);
      return () => postGroupLog(roomId, `${display} が退室しました`);
    }, [roomId, display])
  );

  // アプリ離脱/復帰
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;

      // active → inactive/background ＝ 離脱
      if ((prev === 'active' || prev === 'unknown') && (next === 'inactive' || next === 'background')) {
        postGroupLog(roomId, `${display} がアプリを離れました（バックグラウンド）`);
      }
      // inactive/background → active ＝ 復帰
      if ((prev === 'inactive' || prev === 'background') && next === 'active') {
        postGroupLog(roomId, `${display} が復帰しました`);
      }
    });
    return () => sub.remove();
  }, [roomId, display]);
}
