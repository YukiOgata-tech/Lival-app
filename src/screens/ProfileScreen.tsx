// src/screens/ProfileScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Avatar, Button, Text, Card, IconButton, Appbar, Divider, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import FadeSlide from '@/components/animations/FadeSlide';
import GSHistorySection from '@/components/GSHistorySection';

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
  const initials = useMemo(() => (profile?.displayName ?? 'U').slice(0, 2).toUpperCase(), [profile?.displayName]);

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
        <Appbar.Content title="プロフィール" />
        <Appbar.Action
          icon="inbox"
          onPress={() => navigation.navigate('FriendInbox')}
          accessibilityLabel="フレンド申請インボックス"
        />
      </Appbar.Header>

      <View className="flex-1 bg-white dark:bg-neutral-900">
        {/* ── Hero / Cover ── */}
        <View className="h-48">
          <LinearGradient
            colors={["#10b981", "#60a5fa"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
          />
          <View style={{ position: 'absolute', left: 16, bottom: -40 }}>
            {profile?.photoURL ? (
              <Avatar.Image size={96} source={{ uri: profile.photoURL }} />
            ) : (
              <Avatar.Text size={96} label={initials} />
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <FadeSlide>
            <View className="mt-14 px-4">
              {/* 基本情報 */}
              <Text variant="headlineSmall" className="font-semibold text-neutral-900 dark:text-neutral-50">
                {profile?.displayName ?? 'No Name'}
              </Text>
              {profile?.bio ? (
                <Text className="text-neutral-600 dark:text-neutral-400 mt-1">{profile.bio}</Text>
              ) : null}

              {/* ステータスチップ */}
              <View className="flex-row gap-2 mt-8">
                <Chip compact mode="flat" icon="star">Lv {profile?.level ?? 0}</Chip>
                <Chip compact mode="flat" icon="rocket">XP {profile?.xp ?? 0}</Chip>
                <Chip compact mode="flat" icon="account-multiple">{profile?.friendCount ?? 0} Friends</Chip>
              </View>

              {/* アクションカード */}
              <Card className="mt-12 rounded-2xl">
                <Card.Content>
                  <Text variant="titleMedium" className="mb-2">クイックアクション</Text>
                  <View className="flex-row gap-8 mt-2">
                    <View className="flex-1">
                      <Button mode="contained" icon="pencil" onPress={() => navigation.navigate('EditProfile')}>
                        プロフィール編集
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Button mode="outlined" icon="account-multiple" onPress={() => navigation.navigate('FriendList' as never)}>
                        フレンド
                      </Button>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {/* 履歴セクション */}
              <Text variant="titleMedium" className="mt-10 mb-2">これまでのグループセッション</Text>
              <GSHistorySection
                limit={10}
                withinScroll
                title=""
                onPressItem={(item) => {
                  // @ts-ignore
                  navigation.navigate('RoomResult', { roomId: item.roomId });
                }}
              />

              {/* アカウント操作 */}
              <Divider className="my-12" />
              <Text variant="titleMedium" className="mb-6">アカウント</Text>
              <View className="flex-row gap-8">
                <View className="flex-1">
                  <Button
                    mode="contained-tonal"
                    icon="logout"
                    onPress={() => {
                      Alert.alert('ログアウトしますか？', '現在のセッションを終了します。', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: 'ログアウト', style: 'destructive', onPress: () => signOut(firebaseAuth) },
                      ]);
                    }}
                  >
                    ログアウト
                  </Button>
                </View>
                <View className="flex-1">
                  <Button mode="text" icon="cog" onPress={() => navigation.navigate('Account' as never)}>
                    詳細設定
                  </Button>
                </View>
              </View>
            </View>
          </FadeSlide>
        </ScrollView>

        {/* FAB: ユーザー検索 */}
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
