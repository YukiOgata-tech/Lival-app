// src/components/session-related/RoomHomePanel.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function RoomHomePanel({ roomId, roomData }: { roomId: string; roomData: any }) {
  return (
    <View className="flex-1 justify-center items-center px-4 bg-white">
      <Text className="text-2xl font-bold mb-2">Welcome to {roomData.roomName}!</Text>
      <Text className="text-base mb-2 text-center">目標: {roomData.goal}</Text>
      <Text className="text-base mb-2 text-center">セッション時間: {roomData.minutes}分</Text>
      <Text className="text-sm text-gray-500">ルームID: {roomId}</Text>
      <Text className="text-sm text-gray-500">タグ: {roomData.roomTag}</Text>
      {/* 今後「開始までのカウントダウン」「集中度」などを追加可能 */}
    </View>
  );
}
