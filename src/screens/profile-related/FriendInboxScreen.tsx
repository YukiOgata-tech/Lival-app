import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { Appbar, List, Button, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import {
  query,
  collection,
  onSnapshot,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

interface RequestWithProfile {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
}

export default function FriendInboxScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState('');

  /* ------------------ リアルタイム購読 ------------------ */
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // ★修正点1: 自分のユーザーデータ配下のfriendRequestsサブコレクションを購読
    const q = query(collection(firestore, 'users', user.uid, 'friendRequests'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, async (snap) => {
      const list: RequestWithProfile[] = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const senderDoc = await getDoc(doc(firestore, 'users', data.senderId));
        list.push({
          id: docSnap.id,
          senderId: data.senderId,
          senderName: senderDoc.data()?.displayName ?? 'Unknown',
          senderPhoto: senderDoc.data()?.photoURL,
        });
      }
      setRequests(list);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // 承認/拒否：status だけ更新（friendsはCloud Functionsに任せる！）
  const handleResponse = useCallback(async (req: RequestWithProfile, accept: boolean) => {
    if (!user) return;
    // ★修正点2: 自分のユーザーデータ配下のfriendRequestsサブコレクションのドキュメントを更新
    await updateDoc(
      doc(firestore, 'users', user.uid, 'friendRequests', req.id),
      {
        status: accept ? 'accepted' : 'declined',
        respondedAt: serverTimestamp(),
      }
    );
    setSnackbar(accept ? 'フレンドになりました' : '申請を拒否しました');
  }, [user]);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* Header */}
      <Appbar.Header mode="small" elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="フレンド申請" />
      </Appbar.Header>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.senderName}
              left={(props) =>
                item.senderPhoto
                  ? <List.Image {...props} source={{ uri: item.senderPhoto }} />
                  : <List.Icon {...props} icon="account" />
              }              right={() => (
                <View className="flex-row gap-2">
                  <Button mode="text" onPress={() => handleResponse(item, false)}>
                    拒否
                  </Button>
                  <Button mode="contained" onPress={() => handleResponse(item, true)}>
                    承認
                  </Button>
                </View>
              )}
            />
          )}
          ListEmptyComponent={<List.Item title="申請はありません" />}>
        </FlatList>
      )}

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')}>{snackbar}</Snackbar>
    </View>
  );
}