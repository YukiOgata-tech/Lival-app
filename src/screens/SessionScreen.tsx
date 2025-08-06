import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, Animated, Easing } from 'react-native';
import { Card, Button, ToggleButton } from 'react-native-paper';

export default function SessionScreen() {
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  const slideAnim = useRef(new Animated.Value(40)).current; // Y=40 から 0 へ

  useEffect(() => {
    slideAnim.setValue(40);              // リセット
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [mode, slideAnim]);

  const CardBlock = (
    title: string,
    button: string,
    desc: string
  ) => (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }] }}
      className="w-full"
    >
      <Card className="mb-6 p-4 rounded-2xl shadow-lg dark:bg-neutral-800">
        <Card.Title title={title} />
        <Card.Content>
          <Text className="text-base text-gray-700 dark:text-gray-200">{desc}</Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" className="mt-2">
            {button}
          </Button>
        </Card.Actions>
      </Card>
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* トグル */}
      <View className="flex-row justify-center mt-8 mb-4">
        <ToggleButton.Row
          onValueChange={(v) => setMode(v as 'individual' | 'group')}
          value={mode}
        >
          <ToggleButton icon="account" value="individual">
            個人セッション
          </ToggleButton>
          <ToggleButton icon="account-group" value="group">
            グループセッション
          </ToggleButton>
        </ToggleButton.Row>
      </View>

      {/* 本体 */}
      <ScrollView contentContainerClassName="items-center px-4">
        {mode === 'individual'
          ? CardBlock(
              '集中セッション開始',
              'セッションを開始',
              '目標やタイマーを設定して集中力を高めよう！'
            )
          : CardBlock(
              'グループセッション作成',
              'ルームを作成',
              '仲間と一緒に集中セッションを始めよう！'
            )}
      </ScrollView>
    </View>
  );
}
