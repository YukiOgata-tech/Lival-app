// src/storage/AItoolsChatStorage.ts
import { MMKV } from 'react-native-mmkv';
import { AItoolsChatThread } from '@/types/AItoolsChatTypes';

import { notifyStorageChanged } from '@/storage/mmkv';

const STORAGE_KEY = 'aitools-chat-threads';

const storage = new MMKV();

/** チャットスレッド全体を取得（日付順ソート済みで返す） */
export function getAItoolsChatThreads(): AItoolsChatThread[] {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return [];
  const threads: AItoolsChatThread[] = JSON.parse(raw);
  return threads.sort((a, b) => b.updatedAt - a.updatedAt); // 新しい順
}

/** チャットスレッド全体を保存（共通化） */
export function saveAItoolsChatThreads(threads: AItoolsChatThread[]) {
  storage.set(STORAGE_KEY, JSON.stringify(threads));
}

/** 新規スレッドを追加（上書き保存） */
export function addAItoolsChatThread(thread: AItoolsChatThread) {
  const threads = getAItoolsChatThreads();
  saveAItoolsChatThreads([thread, ...threads.filter((t) => t.id !== thread.id)]);
  notifyStorageChanged();
}

/** 指定IDのスレッドを削除 */
export function removeAItoolsChatThread(threadId: string) {
  const threads = getAItoolsChatThreads().filter((t) => t.id !== threadId);
  saveAItoolsChatThreads(threads);
  notifyStorageChanged();
}

/** 全履歴を削除する用 */
export function clearAItoolsChatThreads() {
  storage.delete(STORAGE_KEY);
  notifyStorageChanged();
}

/** スレッド単体を取得（存在しなければundefined） */
export function getAItoolsChatThreadById(threadId: string): AItoolsChatThread | undefined {
  return getAItoolsChatThreads().find((t) => t.id === threadId);
}

/** スレッドのメッセージ追加・更新 */
export function updateAItoolsChatThreadMessages(
  threadId: string,
  messages: AItoolsChatThread['messages']
) {
  const threads = getAItoolsChatThreads().map((t) =>
    t.id === threadId
      ? { ...t, messages, updatedAt: Date.now() }
      : t
  );
  saveAItoolsChatThreads(threads);
}

/** スレッドのタイトルを変更 */
export function renameAItoolsChatThread(threadId: string, newTitle: string) {
  const threads = getAItoolsChatThreads();
  const idx = threads.findIndex((t) => t.id === threadId);
  if (idx >= 0) {
    threads[idx].title = newTitle;
    threads[idx].updatedAt = Date.now();
    saveAItoolsChatThreads(threads);
    notifyStorageChanged();
  }
}