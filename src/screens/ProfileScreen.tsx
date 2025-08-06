// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Avatar, Button, Text, Card, IconButton, Appbar } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import FadeSlide from '@/components/animations/FadeSlide';

/** Firestore に保存しているプロフィール型 */
interface UserProfile {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  level?: number;
  xp?: number;
  friendCount?: number;
}

export default function ProfileScreen() {
  const { user, loading } = useAuth();
  const navigation = useNavigation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  /** ユーザープロフィール購読 */
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
      setProfile(snap.data() as UserProfile);
      setProfileLoading(false);
    });

    return unsub;
  }, [user]);

  /** 認証ロード中 or プロフィールロード中 */
  if (loading || profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator />
      </View>
    );
  }

  /** 未ログイン時 */
  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900 p-4">
        <Text variant="titleMedium" className="mb-4 text-center">
          ログインが必要です
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate('Login' as never)}>
          ログイン
        </Button>
      </View>
    );
  }

  return (
    <>
    <Appbar.Header className="bg-white dark:bg-neutral-900">
        {/* タイトル */}
        <Appbar.Content title="プロフィール" />
        {/* フレンドInboxアイコン */}
        <Appbar.Action
          icon="inbox" // Paper内蔵の inbox アイコン
          onPress={() => navigation.navigate('FriendInbox')}
          accessibilityLabel="フレンド申請インボックス"
        />
      </Appbar.Header>
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* ── カバー & アバター ── */}
      <View className="h-52 relative">
        <BlurView intensity={40} className="absolute inset-0" />
        {profile?.photoURL ? (
          <Avatar.Image
            size={120}
            source={{ uri: profile.photoURL }}
            style={{ position: 'absolute', left: 16, bottom: -60 }}
          />
        ) : (
          <Avatar.Text
            size={120}
            label={(profile?.displayName ?? 'U').slice(0, 2).toUpperCase()}
            style={{ position: 'absolute', left: 16, bottom: -60 }}
          />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <FadeSlide>
          <View className="mt-16 px-4">
            {/* ── 基本情報 ── */}
            <Text variant="titleLarge">{profile?.displayName ?? 'No Name'}</Text>
            {profile?.bio ? (
              <Text className="text-slate-600 dark:text-slate-400 mt-1">{profile.bio}</Text>
            ) : null}

            {/* ── ステータスカード ── */}
            <Card className="mt-3 p-3 rounded-2xl shadow">
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
            </Card>

            {/* ── アクションボタン ── */}
            <Button
              mode="contained"
              className="mt-4"
              onPress={() => navigation.navigate('EditProfile')}
            >
              プロフィールを編集
            </Button>
            <Button
              mode="outlined"
              className="mt-2"
              icon="account-multiple"
              onPress={() => navigation.navigate('FriendList' as never)}
            >
              フレンド
            </Button>
          </View>
        </FadeSlide>
      </ScrollView>

      {/* ── FAB: ユーザー検索 ── */}
      <IconButton
        icon="account-search"
        size={28}
        mode="contained-tonal"
        style={{ position: 'absolute', right: 20, bottom: 20 }}
        onPress={() => navigation.navigate('UserSearch' as never)}
      />
    </View>
    </>
  );
}
