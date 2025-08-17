// src/components/eduAI-related/tutorAI/TutorMessage.tsx
import React, { memo, useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import MathView from 'react-native-math-view';

type Segment =
  | { type: 'text'; value: string }
  | { type: 'math-inline'; value: string }
  | { type: 'math-block'; value: string };

export type TutorMessageProps = {
  role: 'user' | 'assistant';
  content: string | null | undefined;
  images?: string[];
  onLongPress?: () => void;
};

const UI = {
  textSize: 16,
  lineHeight: 24,
  bubbleMine: 'rgba(33,48,78,0.96)',
  bubbleTheirs: 'rgba(17,24,39,0.94)',
  bubbleBorder: 'rgba(255,255,255,0.22)',
  neon: '#22d3ee',
  // ブロック式の上下マージン（詰め気味）
  blockVMargin: 4,
};

/* 安全な前処理：コードブロック除去・空行圧縮 */
function normalize(src: string): string {
  let s = src ?? '';
  s = s.replace(/```(?:[\s\S]*?\n)?([\s\S]*?)```/g, '$1');
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s;
}

/* TeX 抽出：$$..$$ / \[..\] / \(..\) / $..$ */
function splitMathSegments(text: string): Segment[] {
  const src = normalize(text);
  const segs: Segment[] = [];
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

/** 長い式はフォントを少し下げて“はみ出さない”ように（疑似 wrap） */
function calcEmByLength(tex: string, block: boolean): number {
  const L = tex.length;
  if (!block) return 1.06;               // インラインは少し大きめ
  if (L <= 40) return 1.15;
  if (L <= 70) return 1.05;
  if (L <= 110) return 0.95;
  return 0.9;                             // かなり長い式は小さめ
}

/** 白文字＋分数を大きく＋font-size 指定（transform は使わない） */
function enhanceTeX(tex: string, block: boolean): string {
  let t = tex;
  if (block) {
    t = t.replace(/\\frac(?=\s*{)/g, '\\dfrac');          // 分数を大きく
    if (!/^\s*\\displaystyle\b/.test(t)) t = `\\displaystyle ${t}`;
  }
  const em = calcEmByLength(t, block);
  // MathJax v3 の \style で色とフォントサイズを安全に指定
  t = `\\style{color:#fff; font-size:${em}em}{${t}}`;
  return t;
}

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

function MathPiece({ tex, block }: { tex: string; block: boolean }) {
  const display = enhanceTeX(tex, block);
  return (
    <View style={block ? styles.mathBlock : styles.mathInline}>
      <MathView
        math={display}
        style={styles.mathWebView}     // ← transform 拡大は一切しない
      />
    </View>
  );
}

export default memo(function TutorMessage({ role, content, images, onLongPress }: TutorMessageProps) {
  const mine = role === 'user';
  const segments = useMemo(() => splitMathSegments(content ?? ''), [content]);

  return (
    <View style={[styles.row, mine ? styles.right : styles.left]}>
      <Pressable
        onLongPress={onLongPress}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, !mine && styles.neon]}
      >
        <ImagesRow uris={images} />
        <View>
          {segments.map((seg, idx) =>
            seg.type === 'text'
              ? <Text key={idx} style={[styles.text, mine && styles.textMine]}>{seg.value}</Text>
              : <MathPiece key={idx} tex={seg.value} block={seg.type === 'math-block'} />
          )}
        </View>
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

  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  imageThumb: { width: 112, height: 112, borderRadius: 10, backgroundColor: '#0b1220' },

  // 数式まわり（上下の余白を詰める／横幅には従う）
  mathInline: { alignSelf: 'flex-start', marginVertical: 1 },
  mathBlock:  { alignSelf: 'stretch', marginTop: UI.blockVMargin, marginBottom: UI.blockVMargin },
  mathWebView:{ backgroundColor: 'transparent', width: '100%' }, // ← 横幅フィット

  meta: { marginTop: 6, fontSize: 11 },
  metaMine: { color: 'rgba(255,255,255,0.65)' },
  metaTheirs: { color: 'rgba(255,255,255,0.58)' },
});
