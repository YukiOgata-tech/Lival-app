// src/screens/eduAI/TutorChatScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  KeyboardAvoidingView, Platform, View, Text, Pressable,
  Keyboard, Modal, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nanoid } from 'nanoid/non-secure';
import { ChevronLeft, Sparkles } from 'lucide-react-native';

import type { EduAIMessage } from '@/storage/eduAIStorage';
import {
  getEduAICurrentThreadId, getEduAIMessages, setEduAIMessages,
  appendEduAIMessage, updateEduAIMessageContent,
} from '@/storage/eduAIStorage';
import { eduAIAddMessage } from '@/lib/eduAIFirestore';
import { callTutor } from '@/lib/eduAIClient';

import TutorChatMessages from '@/components/eduAI-related/tutorAI/TutorChatMessages';
import type { TutorChatMessagesHandle } from '@/components/eduAI-related/tutorAI/TutorChatMessages';
import TutorChatInput from '@/components/eduAI-related/tutorAI/TutorChatInput';

type Row = EduAIMessage & { images?: string[] };

export default function TutorChatScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const threadId = getEduAICurrentThreadId()!;
  const [messages, setMessages] = useState<Row[]>(getEduAIMessages(threadId) as Row[]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listHandleRef = useRef<TutorChatMessagesHandle>(null);

  // 画像OCRプレビュー
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const busyRef = useRef(false);

  useEffect(() => {
    setMessages(getEduAIMessages(threadId) as Row[]);
    setTimeout(() => listHandleRef.current?.scrollToLatest(false), 0);
  }, [threadId]);

  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(() => listHandleRef.current?.scrollToLatest(false), 0);
      return () => clearTimeout(id);
    }, [])
  );
  // messages が更新されたら追従（アニメON）
  useEffect(() => {
    const id = setTimeout(() => listHandleRef.current?.scrollToLatest(true), 0);
    return () => clearTimeout(id);
  }, [messages.length]);

  // 直近8件のみ送る
  const last8 = useMemo(
    () => messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
    [messages]
  );

  // MMKVには画像なしで保存
  const persist = (next: Row[]) => {
    setMessages(next);
    const dropImages = next.map(({ images, ...m }) => m);
    setEduAIMessages(threadId, dropImages);
  };

  const scrollOffKeyboard = () => Keyboard.dismiss();

  /* ---- 1段目: 画像→テキスト化プレビュー ---- */
  const openPreview = async (rawInput: string, images: string[]) => {
    setIsTyping(true);
    try {
      const preview = await callTutor(
        [...last8, { role: 'user', content: rawInput || '（画像の問題をテキスト化してください）' }],
        { images, previewOnly: true }
      );
      setPreviewText((preview ?? '').trim() || '（抽出テキストが空でした。必要なら手入力してください）');
    } catch {
      setPreviewText('（プレビュー生成に失敗しました。そのまま送信するか、テキストを書き直してください）');
    } finally {
      setPreviewImages(images);
      setPreviewOpen(true);
      setIsTyping(false);
    }
  };

  /* ---- 2段目: プレビュー確定→本送信 ---- */
  const confirmPreview = async () => {
    const text = previewText.trim();
    setPreviewOpen(false);
    await doSendCore(text, previewImages);
    setPreviewText(''); setPreviewImages([]);
  };

  /* ---- 通常送信 ---- */
  const doSendCore = async (text: string, images: string[] = []) => {
    const t = text.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;

    // 1) ユーザー発話を保存（UI stateではimagesも持つ）
    const userId = nanoid();
    const userRow: Row = { id: userId, role: 'user', content: t, agent: 'tutor', at: Date.now(), images };
    appendEduAIMessage(threadId, userRow as any, 'tutor');
    persist([...(messages as Row[]), userRow]);
    try { await eduAIAddMessage(threadId, { role: 'user', content: t, agent: 'tutor', tags: [] }); } catch {}

    // 2) アシスタントのplaceholder
    const asstId = nanoid();
    const placeholder: Row = { id: asstId, role: 'assistant', content: '（生成中…）', agent: 'tutor', at: Date.now() };
    appendEduAIMessage(threadId, placeholder as any, 'tutor');
    persist([...(messages as Row[]), userRow, placeholder]);

    // 3) 応答生成→上書き
    try {
      setIsTyping(true);
      const reply = await callTutor(
        getEduAIMessages(threadId).slice(-8).map(m => ({ role: m.role, content: m.content })),
        images.length ? { images } : undefined
      );
      const safe = (reply ?? '').trim() || '（応答が空でした）';
      updateEduAIMessageContent(threadId, asstId, safe);
      setMessages(getEduAIMessages(threadId) as Row[]);
      try { await eduAIAddMessage(threadId, { role: 'assistant', content: safe, agent: 'tutor', tags: [] }); } catch {}
    } catch (e: any) {
      const reason = e?.message || e?.code || 'unknown';
      updateEduAIMessageContent(
        threadId, asstId,
        `(応答を取得できませんでした)\n${__DEV__ ? `理由: ${reason}` : ''}`
      );
      setMessages(getEduAIMessages(threadId) as Row[]);
    } finally {
      setIsTyping(false);
      busyRef.current = false;
    }
  };

  const onSend = async ({ text, images }: { text: string; images: string[] }) => {
    if ((images?.length ?? 0) > 0) await openPreview(text, images);
    else await doSendCore(text);
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 背景：近未来グラデ＋微粒子 */}
      <LinearGradient
        colors={['#0b1220', '#0b1220', '#0d1a2b']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ ...StyleSheet.absoluteFillObject }}
      />
      <View className="absolute -top-24 -right-20 w-[240px] h-[240px] rounded-full bg-cyan-400/20 blur-3xl" />
      <View className="absolute top-40 -left-16 w-[200px] h-[200px] rounded-full bg-violet-500/20 blur-3xl" />

      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="border-b border-white/10 bg-transparent">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => nav.goBack()} className="p-2 -ml-2 mr-2 rounded-full bg-white/5">
            <ChevronLeft size={22} color="#e5e7eb" />
          </Pressable>
          <Text className="text-xl font-semibold text-white">家庭教師</Text>
          <View className="ml-auto flex-row items-center px-2 py-1 rounded-full bg-white/5">
            <Sparkles size={16} color="#A7F3D0" />
            <Text className="ml-1 text-[11px] text-emerald-200">数式最適表示</Text>
          </View>
        </View>
      </View>

      {/* Note */}
      <View className="px-4 py-2">
        <Text className="text-[11px] text-cyan-200/70">
          画像は『テキスト化プレビュー → 送信』の二段出力。数式は <Text className="font-semibold">$$…$$ / \[…\]</Text> と <Text className="font-semibold">\(…\) / $…$</Text> を解釈します。
        </Text>
      </View>

      {/* Messages */}
      <TutorChatMessages data={messages} typing={isTyping} ref={listHandleRef}/>

      {/* Input（ガラス調） */}
      <View pointerEvents='box-none'>
        <TutorChatInput
          value={input}
          onChange={setInput}
          onSend={onSend}
          placeholder="質問や定理の説明・証明依頼もOK（画像だけでも可）"
        />
      </View>

      {/* OCRプレビューモーダル */}
      <Modal visible={previewOpen} animationType="slide" transparent onRequestClose={() => setPreviewOpen(false)}>
        <View className="flex-1 bg-black/40">
          <View className="mt-auto bg-[#0f172a] rounded-t-2xl p-4 border border-white/10">
            <Text className="text-base font-semibold text-white mb-1">テキスト化プレビュー</Text>
            <Text className="text-[12px] text-white/60 mb-3">必要に応じて編集し「送信」を押してください。</Text>
            <View className="max-h-[44vh] rounded-xl overflow-hidden bg-white/3 border border-white/10">
              <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[44vh]">
                <TextInput
                  multiline value={previewText} onChangeText={setPreviewText}
                  style={{ minHeight: 180, padding: 12, fontSize: 16, lineHeight: 22, color: 'white' }}
                  placeholder="ここに抽出テキストが入ります" placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </ScrollView>
            </View>

            <View className="flex-row justify-end gap-2 mt-4">
              <Pressable onPress={() => { setPreviewOpen(false); setPreviewImages([]); }}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">
                <Text className="text-white">キャンセル</Text>
              </Pressable>
              <Pressable onPress={confirmPreview}
                className="px-4 py-2 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
                <Text className="text-black font-semibold">送信</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

import { StyleSheet } from 'react-native'; // 下で absoluteFillObject を使うため
