// src/theme/eduAITheme.ts
export type EduAIAgent = 'tutor'|'counselor'|'planner';

export const EDU_AI_THEME: Record<EduAIAgent, {
  accent: string;         // Tailwind 風クラス or そのまま style でもOK
  emoji: string;          // 仮マスコット（将来Lottie/画像へ）
  nameJa: string;
}> = {
  tutor:      { accent: 'bg-blue-600',    emoji: '📘', nameJa: '家庭教師AI' },
  counselor:  { accent: 'bg-emerald-600', emoji: '🧭', nameJa: '進路カウンセラーAI' },
  planner:    { accent: 'bg-violet-600',  emoji: '📅', nameJa: '学習計画AI' },
};

