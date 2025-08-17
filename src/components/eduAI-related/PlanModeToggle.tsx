// src/components/eduAI-related/PlanModeToggle.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, TextInput, ScrollView } from 'react-native';
import { ClipboardList, CalendarCheck2 } from 'lucide-react-native';

export type PlanHorizon = '1w' | '2w' | '1m' | '2m' | '1y' | null;

type Props = {
  enabled: boolean;
  onChangeEnabled: (next: boolean) => void;
  horizon: PlanHorizon;
  onChangeHorizon: (h: PlanHorizon) => void;
  priorities: string[];
  onChangePriorities: (p: string[]) => void;
};

const HORIZON_OPTS: { key: PlanHorizon; label: string }[] = [
  { key: '1w', label: '1週' },
  { key: '2w', label: '2週' },
  { key: '1m', label: '1ヶ月' },
  { key: '2m', label: '2ヶ月' },
  { key: '1y', label: '1年' },
];

export default function PlanModeToggle({
  enabled, onChangeEnabled, horizon, onChangeHorizon, priorities, onChangePriorities
}: Props) {
  const [priInput, setPriInput] = useState('');

  useEffect(() => {
    const arr = priInput.split(',').map(s => s.trim()).filter(Boolean);
    onChangePriorities(arr);
  }, [priInput]);

  const TogglePill = useMemo(() => (
    <Pressable
      onPress={() => onChangeEnabled(!enabled)}
      className={`self-end mr-4 mb-2 px-3 py-1.5 rounded-full border ${
        enabled ? 'bg-violet-50 border-violet-600' : 'bg-white border-neutral-300'
      }`}
      style={{ shadowOpacity: enabled ? 0.35 : 0.1, shadowRadius: 8 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
    >
      <View className="flex-row items-center">
        {enabled ? <CalendarCheck2 size={16} color="#6d28d9" /> : <ClipboardList size={16} color="#111827" />}
        <Text className={`ml-1 ${enabled ? 'text-violet-700' : 'text-neutral-800'}`}>
          計画作成 {enabled ? 'ON' : 'OFF'}
        </Text>
      </View>
    </Pressable>
  ), [enabled, onChangeEnabled]);

  if (!enabled) return TogglePill;

  return (
    <View className="px-4">
      {TogglePill}
      <View className="rounded-2xl border border-violet-200 bg-violet-50/40 p-3 mb-2">
        <Text className="text-[12px] text-neutral-600 mb-1">期間を選択（任意）</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row">
            {HORIZON_OPTS.map(opt => {
              const active = horizon === opt.key;
              return (
                <Pressable
                  key={opt.key ?? 'none'}
                  onPress={() => onChangeHorizon(active ? null : opt.key)}
                  className={`px-3 py-1.5 mr-2 rounded-full border ${
                    active ? 'bg-violet-600 border-violet-600' : 'bg-white border-neutral-300'
                  }`}
                >
                  <Text className={active ? 'text-white' : 'text-neutral-800'}>
                    {opt.label}{active ? ' ✓' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Text className="text-[12px] text-neutral-600 mb-1">重要視ポイント（任意・カンマ区切り）</Text>
        <TextInput
          value={priInput}
          onChangeText={setPriInput}
          placeholder="例）復習優先, 定着, 語彙強化, 模試対策"
          className="bg-white border border-neutral-300 rounded-xl px-3 py-2"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {priorities.length > 0 && (
          <View className="flex-row flex-wrap mt-2">
            {priorities.map((p, i) => (
              <View key={`${p}-${i}`} className="px-2 py-1 mr-2 mb-2 rounded-full bg-white border border-neutral-300">
                <Text className="text-[12px] text-neutral-700">{p}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
