// src/components/session-related/Friendpicker.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Checkbox, Text, ActivityIndicator } from 'react-native-paper';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

export type Friend = { uid: string; displayName: string };

export default function FriendPicker({
  value,
  onChange,
}: {
  value: string[];                 // 選択中の friend uid 配列
  onChange: (uids: string[]) => void;
}) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = collection(firestore, 'users', user.uid, 'friends');
    const unsub = onSnapshot(ref, (snap) => {
      const list: Friend[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as DocumentData;
        // ドキュメントIDが friendUid、displayName が無い場合はIDを表示
        const uid = (d.uid as string) || doc.id;
        const name = (d.displayName as string) || (d.name as string) || uid;
        list.push({ uid, displayName: name });
      });
      setFriends(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  if (loading) {
    return <View className="py-3"><ActivityIndicator /></View>;
  }
  if (!friends.length) {
    return <Text className="text-gray-500">フレンドがいません</Text>;
  }

  const toggle = (uid: string) => {
    if (value.includes(uid)) onChange(value.filter(v => v !== uid));
    else onChange([...value, uid]);
  };

  return (
    <ScrollView className="max-h-40">
      {friends.map((f) => (
        <Checkbox.Item
          key={f.uid}
          label={f.displayName}
          status={value.includes(f.uid) ? 'checked' : 'unchecked'}
          onPress={() => toggle(f.uid)}
        />
      ))}
    </ScrollView>
  );
}
