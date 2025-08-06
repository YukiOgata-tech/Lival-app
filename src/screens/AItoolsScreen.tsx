import React from 'react';
import { View, Text } from 'react-native';
import { Card, Button } from 'react-native-paper';

// ＊Card には cssInterop を App エントリで一度だけ設定済みと想定
export default function AItoolsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <Card className="w-80 rounded-2xl p-4 shadow-lg dark:bg-neutral-800">
        <Card.Title title="AIチャット" />
        <Card.Content>
          <Text className="text-base text-gray-700 dark:text-gray-300">
            AIアシスタントとお話ししましょう。
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained">チャットを開始</Button>
        </Card.Actions>
      </Card>
    </View>
  );
}
