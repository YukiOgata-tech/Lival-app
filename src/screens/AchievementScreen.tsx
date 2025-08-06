import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { Card } from 'react-native-paper';

export default function AchievementScreen() {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <Animated.View style={{ opacity: fade }}>
        <Card className="w-80 rounded-2xl p-6 shadow-lg items-center dark:bg-neutral-800">
          <Text className="text-xl font-bold mb-2">アチーブメント</Text>
          <Text className="mt-4 text-gray-700 dark:text-gray-200">
            初アチーブメント獲得！
          </Text>
        </Card>
      </Animated.View>
    </View>
  );
}
