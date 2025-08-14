import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ResultReadyBanner({
  title,
  onOpen,
  onDismiss,
}: {
  title: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <View className="mx-4 mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-12">
      <Text className="text-emerald-800 font-semibold">結果が出ました</Text>
      <Text className="text-emerald-900 text-lg font-extrabold mt-1" numberOfLines={1}>{title}</Text>

      <View className="flex-row gap-8 mt-3">
        <Pressable onPress={onOpen} className="px-4 py-2 rounded-full bg-emerald-600">
          <Text className="text-white font-semibold">結果を見る</Text>
        </Pressable>
        <Pressable onPress={onDismiss} className="px-4 py-2 rounded-full bg-emerald-100">
          <Text className="text-emerald-800 font-semibold">閉じる</Text>
        </Pressable>
      </View>
    </View>
  );
}
