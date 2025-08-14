// src/storage/mmkv.ts
import { MMKV } from 'react-native-mmkv';

export const mmkv = new MMKV({
  id: 'lival-mmkv',
});

// --- Safe JSON helpers -------------------------------------------------------
function safeParse<T>(raw: string | undefined | null, fallback: T, key?: string): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    // 壊れたデータは退避してクリア（復旧不能クラッシュを防止）
    try { mmkv.set(`${key ?? 'unknown'}:bak:${Date.now()}`, String(raw)); } catch {}
    if (key) mmkv.delete(key);
    return fallback;
  }
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = mmkv.getString(key);
  return safeParse<T>(raw, fallback, key);
}

export function setJSON<T>(key: string, value: T): void {
  mmkv.set(key, JSON.stringify(value));
}

export function del(key: string): void {
  mmkv.delete(key);
}

// 変更通知（簡易イベントバス）
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeStorage(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function notifyStorageChanged() {
  // 過剰発火を避けるなら必要に応じて throttle
  listeners.forEach((l) => l());
}
