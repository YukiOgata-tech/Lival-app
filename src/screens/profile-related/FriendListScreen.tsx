// src/screens/profile-related/FriendListScreen.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Appbar, Searchbar, List, Avatar, Badge, Text } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

interface Friend {
  uid: string;
  displayName: string;
  imageURL?: string;
  level?: number;
  since?: Date;
}

export default function FriendListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filter, setFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // -----------------------------
  // Firestore realtime listener
  // -----------------------------
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const q = query(
        collection(firestore, 'users', user.uid, 'friends'),
        orderBy('displayName'),
      );
      const unsub = onSnapshot(q, (snap) => {
        setFriends(
          snap.docs.map((d) => ({
            uid: d.id,
            ...d.data(),
            since: d.data().since?.toDate?.(),
          })) as Friend[],
        );
      });
      return unsub;
    }, [user]),
  );

  // -----------------------------
  // Derived & helper values
  // -----------------------------
  const filtered = useMemo(
    () =>
      friends.filter((f) =>
        f.displayName?.toLowerCase().includes(filter.trim().toLowerCase()),
      ),
    [friends, filter],
  );

  const onRefresh = () => {
    setRefreshing(true);
    // snapshot が走るのを待つだけ。500ms で indicator を自動停止
    setTimeout(() => setRefreshing(false), 500);
  };

  const renderItem = ({ item }: { item: Friend }) => {
    const avatar = item.imageURL ? (
      <Avatar.Image size={40} source={{ uri: item.imageURL }} />
    ) : (
      <Avatar.Text size={40} label={item.displayName?.charAt(0) ?? '?'} />
    );

    return (
      <List.Item
        title={item.displayName}
        description={item.since ? `Since ${item.since.toLocaleDateString()}` : undefined}
        left={() => avatar}
        right={() =>
          item.level != null ? (
            <Badge size={24} className="bg-primary-600">
              {item.level}
            </Badge>
          ) : null
        }
        onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}
      />
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      <Appbar.Header mode="small">
        <Appbar.BackAction onPress={navigation.goBack} />
        <Appbar.Content title="Friends" />
      </Appbar.Header>

      <Searchbar
        placeholder="Search"
        value={filter}
        onChangeText={setFilter}
        className="mx-4 my-2 rounded-full"
      />

      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center" pointerEvents="none">
          <Text className="text-base text-neutral-500">No friends yet</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.uid}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}