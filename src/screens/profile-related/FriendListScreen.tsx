import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Appbar, Searchbar, List, Avatar, Text } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, query, onSnapshot, getDocs, doc, getDoc, where, documentId } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

// 表示用のフレンド情報の型
interface FriendProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  since?: Date;
}

export default function FriendListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // -----------------------------
  // Firestore realtime listener
  // -----------------------------
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoading(true);

      // 1. 自分のfriendsサブコレクションを購読
      const q = query(collection(firestore, 'users', user.uid, 'friends'));

      const unsub = onSnapshot(q, async (friendsSnap) => {
        const friendDocs = friendsSnap.docs;
        if (friendDocs.length === 0) {
          setProfiles([]);
          setLoading(false);
          return;
        }

        // 2. friendのIDリストとsinceの日付をマップに保存
        const friendIds = friendDocs.map(d => d.id);
        const sinceMap = new Map(friendDocs.map(d => [d.id, d.data().since?.toDate?.()]));

        // 3. IDリストを元に、usersコレクションからプロフィールを一括取得
        const profilesQuery = query(collection(firestore, 'users'), where(documentId(), 'in', friendIds));
        const profilesSnap = await getDocs(profilesQuery);

        const newProfiles: FriendProfile[] = profilesSnap.docs.map(docSnap => ({
          uid: docSnap.id,
          displayName: docSnap.data().displayName ?? 'No Name',
          photoURL: docSnap.data().photoURL,
          bio: docSnap.data().bio,
          since: sinceMap.get(docSnap.id),
        }));
        
        // 名前でソート
        newProfiles.sort((a, b) => a.displayName.localeCompare(b.displayName));

        setProfiles(newProfiles);
        setLoading(false);
      });

      return unsub;
    }, [user])
  );

  const filtered = useMemo(
    () =>
      profiles.filter((f) =>
        f.displayName?.toLowerCase().includes(filter.trim().toLowerCase()),
      ),
    [profiles, filter],
  );

  const renderItem = ({ item }: { item: FriendProfile }) => {
    const initials = (item.displayName ?? 'U').slice(0, 2).toUpperCase();
    const avatar = item.photoURL ? (
      <Avatar.Image size={40} source={{ uri: item.photoURL }} />
    ) : (
      <Avatar.Text size={40} label={initials} />
    );

    return (
      <List.Item
        title={item.displayName}
        description={item.bio}
        left={() => avatar}
        onPress={() => navigation.navigate('UserProfile' as never, { uid: item.uid } as never)}
      />
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      <Appbar.Header mode="small">
        <Appbar.BackAction onPress={navigation.goBack} />
        <Appbar.Content title="フレンド" />
      </Appbar.Header>

      <Searchbar
        placeholder="名前で検索"
        value={filter}
        onChangeText={setFilter}
        className="mx-4 my-2 rounded-lg"
      />

      {loading ? (
        <ActivityIndicator className="mt-10"/>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center" pointerEvents="none">
          <Text className="text-base text-neutral-500">まだフレンドがいません</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.uid}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
