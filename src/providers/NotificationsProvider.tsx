import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

async function registerChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('room-events', {
      name: 'Room Events',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}

async function getPushToken() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const ask = await Notifications.requestPermissionsAsync();
    if (!ask.granted) return null;
  }
  const projectId =
    (Constants as any).expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId ??
    process.env.EXPO_PROJECT_ID;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data; // "ExponentPushToken[xxxx]"
}

export default function NotificationsProvider({
  children,
  onNavigateRoomResult,   // (roomId: string) => void
  onNavigateRoomInvite,   // (roomId: string) => void
}: {
  children: React.ReactNode;
  onNavigateRoomResult?: (roomId: string) => void;
  onNavigateRoomInvite?: (roomId: string) => void;
}) {
  const { user } = useAuth();

  useEffect(() => { registerChannels(); }, []);

  // 端末のPushトークンをFirestoreへ保存
  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      const token = await getPushToken();
      if (!token) return;
      await setDoc(doc(firestore, 'users', user.uid), {
        expoPushTokens: arrayUnion(token),
        updatedAt: new Date(),
      }, { merge: true });
    })();
  }, [user?.uid]);

  // 通知タップ → 画面遷移ハンドリング
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      if (data?.type === 'room-ended' && data.roomId) {
        onNavigateRoomResult?.(data.roomId);
      }
      if (data?.type === 'room-invite' && data.roomId) {
        onNavigateRoomInvite?.(data.roomId);
      }
    });
    return () => sub.remove();
  }, [onNavigateRoomResult, onNavigateRoomInvite]);

  return <>{children}</>;
}

// 必要ならローカル予約通知も呼べます
export async function scheduleRoomEndLocal(roomId: string, endAtMs: number) {
  const trigger = new Date(endAtMs);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ROOMが終了しました',
      body: '結果を確認しましょう',
      sound: 'default',
      data: { type: 'room-ended', roomId },
    },
    trigger,
  });
  return id;
}
export async function cancelNotification(id: string) {
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}
