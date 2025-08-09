// src/components/session-related/UserListPanel.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

type Props = {
  members: string[];
  hostUserId: string;
};

export default function UserListPanel({ members, hostUserId }: Props) {
  const [users, setUsers] = useState<{ uid: string; name?: string; }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    const fetchUsers = async () => {
      const userList: { uid: string; name?: string }[] = [];
      for (const uid of members) {
        // Firestore users/{uid} から名前等取得
        try {
          const snap = await firestore.collection('users').doc(uid).get();
          if (snap.exists) {
            const data = snap.data();
            userList.push({ uid, name: data.displayName ?? data.email ?? uid });
          } else {
            userList.push({ uid, name: uid });
          }
        } catch {
          userList.push({ uid });
        }
      }
      if (!unmounted) {
        setUsers(userList);
        setLoading(false);
      }
    };
    fetchUsers();
    return () => { unmounted = true; };
  }, [JSON.stringify(members)]);

  if (loading) return <ActivityIndicator size="small" style={{ margin: 6 }} />;
  return (
    <View className="px-4 py-2 flex-row flex-wrap items-center">
      <Text className="mr-2 text-sm font-semibold">参加者:</Text>
      {users.map((u) => (
        <Text
          key={u.uid}
          className={`mr-2 px-2 py-0.5 rounded ${
            u.uid === hostUserId ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 dark:bg-neutral-800'
          }`}
        >
          {u.name || u.uid}
          {u.uid === hostUserId ? ' (ホスト)' : ''}
        </Text>
      ))}
    </View>
  );
}
