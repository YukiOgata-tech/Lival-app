// src/types/UserProfileTypes.ts
export interface UserProfile {
  uid: string;
  deviation_score: number; // default 50 if unset
  display_name?: string | null;
  grade?: string | null;
  diag_rslt?: string | null;
  diag_rslt_desc?: string | null;
  target_universities?: string | null;
  career_interests?: string | null;
  avg_study_min?: number | null;
  prefers_video?: boolean | null;
  prefers_text?: boolean | null;
  recency_mark?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type UserProfileInput = Partial<Omit<UserProfile, 'uid'>> & { uid: string };
