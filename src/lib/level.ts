// src/lib/level.ts

/** XP 100 ごとに 1 レベルアップする単純計算 */
export const calcLevel = (xp: number) => Math.floor(xp / 100);

/** 次のレベルまでに必要な XP を返す */
export const xpToNextLevel = (xp: number) => 100 - (xp % 100);