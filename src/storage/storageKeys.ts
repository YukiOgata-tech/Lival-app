// src/storage/storageKeys.ts
export const K = {
  // --- AItools: 100% Local ---
  AITOOLS_THREADS: 'aitools:threads', // ThreadIndex<AIToolsThread>
  AITOOLS_THREAD_MESSAGES: (id: string) => `aitools:thread:${id}:messages`, // ChatMessage[]

  // --- AIChat: Firestore-backed, MMKV cache ---
  AICHAT_THREADS: 'aichat:threads', // optional index
  AICHAT_CACHE: (uid: string, threadId: string) => `aichat:${uid}:${threadId}:cache`, // {messages,lastSyncedAt}

  // --- GroupChat: Firestore-backed, MMKV cache ---
  GROUP_THREADS: 'group:threads', // optional index
  GROUP_CACHE: (groupId: string) => `group:${groupId}:cache`, // {messages,lastSyncedAt}
} as const;