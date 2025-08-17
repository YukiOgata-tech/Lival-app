import React from 'react';
import { Pressable, Text } from 'react-native';

export default function SearchChip({ on, onToggle }:{ on: boolean; onToggle: ()=>void }) {
  return (
    <Pressable onPress={onToggle}
      className={`self-start ml-4 mt-2 px-3 py-1.5 rounded-full border ${on?'bg-emerald-50 border-emerald-600':'bg-white border-neutral-300'}`}>
      <Text className={`${on?'text-emerald-700':'text-neutral-700'}`}>Web検索 {on?'ON':'OFF'}</Text>
    </Pressable>
  );
}
