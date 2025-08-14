// src/hooks/useSessionCountdown.ts
import { useEffect, useMemo, useRef, useState } from 'react';

export type SessionTimeSource = {
  minutes?: number | null;
  sessionStartAt?: { toMillis: () => number } | null;
  createdAt?: { toMillis: () => number } | null;
  sessionForceEndedAt?: { toMillis: () => number } | null;
};

export function useSessionCountdown(src?: SessionTimeSource) {
  const totalMs = useMemo(() => {
    const mins = Math.max(0, Number(src?.minutes ?? 0));
    return mins * 60_000;
  }, [src?.minutes]);

  const startMs = useMemo(() => {
    return src?.sessionStartAt?.toMillis?.()
      ?? src?.createdAt?.toMillis?.()
      ?? Date.now();
  }, [src?.sessionStartAt, src?.createdAt]);

  const plannedEndMs = useMemo(() => startMs + totalMs, [startMs, totalMs]);

  const forceEndMs = src?.sessionForceEndedAt?.toMillis?.();
  const effectiveEndMs = useMemo(
    () => (forceEndMs ? Math.min(forceEndMs, plannedEndMs) : plannedEndMs),
    [forceEndMs, plannedEndMs]
  );

  const [now, setNow] = useState(() => Date.now());
  const raf = useRef<number | null>(null);
  const tick = () => { setNow(Date.now()); raf.current = requestAnimationFrame(tick); };

  useEffect(() => {
    // 1秒未満のズレも滑らかにしたいので requestAnimationFrame
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const remainingMs = Math.max(0, effectiveEndMs - now);
  const elapsedMs = Math.max(0, Math.min(now - startMs, totalMs));
  const progress = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;
  const isOver = remainingMs <= 0;

  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  const clock = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;

  return { clock, remainingMs, elapsedMs, totalMs, progress, isOver, effectiveEndMs, startMs };
}