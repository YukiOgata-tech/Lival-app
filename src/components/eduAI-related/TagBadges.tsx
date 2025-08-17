// src/components/eduAI-related/TagBadges.tsx
import { View, Text } from 'react-native';
import React from 'react';
import { EduAITag } from '@/lib/eduAIFirestore';

const LABELS: Record<EduAITag,string> = {
  important: '重要', memorize: '暗記', check: '要チェック'
};

export default function TagBadges({ tags }:{ tags: EduAITag[] }) {
  if (!tags?.length) return null;
  return (
    <View className="flex-row flex-wrap mt-1">
      {tags.map(t => (
        <View key={t} className="px-2 py-0.5 mr-1 rounded-full bg-amber-200">
          <Text className="text-[10px] text-amber-900">{LABELS[t]}</Text>
        </View>
      ))}
    </View>
  );
}
