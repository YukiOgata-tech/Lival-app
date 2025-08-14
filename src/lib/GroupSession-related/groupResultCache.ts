// src/lib/GroupSession-related/groupResultCache.ts
// AsyncStorage 版の軽量キャッシュ
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'resultCache:v1';

export type ResultItem = {
  roomId: string;
  title: string;
  finalizedAt: number;   // epoch ms
  durationMin: number;
  rank?: number;
  xp?: number;
  coins?: number;
};

export async function loadCache(): Promise<ResultItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as ResultItem[] : [];
  } catch {
    return [];
  }
}

export async function saveToCache(item: ResultItem) {
  const list = await loadCache();
  const map = new Map(list.map((x) => [x.roomId, x]));
  map.set(item.roomId, item);
  const next = Array.from(map.values())
    .sort((a, b) => b.finalizedAt - a.finalizedAt)
    .slice(0, 100); // 直近100件まで保持
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearCache() {
  await AsyncStorage.removeItem(KEY);
}
