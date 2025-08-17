// src/components/eduAI-related/TagBar.tsx
import { View, Pressable, Text } from 'react-native';
import React from 'react';
import { EduAITag } from '@/lib/eduAIFirestore';

const LABELS: Record<EduAITag,string> = {
  important: '重要', memorize: '暗記', check: '要チェック'
};

export default function TagBar({
  selected, onToggle
}:{
  selected: EduAITag[]; onToggle:(t:EduAITag)=>void;
}) {
  const items: EduAITag[] = ['important','memorize','check'];
  return (
    <View className="px-4 pt-2 pb-1 flex-row">
      {items.map(t => {
        const active = selected.includes(t);
        return (
          <Pressable key={t} onPress={()=>onToggle(t)}
            className={`px-3 py-1 mr-2 rounded-full border ${active?'bg-amber-500 border-amber-500':'bg-white border-neutral-300'}`}>
            <Text className={`${active?'text-white':'text-neutral-700'}`}>{LABELS[t]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
