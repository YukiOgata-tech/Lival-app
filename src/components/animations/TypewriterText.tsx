// src/components/aiFx/TypewriterText.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle } from 'react-native-reanimated';

export type TypewriterTextProps = {
  text: string;
  variant: 'user' | 'assistant';
  speed?: number;             // 1秒あたりの文字数（既定: 28）
  smartPunctPause?: boolean;  // 句読点で一瞬溜める（既定: true）
  startDelayMs?: number;      // 開始のワンテンポ（既定: 80ms）
  onDone?: () => void;        // 完了コールバック
};

const LINK_COLOR_USER = '#bfdbfe';     // blue-200
const LINK_COLOR_ASSIST = '#4338ca';   // indigo-700

/** URL自動リンク */
function Linkified({ text, variant }: { text: string; variant: 'user' | 'assistant' }) {
  const color = variant === 'user' ? LINK_COLOR_USER : LINK_COLOR_ASSIST;
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
    try {
      await WebBrowser.openBrowserAsync(u, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
    } catch {
      try { (await Linking.canOpenURL(u)) && (await Linking.openURL(u)); }
      catch { Alert.alert('リンクを開けませんでした', u); }
    }
  };

  return (
    <Text selectable style={{ color: variant === 'user' ? 'white' : '#0f172a' }}>
      {parts.map((p, i) =>
        p.t === 'link' ? (
          <Text
            key={`${i}-${p.v}`}
            style={{ color, textDecorationLine: 'underline' }}
            onPress={() => p.u && open(p.u)}
            suppressHighlighting
          >
            {p.v}
          </Text>
        ) : (
          <Text key={`${i}-${p.v}`}>{p.v}</Text>
        )
      )}
    </Text>
  );
}

/** 本体：タイプライター表示 */
export default function TypewriterText({
  text,
  variant,
  speed = 28,
  smartPunctPause = true,
  startDelayMs = 80,
  onDone,
}: TypewriterTextProps) {
  const [visible, setVisible] = useState('');
  const [done, setDone] = useState(false);
  const iRef = useRef(0);

  // ✅ 初期値必須：null許容で初期化（エラー回避）
  const stopRef = useRef<(() => void) | null>(null);

  // カーソル（点滅）
  const cursorOpacity = useSharedValue(1);
  useEffect(() => {
    if (!done) cursorOpacity.value = withRepeat(withTiming(0, { duration: 600 }), -1, true);
    else cursorOpacity.value = withTiming(0, { duration: 160 });
  }, [done, cursorOpacity]);
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));

  useEffect(() => {
    let alive = true;
    setVisible(''); setDone(false); iRef.current = 0;

    const baseInterval = 1000 / Math.max(1, speed);
    const punct = /[。、，,．\.!?？！…」』）\)\]\}]/;

    const run = async () => {
      // ワンテンポ
      await new Promise((r) => setTimeout(r, startDelayMs));
      while (alive && iRef.current < text.length) {
        iRef.current += 1;
        setVisible(text.slice(0, iRef.current));
        const ch = text[iRef.current - 1];
        const extra = smartPunctPause && punct.test(ch) ? baseInterval * 0.8 : 0;
        await new Promise((r) => setTimeout(r, baseInterval + extra));
      }
      if (alive) {
        setDone(true);
        onDone?.();
      }
    };
    run();

    // 一気に表示するための停止関数をセット
    stopRef.current = () => { alive = false; setVisible(text); setDone(true); };

    return () => { alive = false; };
  }, [text, speed, smartPunctPause, startDelayMs, onDone]);

  // タップ = 一気に表示
  const fastForward = () => stopRef.current?.();

  return (
    <Pressable onPress={fastForward}>
      <Linkified text={visible} variant={variant} />
      {!done ? <Animated.Text style={[{ color: variant === 'user' ? 'white' : '#0f172a' }, cursorStyle]}>|</Animated.Text> : null}
    </Pressable>
  );
}
