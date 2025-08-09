// src/screens/session-related/GroupSessionRoom.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import RoomInfoHeader from '@/components/session-related/RoomInfoHeader';
import UserListPanel from '@/components/session-related/UserListPanel';
import RoomTabs from '@/components/session-related/RoomTabs';

// カスタムフックのインポート(Logの管理ホック)
import { useGroupRoomLifecycleLogs } from '@/hooks/useGroupRoomLifecycleLogs';
import { usePresenceStays } from '@/hooks/usePresenceStays';

type RoomData = {
  roomName: string;
  goal: string;
  minutes: number;
  maxUsers: number;
  members: string[];
  hostUserId: string;
  roomTag: string;
  createdAt: any;
  updatedAt: any;
};

export default function GroupSessionRoom() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { roomId } = route.params || {};
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);

  // hookは常に丈夫で呼び出したほうがいい(?)
  useGroupRoomLifecycleLogs(roomId);
  usePresenceStays(roomId);

  // Firestoreからルーム情報監視
  useEffect(() => {
    if (!roomId) return;
    const ref = doc(firestore, 'rooms', roomId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        Alert.alert('ルームが見つかりません', '', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setRoomData(snap.data() as RoomData);
      setLoading(false);
    });
    return unsubscribe;
  }, [roomId, navigation]);

//   if (roomId) {
//     useGroupRoomLifecycleLogs(roomId);
//     usePresenceStays(roomId);
//   };

  if (loading || !roomData) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-neutral-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* ルーム情報（ヘッダー） */}
      <RoomInfoHeader roomData={roomData} roomId={roomId} />

      {/* 参加者リスト */}
      <UserListPanel members={roomData.members} hostUserId={roomData.hostUserId} />

      {/* ルーム内部タブ（チャット・AIチャット・タイマー等） */}
      <RoomTabs roomId={roomId} roomData={roomData} />
    </View>
  );
}
