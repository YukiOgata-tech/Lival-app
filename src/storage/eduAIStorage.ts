// src/storage/eduAIStorage.ts
import { MMKV } from 'react-native-mmkv';

export const eduAIStorage = new MMKV({ id: 'eduAI-chat' });

export type EduAIAgent = 'tutor' | 'counselor' | 'planner';
export type EduAITag = 'important' | 'memorize' | 'check';

export type EduAIThread = {
  id: string;
  title: string;
  agent: EduAIAgent | null;   // null: 未割当（auto）
  lastMessagePreview: string;
  updatedAt: number;          // epoch ms
};

export type EduAIMessage = {
  id: string;                 // local id
  fsId?: string;              // Firestore id
  role: 'user'|'assistant';
  content: string;
  agent?: EduAIAgent;
  tags?: EduAITag[];
  at: number;                 // epoch ms
  /** 追加：画像質問やOCR用の画像を添付（dataURL/httpsどちらでも） */
  images?: string[];
};

const K_THREADS = 'eduAI-threads';
const K_MSG_PREFIX = 'eduAI-messages-'; // + threadId

/* ---------- Threads ---------- */
export function getEduAIThreads(): EduAIThread[] {
  try { return JSON.parse(eduAIStorage.getString(K_THREADS) || '[]'); }
  catch { return []; }
}
export function setEduAIThreads(list: EduAIThread[]) {
  eduAIStorage.set(K_THREADS, JSON.stringify(list));
}
export function upsertEduAIThread(th: EduAIThread) {
  const list = getEduAIThreads();
  const i = list.findIndex(x => x.id === th.id);
  if (i >= 0) list[i] = th; else list.unshift(th); // 新規は先頭に
  setEduAIThreads(list.sort((a,b)=>b.updatedAt - a.updatedAt));
}
export function removeEduAIThread(threadId: string) {
  setEduAIThreads(getEduAIThreads().filter(x=>x.id!==threadId));
  eduAIStorage.delete(K_MSG_PREFIX + threadId);
}

/* ---------- Messages (per thread) ---------- */
export function getEduAIMessages(threadId: string): EduAIMessage[] {
  try { return JSON.parse(eduAIStorage.getString(K_MSG_PREFIX + threadId) || '[]'); }
  catch { return []; }
}
export function setEduAIMessages(threadId: string, msgs: EduAIMessage[]) {
  eduAIStorage.set(K_MSG_PREFIX + threadId, JSON.stringify(msgs));
}
export function appendEduAIMessage(threadId: string, msg: EduAIMessage, agentForThread?: EduAIAgent|null) {
  const msgs = getEduAIMessages(threadId);
  const next = [...msgs, msg];
  setEduAIMessages(threadId, next);
  // スレッド更新
  const preview = (msg.content || '').slice(0, 60);
  upsertEduAIThread({
    id: threadId,
    title: next.find(m=>m.role==='user')?.content.slice(0,20) || '新しいスレッド',
    agent: agentForThread ?? null,
    lastMessagePreview: preview,
    updatedAt: msg.at,
  });
}
export function setEduAIMessageFsId(threadId: string, localId: string, fsId: string) {
  const list = getEduAIMessages(threadId).map(m => m.id===localId ? ({...m, fsId}) : m);
  setEduAIMessages(threadId, list);
}
export function updateEduAIMessageTags(threadId: string, localId: string, tags: EduAITag[]) {
  const list = getEduAIMessages(threadId).map(m => m.id===localId ? ({...m, tags}) : m);
  setEduAIMessages(threadId, list);
}

// === 追記: スレッド名の変更・エージェント更新 ===
export function renameEduAIThread(threadId: string, title: string) {
  const list = getEduAIThreads();
  const i = list.findIndex(t => t.id === threadId);
  if (i >= 0) {
    list[i] = { ...list[i], title, updatedAt: Date.now() };
    setEduAIThreads(list.sort((a,b)=>b.updatedAt - a.updatedAt));
  }
}
export function setEduAIThreadAgent(threadId: string, agent: EduAIAgent) {
  const list = getEduAIThreads();
  const i = list.findIndex(t => t.id === threadId);
  if (i >= 0) {
    list[i] = { ...list[i], agent, updatedAt: Date.now() };
    setEduAIThreads(list.sort((a,b)=>b.updatedAt - a.updatedAt));
  }
}

export function updateEduAIMessageContent(threadId: string, localId: string, content: string) {
  const list = getEduAIMessages(threadId).map(m => m.id===localId ? ({...m, content}) : m);
  setEduAIMessages(threadId, list);
}

// 現在のスレッド
const EDUAI_CURRENT_THREAD_KEY = 'eduai/currentThreadId';
export function setEduAICurrentThreadId(id: string | null) {
  id ? eduAIStorage.set(EDUAI_CURRENT_THREAD_KEY, id) : eduAIStorage.delete(EDUAI_CURRENT_THREAD_KEY);
}
export function getEduAICurrentThreadId(): string | null {
  return eduAIStorage.getString(EDUAI_CURRENT_THREAD_KEY) ?? null;
}

// 司令塔の起動プリセット（'auto'|'tutor'|'counselor'|'planner'）
const EDUAI_ROUTER_PRESET_KEY = 'eduai/routerPreset';
export type RouterPreset = 'auto'|'tutor'|'counselor'|'planner';
export const setEduAIRouterPreset = (p: RouterPreset) => eduAIStorage.set(EDUAI_ROUTER_PRESET_KEY, p);
export const getEduAIRouterPreset = (): RouterPreset =>
  (eduAIStorage.getString(EDUAI_ROUTER_PRESET_KEY) as RouterPreset) ?? 'auto';
export const clearEduAIRouterPreset = () => eduAIStorage.delete(EDUAI_ROUTER_PRESET_KEY);
