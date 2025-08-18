// src/lib/eduAIClient.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { app, ensureSignedIn } from '@/lib/firebase';

/** ===== Types ===== */
export type Agent = 'tutor' | 'counselor' | 'planner';

export type Msg = {
  role: 'user' | 'assistant';
  content: string;
};

type TutorReq = { messages: Msg[]; images?: string[]; previewOnly?: boolean };
type TutorRes = { text: string };

type PlannerReq = {
  messages: Msg[];
  planMode?: boolean;
  horizon?: '1w' | '2w' | '1m' | '2m' | '1y';
  priorities?: string[];
};
type PlannerRes = { text: string };

type CounselorReq = {
  messages: Msg[];
  allowSearch?: boolean;
  quality?: 'standard' | 'premium';
};
type CounselorRes = { text: string };

/** ===== Constants ===== */
const REGION = 'asia-northeast1';

/** ===== Utilities ===== */

/** 余計なプロパティを落として、APIが期待する最小形に揃える */
function sanitize(messages: unknown): Msg[] {
  const arr = (Array.isArray(messages) ? messages : []) as any[];
  return arr
    .map((m): Msg | null => {
      const content = String(m?.content ?? '').trim();
      if (!content) return null;
      const role: 'user' | 'assistant' = m?.role === 'assistant' ? 'assistant' : 'user';
      return { role, content };
    })
    .filter((m): m is Msg => m !== null);
}

/** 匿名サインインを保証＋IDトークンを必ずミント（401/unauthenticated対策） */
async function ensureAuthToken() {
  await ensureSignedIn();
  await getAuth(app).currentUser?.getIdToken(true).catch(() => {});
}

/** onCall を安全に叩く（unauthenticated は1回だけ自動リトライ） */
async function callCallable<TReq, TRes>(name: string, payload: TReq): Promise<TRes> {
  await ensureAuthToken();

  // ★ ここが重要：毎回関数インスタンスを取得する
  const fns = getFunctions(app, REGION);
  const fn = httpsCallable<TReq, TRes>(fns, name);

  try {
    const { data } = await fn(payload);
    return data as TRes;
  } catch (err: any) {
    const code: string = err?.code || err?.message || '';
    const unauth =
      code.includes('unauthenticated') ||
      code.includes('functions/unauthenticated') ||
      code.includes('permission-denied');

    if (unauth) {
      // トークン再発行 → 1 回だけ再試行
      await ensureAuthToken();
      const fns2 = getFunctions(app, REGION);
      const fn2 = httpsCallable<TReq, TRes>(fns2, name);
      const { data } = await fn2(payload);
      return data as TRes;
    }

    if (__DEV__) {
      console.warn('[eduAI] callable error:', code, err);
    }
    throw err;
  }
}

/** ===== Public APIs ===== */

export async function callTutor(
  messages: Msg[] | any[],
  opt?: { images?: string[]; previewOnly?: boolean }
): Promise<string> {
  const payload: TutorReq = {
    messages: sanitize(messages as any[]),
    images: opt?.images,
    previewOnly: !!opt?.previewOnly,
  };
  const res = await callCallable<TutorReq, TutorRes>('eduAITutorChat', payload);
  return (res?.text ?? '').trim();
}

export async function callPlanner(
  messages: Msg[] | any[],
  opt?: { planMode?: boolean; horizon?: '1w' | '2w' | '1m' | '2m' | '1y'; priorities?: string[] }
): Promise<string> {
  const payload: PlannerReq = {
    messages: sanitize(messages as any[]),
    planMode: !!opt?.planMode,
    horizon: opt?.horizon,
    priorities: opt?.priorities,
  };
  const res = await callCallable<PlannerReq, PlannerRes>('eduAIPlannerChat', payload);
  return (res?.text ?? '').trim();
}

export async function callCounselor(
  messages: Msg[] | any[],
  opt?: { allowSearch?: boolean; quality?: 'standard' | 'premium' }
): Promise<string> {
  const payload: CounselorReq = {
    messages: sanitize(messages as any[]),
    allowSearch: !!opt?.allowSearch,
    quality: opt?.quality ?? 'standard',
  };
  const res = await callCallable<CounselorReq, CounselorRes>('eduAICounselorChat', payload);
  return (res?.text ?? '').trim();
}

/** onRequest 版の分類API。URL優先。なければ projectId から自動構築。*/
export async function eduAIClassify(text: string): Promise<Agent> {
  const explicit = process.env.EXPO_PUBLIC_EDUAI_CLASSIFY_URL;
  const pid = (app.options as any)?.projectId as string | undefined;
  const base =
    explicit ||
    (pid ? `https://${REGION}-${pid}.cloudfunctions.net/eduAIClassify` : undefined);

  if (!base) return 'tutor';

  try {
    const r = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const j = await r.json();
    const route = (j?.route ?? j?.agent ?? j?.label) as Agent;
    return route === 'counselor' || route === 'planner' ? route : 'tutor';
  } catch {
    return 'tutor';
  }
}

/** ルーター経由での初回応答 */
export async function eduAIChat(
  agent: Agent,
  messages: Msg[] | any[],
  opt?: {
    // counselor
    allowSearch?: boolean;
    quality?: 'standard' | 'premium';
    // planner
    planMode?: boolean;
    horizon?: '1w' | '2w' | '1m' | '2m' | '1y';
    priorities?: string[];
    // tutor
    images?: string[];
    previewOnly?: boolean;
  }
): Promise<string> {
  const sanitized = sanitize(messages as any[]);
  if (agent === 'tutor') {
    return callTutor(sanitized, { images: opt?.images, previewOnly: !!opt?.previewOnly });
  }
  if (agent === 'planner') {
    return callPlanner(sanitized, {
      planMode: !!opt?.planMode,
      horizon: opt?.horizon,
      priorities: opt?.priorities,
    });
  }
  if (agent === 'counselor') {
    return callCounselor(sanitized, { allowSearch: false, quality: opt?.quality ?? 'standard' });
  }
  return callTutor(sanitized, { images: opt?.images, previewOnly: !!opt?.previewOnly });
}
