import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Search, ShieldCheck } from 'lucide-react-native';

type Props = {
  enabled: boolean;
  onChange: (next: boolean) => void;
  quality?: 'standard'|'premium';
  onToggleQuality?: (q: 'standard'|'premium') => void;
};

export default function WebSearchToggle({ enabled, onChange, quality='standard', onToggleQuality }: Props) {
  return (
    <View className="flex-row items-center">
      {/* Web検索 ON/OFF */}
      <Pressable
        onPress={() => onChange(!enabled)}
        className={`px-3 py-1.5 rounded-full border mr-2 ${
          enabled ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-neutral-300'
        }`}
        style={{ shadowColor: enabled ? '#10b981' : '#000', shadowOpacity: enabled ? 0.35 : 0.1, shadowRadius: 8 }}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
      >
        <View className="flex-row items-center">
          <Search size={16} color={enabled ? '#059669' : '#111827'} />
          <Text className={`ml-1 ${enabled ? 'text-emerald-700' : 'text-neutral-800'}`}>
            Web検索 {enabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </Pressable>

      {/* 精度トグル（任意：premium=4.1） */}
      {!!onToggleQuality && (
        <Pressable
          onPress={() => onToggleQuality(quality === 'standard' ? 'premium' : 'standard')}
          className={`px-3 py-1.5 rounded-full border ${
            quality === 'premium' ? 'bg-violet-50 border-violet-600' : 'bg-white border-neutral-300'
          }`}
          style={{ shadowColor: quality === 'premium' ? '#7c3aed' : '#000', shadowOpacity: quality === 'premium' ? 0.35 : 0.1, shadowRadius: 8 }}
        >
          <View className="flex-row items-center">
            <ShieldCheck size={16} color={quality === 'premium' ? '#6d28d9' : '#111827'} />
            <Text className={`ml-1 ${quality === 'premium' ? 'text-violet-700' : 'text-neutral-800'}`}>
              精度 {quality === 'premium' ? 'High' : 'Std'}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
