// src/components/eduAI-related/counselorAI/CounselorMessages.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, FlatList, Keyboard, Pressable, Text, View, Linking, Alert, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import * as WebBrowser from 'expo-web-browser';
import type { EduAIMessage, EduAITag } from '@/storage/eduAIStorage';
import { TAGS, UNKNOWN_TAG } from '@/constants/eduAITags';

const LOADING_ANIM = require('@assets/lotties/loading-animation.json');
const INIT_LOADING_MS = 500;

type Props = {
  data: (EduAIMessage & { tags?: EduAITag[] })[];
  onLongPress?: (m: EduAIMessage & { tags?: EduAITag[] }) => void;
  typing?: boolean;
};

/** URL検出＆クリックで外部ブラウザ */
function LinkifiedText({
  text,
  variant,
}: {
  text: string;
  variant: 'user' | 'assistant';
}) {
  const color = variant === 'user' ? '#bfdbfe' /* blue-200 */ : '#4338ca' /* indigo-700 */;
  const segments = useMemo(() => {
    // URL検出: https? or www. 末尾の句読点や閉じカッコは除去
    const pattern = /(https?:\/\/[^\s<>"'）)】＞>]+|www\.[^\s<>"'）)】＞>]+)/gi;
    const parts: Array<{ type: 'text' | 'link'; value: string; url?: string }> = [];
    let last = 0;
    let m: RegExpExecArray | null;
    const src = text ?? '';
    while ((m = pattern.exec(src)) !== null) {
      const start = m.index!;
      if (start > last) parts.push({ type: 'text', value: src.slice(last, start) });
      let raw = m[0]!;
      // 末尾の区切りを除去
      raw = raw.replace(/[.,、。)\]）】＞>”’'"]+$/u, '');
      const url = raw.startsWith('http') ? raw : `https://${raw}`;
      parts.push({ type: 'link', value: raw, url });
      last = start + m[0]!.length;
    }
    if (last < src.length) parts.push({ type: 'text', value: src.slice(last) });
    return parts;
  }, [text]);

  const open = async (url: string) => {
    try {
      // まずは in-app browser（iOS: SFSafariView, Android: Custom Tabs）
      const res = await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
      // ユーザーが閉じたら何もしない
    } catch {
      // フォールバック
      try {
        const can = await Linking.canOpenURL(url);
        if (can) await Linking.openURL(url);
        else throw new Error('cannot open');
      } catch {
        Alert.alert('リンクを開けませんでした', url);
      }
    }
  };

  return (
    <Text selectable style={{ color: variant === 'user' ? 'white' : '#0f172a' }}>
      {segments.map((p, i) =>
        p.type === 'link' ? (
          <Text
            key={`${i}-${p.value}`}
            style={{ color, textDecorationLine: 'underline' }}
            onPress={() => p.url && open(p.url)}
            // 長押しはバブル側で使うので、ここでは onLongPress は付けない
            suppressHighlighting
          >
            {p.value}
          </Text>
        ) : (
          <Text key={`${i}-${p.value}`}>{p.value}</Text>
        )
      )}
    </Text>
  );
}

export default function CounselorMessages({ data, onLongPress, typing }: Props) {
  const listRef = useRef<FlatList<EduAIMessage>>(null);

  // --- 初期強制ローディング ---
  const [initialLoading, setInitialLoading] = useState(true);
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), INIT_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  // Lottie再生を常にクリーンに開始
  useEffect(() => {
    if (typing || initialLoading) {
      lottieRef.current?.reset?.();
      lottieRef.current?.play?.();
    }
  }, [typing, initialLoading]);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [data.length, typing, initialLoading]);

  const Bubble = ({ m }: { m: EduAIMessage & { tags?: EduAITag[] } }) => {
    const isUser = m.role === 'user';
    const anim = useRef(new Animated.Value(24)).current; // Y=24→0 (assistantのみ)
    useEffect(() => {
      if (!isUser) {
        Animated.timing(anim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start();
      }
    }, [anim, isUser]);

    const Container = ({ children }: { children: React.ReactNode }) =>
      isUser ? (
        <View className="px-3 items-end">{children}</View>
      ) : (
        <Animated.View
          className="px-3 items-start"
          style={{ transform: [{ translateY: anim }] }}
        >
          {children}
        </Animated.View>
      );

    return (
      <Container>
        <Pressable
          onLongPress={onLongPress ? () => onLongPress(m) : undefined}
          android_ripple={isUser ? undefined : { color: '#c7d2fe' }} 
          className={`max-w-[82%] px-3 py-2 my-1 rounded-2xl border ${
            isUser ? 'bg-blue-600 border-blue-600' : 'bg-indigo-50 border-indigo-200'
          }`}
        >
          {/* 本文（URLは自動リンク化） */}
          <LinkifiedText
            text={m.content ?? ''}
            variant={isUser ? 'user' : 'assistant'}
          />

          {/* 発話者ラベル */}
          {m.role === 'assistant' && (
            <Text
              className={`text-[11px] mt-1 ${
                isUser ? 'text-white/70' : 'text-indigo-600'
              }`}
            >
              進路カウンセラー
            </Text>
          )}

          {/* タグバッジ */}
          {m.tags?.length ? (
            <View className="flex-row flex-wrap mt-1">
              {m.tags.map((k) => {
                const spec = TAGS[k as keyof typeof TAGS] ?? UNKNOWN_TAG;
                return (
                  <View
                    key={k}
                    className="px-2 py-1 mr-1 mt-1 rounded-full border"
                    style={{ backgroundColor: spec.bg, borderColor: spec.border }}
                  >
                    <Text className="text-[10px]" style={{ color: spec.fg }}>{spec.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Container>
    );
  };

  const showLoading = typing || initialLoading;

  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <Bubble m={item as any} />}
      contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => Keyboard.dismiss()}
      onTouchStart={() => Keyboard.dismiss()}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      initialNumToRender={20}
      windowSize={10}
      removeClippedSubviews
      ListFooterComponent={
        showLoading ? (
          <View className="px-3 items-start">
            <View className="max-w-[68%] px-3 py-2 my-1 rounded-2xl bg-indigo-50 border border-indigo-200">
              <LottieView
                key={`counselor-loading-${initialLoading ? 'init' : 'typing'}`}
                ref={lottieRef}
                source={LOADING_ANIM}
                autoPlay
                loop
                style={{ width: 64, height: 64 }}
              />
              <Text className="text-[11px] mt-1 text-indigo-600">進路カウンセラー が作成中…</Text>
            </View>
          </View>
        ) : null
      }
    />
  );
}
