// src/lib/GroupSession-related/xp.ts
type XPInput = {
  focusMs: number;     // presence 集計結果
  plannedMs: number;   // minutes * 60_000
  tag?: string | null; // 'study', 'work', etc.
};

/**
 * XPの簡易ルール（あとで調整可）
 * - 基本: 1分 = 10XP（切上げなし）
 * - 達成率ボーナス: 100%達成で +20%、70%で +10%、50%で +5%
 * - タグ補正: 学習(study)は +10%、一般(general)は補正なし など
 */
export function calcXP({ focusMs, plannedMs, tag }: XPInput) {
  const basePerMin = 10;
  const mins = Math.floor(focusMs / 60000);
  let xp = mins * basePerMin;

  const rate = plannedMs > 0 ? focusMs / plannedMs : 0;
  if (rate >= 1) xp = Math.round(xp * 1.2);
  else if (rate >= 0.7) xp = Math.round(xp * 1.1);
  else if (rate >= 0.5) xp = Math.round(xp * 1.05);

  const t = (tag ?? '').toLowerCase();
  if (t === 'study' || t === '学習') xp = Math.round(xp * 1.1);
  // 他のタグ補正が必要ならここに追加

  return xp;
}