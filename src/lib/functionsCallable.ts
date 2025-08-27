// src/lib/functionsCallable.ts
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase';

type AnyObj = Record<string, any>;

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

export async function callCallable<TReq extends AnyObj = AnyObj, TRes = any>(
  name: string,
  data?: TReq,
) {
  const primary = process.env.EXPO_PUBLIC_FUNCTIONS_REGION || 'asia-northeast1';
  const candidates = uniq([primary, 'us-central1']);

  let lastErr: any = null;
  for (const region of candidates) {
    try {
      const fns = getFunctions(app, region);
      const fn = httpsCallable<TReq, TRes>(fns, name);
      const res = await fn(data as TReq);
      return res.data as TRes;
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || '');
      const code = String(e?.code || '');
      const isNotFound = code.includes('not-found') || msg.includes('not-found');
      if (!isNotFound) break; // 別原因の失敗は即座に中断
      // not-found の場合のみ次のリージョンへ
    }
  }
  throw lastErr ?? new Error('Callable execution failed');
}

