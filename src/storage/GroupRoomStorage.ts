// src/storage/AItoolsChatStorage.ts
import { nanoid } from 'nanoid/non-secure';
import { getJSON, setJSON, del, notifyStorageChanged } from '@/storage/mmkv';
import { K } from './storageKeys';

export type AIToolKind = 'translation' | 'ocr' | 'other';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number; // epoch ms
  meta?: Record<string, any>;
}

export interface AIToolsThread {
  id: string;
  title: string;
  tool: AIToolKind;
  createdAt: number;
  updatedAt: number;
}

type ThreadIndex = AIToolsThread[];

// ---- internal helpers -------------------------------------------------------
function readIndex(): ThreadIndex {
  return getJSON<ThreadIndex>(K.AITOOLS_THREADS, []);
}
function writeIndex(next: ThreadIndex) {
  setJSON(K.AITOOLS_THREADS, next);
  notifyStorageChanged();
}
function readMessages(threadId: string): ChatMessage[] {
  return getJSON<ChatMessage[]>(K.AITOOLS_THREAD_MESSAGES(threadId), []);
}
function writeMessages(threadId: string, msgs: ChatMessage[]) {
  setJSON(K.AITOOLS_THREAD_MESSAGES(threadId), msgs);
  notifyStorageChanged();
}

// ---- API --------------------------------------------------------------------
export const AItoolsChatStorage = {
  listThreads(): ThreadIndex {
    const idx = readIndex();
    // 更新日降順
    return [...idx].sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createThread(input: { title?: string; tool?: AIToolKind }): AIToolsThread {
    const now = Date.now();
    const t: AIToolsThread = {
      id: nanoid(12),
      title: input.title?.trim() || '新規スレッド',
      tool: input.tool ?? 'other',
      createdAt: now,
      updatedAt: now,
    };
    const idx = readIndex();
    writeIndex([t, ...idx]);
    // 初期メッセージなし
    setJSON(K.AITOOLS_THREAD_MESSAGES(t.id), []);
    return t;
  },

  renameThread(id: string, title: string) {
    const idx = readIndex();
    const next = idx.map((t) => (t.id === id ? { ...t, title: title.trim(), updatedAt: Date.now() } : t));
    writeIndex(next);
  },

  deleteThread(id: string) {
    const idx = readIndex();
    writeIndex(idx.filter((t) => t.id !== id));
    del(K.AITOOLS_THREAD_MESSAGES(id));
  },

  getMessages(threadId: string): ChatMessage[] {
    return readMessages(threadId);
  },

  appendMessage(threadId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) {
    const id = msg.id ?? nanoid(12);
    const createdAt = msg.createdAt ?? Date.now();
    const nextMsg: ChatMessage = { ...msg, id, createdAt };

    const msgs = readMessages(threadId);
    writeMessages(threadId, [...msgs, nextMsg]);

    // update updatedAt
    const idx = readIndex();
    const nextIdx = idx.map((t) => (t.id === threadId ? { ...t, updatedAt: createdAt } : t));
    writeIndex(nextIdx);

    return nextMsg;
  },

  replaceMessages(threadId: string, messages: ChatMessage[]) {
    // 壊れ対策：id/createdAt が無い場合は補完
    const safe = messages.map((m) => ({
      id: m.id ?? nanoid(12),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt ?? Date.now(),
      meta: m.meta,
    }));
    writeMessages(threadId, safe);
    const latest = safe[safe.length - 1];
    if (latest) {
      const idx = readIndex();
      writeIndex(idx.map((t) => (t.id === threadId ? { ...t, updatedAt: latest.createdAt } : t)));
    }
  },

  clearThread(threadId: string) {
    writeMessages(threadId, []);
    const idx = readIndex();
    writeIndex(idx.map((t) => (t.id === threadId ? { ...t, updatedAt: Date.now() } : t)));
  },
};