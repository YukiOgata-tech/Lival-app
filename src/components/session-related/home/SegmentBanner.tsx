import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';

export default function SegmentBanner({
  mode,
  clock,
  progress = 0,
}: {
  mode: 'idle' | 'focus' | 'break';
  clock: string;
  progress?: number; // 0..1
}) {
  const [on, setOn] = useState(true);
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => setOn(v => !v), 800);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, []);

  if (mode === 'idle') return null;

  const cls =
    mode === 'focus'
      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800';

  const label = mode === 'focus' ? '集中中' : '休憩中';

  return (
    <View className={`mx-4 mt-2 mb-1 rounded-2xl px-3 py-2 border ${cls}`}>
      <Text className="text-[13px] text-neutral-700 dark:text-neutral-200">
        <Text>{on ? '● ' : '○ '}</Text>
        {label} ・ 残り {clock}
      </Text>

      <View className="mt-2 h-[6px] w-full rounded bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        <View
          className={`h-full ${mode === 'focus' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-sky-500 dark:bg-sky-400'}`}
          style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
        />
      </View>
    </View>
  );
}
