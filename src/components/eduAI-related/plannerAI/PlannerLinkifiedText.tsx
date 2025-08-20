// src/components/eduAI-related/plannerAI/PlannerLinkifiedText.tsx
import React, { useMemo } from 'react';
import { Alert, Linking, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function PlannerLinkifiedText({
  text,
  variant, // 'user' | 'assistant'
}: {
  text: string;
  variant: 'user' | 'assistant';
}) {
  const color = variant === 'user' ? '#c7d2fe' /* violet-200 */ : '#6d28d9' /* violet-700 */;

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
            onPress={() => p.u && open(p.u!)}
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
