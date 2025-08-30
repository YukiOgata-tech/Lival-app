// src/lib/userProfilesApi.ts
import { getSupabase, supabaseManager } from './supabase';
import type { UserProfile, UserProfileInput } from '@/types/UserProfileTypes';
import { firebaseAuth } from './firebase';

export async function getUserProfile(uid?: string): Promise<UserProfile | null> {
  await supabaseManager.ensureAuthenticated();
  const supabase = getSupabase();
  const userId = uid ?? firebaseAuth.currentUser?.uid;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('uid', userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

export async function upsertUserProfile(input: UserProfileInput): Promise<UserProfile | null> {
  await supabaseManager.ensureAuthenticated();
  const supabase = getSupabase();

  // 初期ペイロード（未指定の偏差値は50）
  const payload: Record<string, any> = {
    ...input,
    deviation_score: input.deviation_score ?? 50,
  };

  // 送信対象のキー（不明な列がある場合はリトライで削る）
  let keys = Object.keys(payload).filter((k) => payload[k] !== undefined);

  // 最大5回までリトライ（未知の列を順次除外）
  for (let attempt = 0; attempt < 5; attempt++) {
    const body: Record<string, any> = {};
    for (const k of keys) body[k] = payload[k];

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(body, { onConflict: 'uid' })
      .select('*')
      .single();

    if (!error) return data as UserProfile;

    // 未知列のエラー（PGRST204）に限り、対象カラムを除外して再試行
    const code = (error as any)?.code as string | undefined;
    const msg = (error as any)?.message as string | undefined;
    if (code === 'PGRST204' && msg) {
      const m = msg.match(/the '([^']+)' column/i);
      const missing = m?.[1];
      if (missing && keys.includes(missing)) {
        console.warn(`[upsertUserProfile] removing unknown column and retry: ${missing}`);
        keys = keys.filter((k) => k !== missing);
        continue;
      }
    }

    // smallint など型不一致（22P02）が出た場合、grade を除外して再試行
    if (code === '22P02' && keys.includes('grade')) {
      console.warn('[upsertUserProfile] type error, removing grade and retry');
      keys = keys.filter((k) => k !== 'grade');
      continue;
    }

    console.error('[upsertUserProfile] error', error);
    return null;
  }

  console.error('[upsertUserProfile] aborted after retries');
  return null;
}
