import React, { useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TextInput as RNTextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, List, Snackbar, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import algoliasearch from 'algoliasearch/lite';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const client = algoliasearch(
  process.env.EXPO_PUBLIC_ALGOLIA_APP_ID!,
  process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_KEY!,
);
const usersIndex = client.initIndex('users');

const useUserSearch = (keyword: string) =>
  useQuery({
    queryKey: ['user-search', keyword],
    enabled: keyword.length > 0,
    queryFn: async () => {
      const { hits } = await usersIndex.search(keyword, { hitsPerPage: 20 });
      return hits as any[];
    },
  });

export default function UserSearchScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [keyword, setKeyword] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  const { data = [], isLoading } = useUserSearch(keyword.trim());

  const filtered = useMemo(
    () => data.filter((hit) => hit.objectID !== user?.uid && !requestedIds.includes(hit.objectID)),
    [data, user, requestedIds],
  );

  const sendRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user) {
        console.error('Friend request failed: User not authenticated.');
        throw new Error('Not signed in');
      }
      console.log(`Attempting to send friend request from ${user.uid} to ${receiverId}`);
      // ★修正点: 受信者のユーザーデータ配下のサブコレクションに書き込む
      const newRequestRef = doc(collection(firestore, 'users', receiverId, 'friendRequests'), user.uid);
      await setDoc(newRequestRef, {
        senderId: user.uid,
        receiverId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      console.log('Firestore setDoc call completed successfully.');
    },
    onSuccess: (data, variables) => {
      console.log('Friend request onSuccess triggered for receiverId:', variables);
      setSnackbar('申請を送信しました');
      setRequestedIds((prev) => [...prev, variables]);
    },
    onError: (error: any, variables) => {
      console.error('Friend request onError triggered for receiverId:', variables);
      console.error('Mutation Error:', JSON.stringify(error, null, 2));
      setSnackbar(`送信失敗: ${error.message}`);
    },
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center -z-10">
        <Image
          source={require('../../../assets/Lival-icon-clearBG.png')}
          resizeMode="contain"
          className="w-64 h-64 opacity-5"
        />
      </View>

      <View className="flex-1 bg-white dark:bg-neutral-900 px-4 pt-2">
        <View className="flex-row items-center mb-4 gap-2">
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <RNTextInput
            placeholder="ユーザー名で検索"
            value={keyword}
            onChangeText={setKeyword}
            className="flex-1 border rounded-md px-3 py-2 dark:border-neutral-700"
          />
        </View>

        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.objectID}
            renderItem={({ item }) => (
              <List.Item
                title={item.displayName}
                description={item.bio}
                left={() => {
                  const initials = (item.displayName ?? 'U').slice(0, 2).toUpperCase();
                  return item.photoURL ? (
                    <Avatar.Image source={{ uri: item.photoURL }} size={48} />
                  ) : (
                    <Avatar.Text label={initials} size={48} />
                  );
                }}
                right={() => (
                  <Button
                    mode="contained-tonal"
                    loading={sendRequest.isPending && sendRequest.variables === item.objectID}
                    onPress={() => sendRequest.mutate(item.objectID)}
                  >
                    追加
                  </Button>
                )}
                onPress={() =>
                  navigation.navigate('UserProfile' as never, { uid: item.objectID } as never)
                }
              />
            )}
            ListEmptyComponent={
              <View className="items-center mt-10">
                <List.Icon icon="magnify" />
                <List.Subheader>ユーザーが見つかりません</List.Subheader>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        )}

        <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')}>{snackbar}</Snackbar>
      </View>
    </SafeAreaView>
  );
}