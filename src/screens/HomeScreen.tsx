import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Card, Button } from 'react-native-paper';

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;   // 初期 0

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0],
        }) }] }}>
        <Card className="w-80 rounded-2xl p-4 shadow-lg dark:bg-neutral-800">
          <Card.Title title="デジタルデトックスへようこそ" />
          <Card.Content>
            <Text className="text-base text-gray-700 dark:text-gray-200">
              今日の目標を設定しましょう！
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" className="mt-2">
              目標を追加
            </Button>
          </Card.Actions>
        </Card>
      </Animated.View>
    </View>
  );
}
