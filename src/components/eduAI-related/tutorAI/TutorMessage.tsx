// src/components/eduAI-related/tutorAI/TutorMessage.tsx
import React, { memo, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform, Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import MathView from 'react-native-math-view';
import MathyTypewriter, { Segment as Seg } from '@/components/animations/MathyTypewriter';
import TypingDots from '@/components/eduAI-related/tutorAI/TypingDots';
import { TAGS, UNKNOWN_TAG } from '@/constants/eduAITags';
import type { EduAITag } from '@/storage/eduAIStorage';

/** ====== props ====== */
export type TutorMessageProps = {
  role: 'user' | 'assistant';
  content: string | null | undefined;
  images?: string[];
  tags?: EduAITag[];
  onLongPress?: () => void;
  animate?: boolean; // アシスタント新着だけアニメ
};

/** ====== UI tokens ====== */
const UI = {
  textSize: 16,
  lineHeight: 24,
  bubbleMine: 'rgba(33,48,78,0.96)',
  bubbleTheirs: 'rgba(17,24,39,0.94)',
  bubbleBorder: 'rgba(255,255,255,0.22)',
  neon: '#22d3ee',
  blockVMargin: 4,
};

/** ====== utils ====== */
function normalize(src: string): string {
  let s = src ?? '';
  s = s.replace(/```(?:[\s\S]*?\n)?([\s\S]*?)```/g, '$1');
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s;
}
function splitMathSegments(text: string): Seg[] {
  const src = normalize(text);
  const segs: Seg[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\$)\$([^\$]+?)\$(?!\$)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const start = m.index, full = m[0]!;
    if (start > last) segs.push({ type: 'text', value: src.slice(last, start) });
    const b1 = m[1], b2 = m[2], i1 = m[3], i2 = m[4];
    if (b1 != null) segs.push({ type: 'math-block', value: b1.trim() });
    else if (b2 != null) segs.push({ type: 'math-block', value: b2.trim() });
    else if (i1 != null) segs.push({ type: 'math-inline', value: i1.trim() });
    else if (i2 != null) segs.push({ type: 'math-inline', value: i2.trim() });
    else segs.push({ type: 'text', value: full });
    last = start + full.length;
  }
  if (last < src.length) segs.push({ type: 'text', value: src.slice(last) });
  return segs.filter(s => s.value.length);
}
function enhanceTeX(tex: string, block: boolean): string {
  let t = tex;
  if (block) {
    t = t.replace(/\\frac(?=\s*{)/g, '\\dfrac');
    if (!/^\s*\\displaystyle\b/.test(t)) t = `\\displaystyle ${t}`;
  }
  const L = tex.length;
  const em = block ? (L <= 40 ? 1.15 : L <= 70 ? 1.05 : L <= 110 ? 0.95 : 0.9) : 1.06;
  return `\\style{color:#fff; font-size:${em}em}{${t}}`;
}

/** スタティック：リンク化インライン */
function LinkifiedInline({ text, isMine }: { text: string; isMine: boolean }) {
  const color = isMine ? '#F8FAFC' : '#E5E7EB';
  const pattern = /(https?:\/\/[^\s<>"'）)】＞>]+|www\.[^\s<>"'）)】＞>]+)/gi;
  const parts = useMemo(() => {
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
    <Text selectable style={[styles.text, isMine && styles.textMine]}>
      {parts.map((p, i) =>
        p.t === 'link'
          ? <Text key={`${i}-${p.v}`} style={[styles.link, { color }]} onPress={() => p.u && open(p.u!)}>{p.v}</Text>
          : <Text key={`${i}-${p.v}`} style={{ color }}>{p.v}</Text>
      )}
    </Text>
  );
}

/** 画像サムネ */
function ImagesRow({ uris }: { uris?: string[] }) {
  if (!uris?.length) return null;
  return (
    <View style={styles.imagesRow}>
      {uris.map((u, i) => (
        <Image key={`${u}-${i}`} source={{ uri: u }} style={styles.imageThumb} />
      ))}
    </View>
  );
}

/** タグ */
function TagChips({ tags }: { tags?: EduAITag[] }) {
  if (!tags?.length) return null;
  return (
    <View style={styles.tagRow}>
      {tags.map((k) => {
        const spec = (TAGS as any)[k] ?? UNKNOWN_TAG;
        const border = spec.border || '#38bdf8';
        const text = spec.fg || '#e0f2fe';
        const bg = 'rgba(255,255,255,0.06)';
        return (
          <View
            key={k}
            style={[
              styles.tagChip,
              {
                borderColor: border,
                backgroundColor: bg,
                ...(Platform.OS === 'ios'
                  ? { shadowColor: border, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }
                  : {}),
              },
            ]}
          >
            <Text style={[styles.tagText, { color: text }]}>{spec.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default memo(function TutorMessage({
  role, content, images, tags, onLongPress, animate = false,
}: TutorMessageProps) {
  const mine = role === 'user';
  const isPlaceholder = !mine && (content?.trim() ?? '') === '（生成中…）';
  const segments = useMemo(() => splitMathSegments(content ?? ''), [content]);
  const [animatedDone, setAnimatedDone] = useState(false);

  const bubbleBg = mine ? UI.bubbleMine : UI.bubbleTheirs;
  const textColor = mine ? '#F8FAFC' : '#E5E7EB';

  return (
    <View style={[styles.row, mine ? styles.right : styles.left]}>
      <Pressable
        onLongPress={onLongPress}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, !mine && styles.neon]}
      >
        <ImagesRow uris={images} />

        {/* 生成中（アシスタントのプレースホルダ）→ バブル内 TypingDots */}
        {isPlaceholder ? (
          <View className="flex-row items-center">
            <TypingDots size={7} />
            <Text style={[styles.text, { marginLeft: 8, color: textColor }]}>作成中…</Text>
          </View>
        ) : (!mine && animate && !animatedDone) ? (
          // アニメーション表示（テキスト＋数式）
          <MathyTypewriter
            segments={segments}
            isMine={!!mine}
            bubbleBg={bubbleBg}
            textColor={textColor}
            cps={28}
            onAllDone={() => setAnimatedDone(true)}
          />
        ) : (
          // スタティック最終表示
          <View>
            {segments.map((seg, idx) =>
              seg.type === 'text'
                ? <LinkifiedInline key={idx} text={seg.value} isMine={!!mine} />
                : <MathView key={idx} math={enhanceTeX(seg.value, seg.type === 'math-block')} style={styles.mathWebView} />
            )}
          </View>
        )}

        <TagChips tags={tags} />
        <Text style={[styles.meta, mine ? styles.metaMine : styles.metaTheirs]}>
          {mine ? 'あなた' : '家庭教師'}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, marginVertical: 6 },
  right: { alignItems: 'flex-end' },
  left: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '92%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  bubbleMine: { backgroundColor: UI.bubbleMine, borderColor: UI.bubbleBorder },
  bubbleTheirs:{ backgroundColor: UI.bubbleTheirs, borderColor: UI.bubbleBorder },
  neon: { shadowColor: UI.neon, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },

  text: { fontSize: UI.textSize, lineHeight: UI.lineHeight, color: '#E5E7EB' },
  textMine: { color: '#F8FAFC' },
  link: { textDecorationLine: 'underline' },

  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  imageThumb: { width: 112, height: 112, borderRadius: 10, backgroundColor: '#0b1220' },

  mathInline: { alignSelf: 'flex-start', marginVertical: 1 },
  mathBlock:  { alignSelf: 'stretch', marginTop: UI.blockVMargin, marginBottom: UI.blockVMargin },
  mathWebView:{ backgroundColor: 'transparent', width: '100%' },

  meta: { marginTop: 6, fontSize: 11 },
  metaMine: { color: 'rgba(255,255,255,0.65)' },
  metaTheirs: { color: 'rgba(255,255,255,0.58)' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  tagChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, marginRight: 6, marginTop: 6 },
  tagText: { fontSize: 11, fontWeight: '600' },
});
