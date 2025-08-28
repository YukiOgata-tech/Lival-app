// src/screens/session-related/SessionScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Card, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ResultReadyBanner from '@/components/session-related/result/ResultReadyBanner';
import { useResultResume } from '@/hooks/useResultResume';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

const logoSource = require('@assets/images/Lival-text.png');

export default function SessionScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<'individual' | 'group' | null>(null);
  const { user } = useAuth();
  const { notice, clear } = useResultResume(user?.uid);

  const { width, height } = Dimensions.get('window');

  const openResult = async () => {
    if (!notice) return;
    // 既読マーク（見たユーザーだけが自分のフラグを書ける）
    try {
      if (user?.uid) {
        await updateDoc(doc(firestore, 'rooms', notice.roomId), {
          [`seenBy.${user.uid}`]: true,
        } as any);
      }
    } catch {}
    // @ts-ignore
    nav.navigate('RoomResultScreen', { roomId: notice.roomId });
    clear();
  };

  // 選択肢カードUI
  const SelectorCard = ({
    type,
    title,
    desc,
    icon,
  }: {
    type: 'individual' | 'group';
    title: string;
    desc: string;
    icon: React.ReactNode;
  }) => (
    <TouchableOpacity
      onPress={() => setSelected(type)}
      activeOpacity={0.85}
      className={`flex-1 mx-2 ${selected === type ? 'border-2 border-blue-500' : 'border border-gray-300'} rounded-2xl bg-white dark:bg-neutral-800 shadow-md`}
      style={{
        minHeight: 120,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: selected && selected !== type ? 0.5 : 1,
      }}
    >
      <View className="mb-2">{icon}</View>
      <Text className="text-lg font-bold mb-1 dark:text-gray-100">{title}</Text>
      <Text className="text-xs text-gray-500 dark:text-gray-300 text-center">{desc}</Text>
    </TouchableOpacity>
  );

  return (
    <View
      className="flex-1 bg-white dark:bg-neutral-900"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
    >
      <Image source={logoSource} style={[StyleSheet.absoluteFillObject,{width: width * 0.85, height: width * 0.85, 
      left: (width - width * 0.85) / 2, top: 360, opacity: 0.71, zIndex: 0,},
    ]}
    contentFit="contain"
    pointerEvents="none"
    />
      {/* 上部セレクター */}
      <Text className="text-center text-2xl font-bold mb-2 dark:text-gray-100">
        セッションの種類を選択
      </Text>
      <View className="flex-row justify-center mb-6 px-2">
        <SelectorCard
          type="individual"
          title="個人セッション"
          desc="一人で集中！目標やタイマーを設定して取り組めます（近日解放）"
          icon={<Text style={{ fontSize: 36 }}>👤</Text>}
        />
        <SelectorCard
          type="group"
          title="グループセッション"
          desc="みんなで一緒に集中！ランキングやAIチャットも"
          icon={<Text style={{ fontSize: 36 }}>👥</Text>}
        />
      </View>

      {/* 下部のカードUI（説明＋アクション） */}
      {selected === 'individual' && (
        <Card className="mx-5 mt-2 p-4 rounded-2xl shadow-lg dark:bg-neutral-800">
          <Card.Title title="個人セッション" />
          <Card.Content>
            <Text className="text-base text-gray-700 dark:text-gray-200 mb-2">
              ファミリーコントロールのエンタイトルメント取得後に利用可能になります。先にグループセッションをお試しください。
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" disabled>
              近日対応
            </Button>
          </Card.Actions>
        </Card>
      )}
      {selected === 'group' && (
        <Card className="mx-5 mt-2 p-4 rounded-2xl shadow-lg dark:bg-neutral-800">
          <Card.Title title="グループセッション" />
          <Card.Content>
            <Text className="text-base text-gray-700 dark:text-gray-200 mb-2">
              ルームを作成または参加して、AIチャットや集中度ランキングを体験しよう！
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('GroupSessionEntrance' as never)}
            >
              ルームを作成・参加
            </Button>
          </Card.Actions>
        </Card>
      )}
      {/* 何も選んでいない場合は何も出さない */}
      {notice ? (
        <ResultReadyBanner
          title={notice.roomName ?? 'Group Session'}
          onOpen={openResult}
          onDismiss={clear}
        />
      ) : null}
    </View>
  );
}
