// src/components/aiFx/MathyTypewriter.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Animated, { useSharedValue, withDelay, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import MathView from 'react-native-math-view';

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'math-inline'; value: string }
  | { type: 'math-block'; value: string };

type Props = {
  segments: Segment[];
  isMine: boolean;
  bubbleBg: string;
  textColor: string;
  startDelayMs?: number;
  cps?: number;
  onAllDone?: () => void;
  direction?: 'ltr' | 'rtl'; // 露出方向（既定 ltr）
};

/* --- util: URLリンク化 --- */
function Linkified({ text, color }: { text: string; color: string }) {
  const parts = useMemo(() => {
    const pattern = /(https?:\/\/[^\s<>"'）)】＞>]+|www\.[^\s<>"'）)】＞>]+)/gi;
    const list: Array<{ t: 'text' | 'link'; v: string; u?: string }> = [];
    let last = 0;
    const src = text ?? '';
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(src)) !== null) {
      const s = m.index!;
      if (s > last) list.push({ t: 'text', v: src.slice(last, s) });
      let raw = m[0]!.replace(/[.,、。)\]）】＞>”’'"]+$/u, '');
      const url = raw.startsWith('http') ? raw : `https://${raw}`;
      list.push({ t: 'link', v: raw, u: url });
      last = s + m[0]!.length;
    }
    if (last < src.length) list.push({ t: 'text', v: src.slice(last) });
    return list;
  }, [text]);

  const open = async (u: string) => {
    try { await WebBrowser.openBrowserAsync(u, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN }); }
    catch {
      try { (await Linking.canOpenURL(u)) && (await Linking.openURL(u)); }
      catch { Alert.alert('リンクを開けませんでした', u); }
    }
  };

  return (
    <Text selectable style={{ color }}>
      {parts.map((p, i) =>
        p.t === 'link'
          ? <Text key={`${i}-${p.v}`} style={{ color, textDecorationLine: 'underline' }} onPress={() => p.u && open(p.u!)}>{p.v}</Text>
          : <Text key={`${i}-${p.v}`}>{p.v}</Text>
      )}
    </Text>
  );
}

/* --- テキストタイプ --- */
function TypedText({
  text, color, startDelayMs = 0, cps = 28, onDone,
}: { text: string; color: string; startDelayMs?: number; cps?: number; onDone?: () => void }) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const base = Math.max(18, 1000 / cps);
    let i = 0;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      i += 1;
      setShown(i);
      if (i >= text.length) {
        setDone(true);
        onDone?.();
        return;
      }
      const ch = text[i - 1];
      const extra = /[、。，…!?！？」』）)\]\}]/.test(ch) ? base * 0.9 : 0;
      timerRef.current = setTimeout(step, base + extra);
    };

    timerRef.current = setTimeout(step, startDelayMs + base);
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, startDelayMs, cps, onDone]);

  if (done) return <Linkified text={text} color={color} />;
  return <Text style={{ color }}>{text.slice(0, shown)}</Text>;
}

/* --- helper: RGBA → 不透明（α=1） --- */
function toOpaqueColor(c: string): string {
  // 'rgba(r,g,b,a)' -> 'rgba(r,g,b,1)'
  const m = c.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d\.]+)?\s*\)$/i);
  if (m) {
    const r = Number(m[1]); const g = Number(m[2]); const b = Number(m[3]);
    return `rgba(${r},${g},${b},1)`;
  }
  return c; // #hex 等はそのまま
}

/* --- 数式リビール（左→右 or 右→左） --- */
function RevealMath({
  tex, block, bubbleBg, startDelayMs = 0, durationMs = 900, direction = 'ltr',
}: { tex: string; block: boolean; bubbleBg: string; startDelayMs?: number; durationMs?: number; direction?: 'ltr' | 'rtl' }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withDelay(startDelayMs, withTiming(1, { duration: durationMs })); }, [startDelayMs, durationMs]);

  const widthAnim = useAnimatedStyle(() => ({ width: `${(1 - progress.value) * 100}%` }));
  const highlightFade = useAnimatedStyle(() => ({ opacity: progress.value < 1 ? 0.6 : 0 }));

  // 数式の可読性調整
  const styled = useMemo(() => {
    let t = tex;
    if (block) {
      t = t.replace(/\\frac(?=\s*{)/g, '\\dfrac');
      if (!/^\s*\\displaystyle\b/.test(t)) t = `\\displaystyle ${t}`;
    }
    const L = tex.length;
    const em = block ? (L <= 40 ? 1.15 : L <= 70 ? 1.05 : L <= 110 ? 0.95 : 0.9) : 1.06;
    return `\\style{color:#fff; font-size:${em}em}{${t}}`;
  }, [tex, block]);

  const maskColor = toOpaqueColor(bubbleBg); // ★ 不透明マスクに補正
  const coverBase: any = { position: 'absolute', top: 0, bottom: 0, backgroundColor: maskColor };
  const highlightBase: any = { position: 'absolute', top: 0, bottom: 0, width: 18, backgroundColor: 'rgba(139,92,246,0.22)' };

  return (
    <View style={{ alignSelf: block ? 'stretch' : 'flex-start', marginVertical: block ? 4 : 1, overflow: 'hidden' }}>
      <MathView math={styled} style={{ backgroundColor: 'transparent', width: '100%' }} />

      {/* マスク（direction によってアンカーを切替） */}
      <Animated.View pointerEvents="none" style={[coverBase, direction === 'ltr' ? { right: 0 } : { left: 0 }, widthAnim]}>
        {/* スキャンハイライト：マスクの先端 */}
        <Animated.View pointerEvents="none" style={[highlightBase, { left: 0 }, highlightFade]} />
      </Animated.View>
    </View>
  );
}

export default function MathyTypewriter({
  segments, isMine, bubbleBg, textColor, startDelayMs = 0, cps = 28, onAllDone, direction = 'ltr',
}: Props) {
  let delay = startDelayMs;
  const total = segments.reduce((acc, seg) => {
    if (seg.type === 'text') {
      const base = seg.value.length * (1000 / cps);
      const punct = (seg.value.match(/[、。，…!?！？」』）)\]\}]/g)?.length ?? 0);
      return acc + base + punct * 35 + 80;
    } else {
      const L = seg.value.length;
      const d = Math.min(1600, Math.max(450, L * 10));
      return acc + d + 80;
    }
  }, 0);

  useEffect(() => {
    const t = setTimeout(() => onAllDone?.(), total + 40);
    return () => clearTimeout(t);
  }, [total, onAllDone]);

  return (
    <View>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          const d = delay;
          const el = <TypedText key={`t-${idx}`} text={seg.value} color={textColor} startDelayMs={d} cps={cps} />;
          const base = seg.value.length * (1000 / cps);
          const punct = (seg.value.match(/[、。，…!?！？」』）)\]\}]/g)?.length ?? 0);
          delay += base + punct * 35 + 80;
          return el;
        } else {
          const d = delay;
          const L = seg.value.length;
          const dur = Math.min(1600, Math.max(450, L * 10));
          delay += dur + 80;
          return (
            <RevealMath
              key={`m-${idx}`}
              tex={seg.value}
              block={seg.type === 'math-block'}
              bubbleBg={bubbleBg}
              startDelayMs={d}
              durationMs={dur}
              direction={direction}
            />
          );
        }
      })}
    </View>
  );
}
