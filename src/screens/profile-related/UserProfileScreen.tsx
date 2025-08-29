// src/screens/profile-related/UserProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Text,
  Appbar,
  useTheme,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import FadeSlide from '@/components/animations/FadeSlide';

/* ----------------------------- 型定義 ----------------------------- */
// ルートパラメータ ― Approuter 側で Stack.Screen name="UserProfile" initialParams={{ uid: string }} を想定
interface RootStackParamList {
  UserProfile: { uid: string };
}

interface UserProfileData {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  level?: number;
  xp?: number;
  friendCount?: number;
}

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'UserProfile'>>();
  const { uid } = route.params;

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [alreadyFriend, setAlreadyFriend] = useState(false);
  const [requested, setRequested] = useState(false);

  /* -------------------- プロフィール取得 -------------------- */
  useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      // プロフィール
      const snap = await getDoc(doc(firestore, 'users', uid));
      if (!cancelled && snap.exists()) setProfile(snap.data() as UserProfileData);

      if (user) {
        // 既フレンド判定
        const f = await getDoc(doc(firestore, 'users', user.uid, 'friends', uid));
        if (!cancelled && f.exists()) return setAlreadyFriend(true);

        // 申請済み判定
        const r = await getDoc(doc(firestore, 'users', uid, 'friendRequests', user.uid)); // ★変更
        if (!cancelled && r.exists()) setRequested(true);
      }
    } catch (e) {
      console.error('[user-profile] fetch failed', e);
    } finally {
      if (!cancelled) setLoading(false);     // ★finally で確実に停止
    }
  })();

  return () => {
    cancelled = true;
  };
}, [uid, user]);

/* -------------------- 申請送信 -------------------- */
const sendRequest = async () => {
  if (!user) return;
  setSending(true);
  try {
    await setDoc(
      doc(firestore, 'users', uid, 'friendRequests', user.uid), // ★変更
      {
        senderId: user.uid,
        receiverId: uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      }
    );
    setRequested(true);
  } finally {
    setSending(false);
  }
};

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* Header */}
      <Appbar.Header mode="small" elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="ユーザープロフィール" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <FadeSlide>
          <View className="items-center mt-6 px-4">
            {profile?.photoURL ? (
              <Avatar.Image size={120} source={{ uri: profile.photoURL }} />
            ) : (
              <Avatar.Text size={120} label={(profile?.displayName ?? 'U').slice(0, 2).toUpperCase()} />
            )}

            <Text variant="titleLarge" className="mt-4">
              {profile?.displayName ?? 'No Name'}
            </Text>
            {profile?.bio && (
              <Text className="text-slate-600 dark:text-slate-400 mt-1 text-center">
                {profile.bio}
              </Text>
            )}

            {/* ---- ステータス ---- */}
            <Card className="mt-4 w-full rounded-2xl shadow">
              <View className="p-4">
                <View className="flex-row justify-around">
                <View>
                  <Text>Lv</Text>
                  <Text className="text-center font-bold">{profile?.level ?? 0}</Text>
                </View>
                <View>
                  <Text>XP</Text>
                  <Text className="text-center font-bold">{profile?.xp ?? 0}</Text>
                </View>
                <View>
                  <Text>Friends</Text>
                  <Text className="text-center font-bold">{profile?.friendCount ?? 0}</Text>
                </View>
                </View>
              </View>
            </Card>

            {/* ---- アクション ---- */}
            {user && user.uid !== uid ? (
              alreadyFriend ? (
                <Button mode="outlined" disabled className="mt-6">
                  既にフレンド
                </Button>
              ) : requested ? (
                <Button mode="outlined" disabled className="mt-6">
                  申請済み
                </Button>
              ) : (
                <Button mode="contained" loading={sending} onPress={sendRequest} className="mt-6">
                  フレンド申請
                </Button>
              )
            ) : null}
          </View>
        </FadeSlide>
      </ScrollView>
    </View>
  );
}