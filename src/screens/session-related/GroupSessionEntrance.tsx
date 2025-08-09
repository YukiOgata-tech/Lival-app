// src/screens/session-related/GroupSessionEntrance.tsx
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EntranceFormHeader from '@/components/session-related/EntranceFormHeader';
import RoomCreateForm from '@/screens/session-related/RoomCreateForm';
import RoomJoinForm from '@/screens/session-related/RoomJoinForm';

export default function GroupSessionEntrance() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);

  return (
    <View
      className="flex-1 bg-white dark:bg-neutral-900"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
    >
      {/* ヘッダー（タイトル＋戻るボタン） */}
      <EntranceFormHeader title="グループセッション" />

      {/* 作成/参加選択ボタン */}
      <View className="flex-row justify-center mb-6 px-2" style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            mode={mode === 'create' ? 'contained' : 'outlined'}
            onPress={() => setMode('create')}
          >
            ルーム作成
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            mode={mode === 'join' ? 'contained' : 'outlined'}
            onPress={() => setMode('join')}
          >
            ルーム参加
          </Button>
        </View>
      </View>

      {/* 下部カード */}
      <View className="flex-1 items-center px-3">
        {mode === 'create' && (
          <Card className="w-full mt-2 p-4 rounded-2xl shadow-lg dark:bg-neutral-800">
            <Card.Content>
              <RoomCreateForm />
            </Card.Content>
          </Card>
        )}
        {mode === 'join' && (
          <Card className="w-full mt-2 p-4 rounded-2xl shadow-lg dark:bg-neutral-800">
            <Card.Content>
              <RoomJoinForm />
            </Card.Content>
          </Card>
        )}
        {!mode && (
          <Card className="w-full mt-2 p-4 rounded-2xl shadow-lg dark:bg-neutral-800">
            <Card.Content>
              <Text className="text-center text-gray-700 dark:text-gray-200">
                上のボタンから作成か参加を選択してください。
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </View>
  );
}
