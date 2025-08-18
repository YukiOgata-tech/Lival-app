// src/components/eduAI-related/threads-parts/FilterPills.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type FilterKey = 'all' | 'tutor' | 'counselor' | 'planner' | 'draft';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'すべて' },
  { key: 'tutor',     label: '家庭教師' },
  { key: 'counselor', label: '進路' },
  { key: 'planner',   label: '学習計画' },
  { key: 'draft',     label: '未確定' },
];

type Props = {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
};

export default function FilterPills({ value, onChange }: Props) {
  return (
    <View className="flex-row mt-3">
      {FILTERS.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => onChange(f.key)}
          className={`px-3 py-1.5 mr-2 rounded-full border ${
            value === f.key ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-neutral-300'
          }`}
        >
          <Text className={value === f.key ? 'text-white' : 'text-neutral-800'}>{f.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
