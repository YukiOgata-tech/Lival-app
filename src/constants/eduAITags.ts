// src/constants/eduAITags.ts
import type { EduAITag } from '@/storage/eduAIStorage';

export const TAG_KEYS: EduAITag[] = ['important', 'memorize', 'check'];

export const TAGS: Record<EduAITag, { label: string; bg: string; fg: string; border: string }> = {
  important: { label: '重要', bg: '#fef3c7', fg: '#92400e', border: '#f59e0b' }, // amber
  memorize:  { label: '暗記', bg: '#e0f2fe', fg: '#075985', border: '#38bdf8' }, // sky
  check:     { label: '確認', bg: '#dcfce7', fg: '#065f46', border: '#34d399' }, // green
};

// 予期しないキー（例: 旧 'review'）に備えたフォールバック
export const UNKNOWN_TAG = { label: '不明', bg: '#f3f4f6', fg: '#374151', border: '#d1d5db' };
