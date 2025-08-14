// src/components/GSHistorySection.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { loadCache, ResultItem } from '@/lib/GroupSession-related/groupResultCache';

type Props = {
  title?: string;
  limit?: number;
  refreshOnFocus?: boolean;
  onPressItem?: (item: ResultItem) => void;
  /** 親が ScrollView の場合は true にして静的描画にする */
  withinScroll?: boolean;
};

export default function GSHistorySection({
  title = '最近のグループセッション',
  limit,
  refreshOnFocus = true,
  onPressItem,
  withinScroll = false,
}: Props) {
  const [items, setItems] = useState<ResultItem[]>([]);
  const isFocused = useIsFocused();

  const fetch = async () => {
    const data = await loadCache();
    setItems(limit ? data.slice(0, limit) : data);
  };

  useEffect(() => { fetch(); }, []);
  useEffect(() => { if (refreshOnFocus && isFocused) fetch(); }, [isFocused, refreshOnFocus]);

  const Row = (item: ResultItem) => (
    <View className="py-3 border-b border-neutral-200 dark:border-neutral-800">
      <Text className="text-base font-semibold" numberOfLines={1}>{item.title}</Text>
      <Text className="text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
        {new Date(item.finalizedAt).toLocaleString()} / {item.durationMin}分
        {typeof item.rank === 'number' ? ` / Rank ${item.rank}` : ''}
        {typeof item.xp === 'number' ? ` / XP +${item.xp}` : ''}
      </Text>
    </View>
  );

  return (
    <View className="mt-4 px-4">
      <Text className="text-lg font-bold">{title}</Text>

      {withinScroll ? (
        // ★ 親が ScrollView のときは「静的描画」（map）に切替
        items.length === 0 ? (
          <Text className="text-neutral-500 mt-3">まだ履歴がありません</Text>
        ) : (
          <View>
            {(limit ? items.slice(0, limit) : items).map((item) =>
              onPressItem ? (
                <Pressable key={item.roomId} onPress={() => onPressItem(item)} android_ripple={{ color: '#ddd' }}>
                  {Row(item)}
                </Pressable>
              ) : (
                <View key={item.roomId}>{Row(item)}</View>
              )
            )}
          </View>
        )
      ) : (
        // 単独で使うときは FlatList（仮想化）を使う
        <FlatList
          data={items}
          keyExtractor={(it) => it.roomId}
          renderItem={({ item }) =>
            onPressItem ? (
              <Pressable onPress={() => onPressItem(item)} android_ripple={{ color: '#ddd' }}>
                {Row(item)}
              </Pressable>
            ) : (
              Row(item)
            )
          }
          ListEmptyComponent={<Text className="text-neutral-500 mt-3">まだ履歴がありません</Text>}
        />
      )}
    </View>
  );
}
