// src/screens/eduAI/CounselorChatScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { nanoid } from 'nanoid/non-secure';

import CounselorMessages from '@/components/eduAI-related/counselorAI/CounselorMessages';
import ChatInput from '@/components/eduAI-related/ChatInput';
import WebSearchToggle from '@/components/eduAI-related/WebSearchToggle';
import TagPickerSheet from '@/components/eduAI-related/TagPickerSheet';

import { EDU_AI_THEME } from '@/theme/eduAITheme';
import type { EduAIMessage, EduAITag } from '@/storage/eduAIStorage';
import {
  getEduAICurrentThreadId,
  getEduAIMessages,
  setEduAIMessages,
  appendEduAIMessage,
  upsertEduAIThread,
  setEduAIThreadAgent,
  setEduAICurrentThreadId,
  updateEduAIMessageTags,
} from '@/storage/eduAIStorage';
import { eduAIAddMessage, eduAIEnsureThread, eduAIUpdateMessageTags } from '@/lib/eduAIFirestore';
import { callCounselor } from '@/lib/eduAIClient';

export default function CounselorChatScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const theme = EDU_AI_THEME.counselor;

  const [threadId, setThreadId] = useState<string>(getEduAICurrentThreadId() ?? '');
  const [messages, setMessages] = useState<EduAIMessage[]>(threadId ? getEduAIMessages(threadId) : []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // UIトグル
  // 既定は Web 検索 OFF（必要時にトグルでON）
  const [search, setSearch] = useState<boolean>(false);
  const [quality, setQuality] = useState<'standard' | 'premium'>('standard');

  // タグシート
  const [tagOpen, setTagOpen] = useState(false);
  const [tagTarget, setTagTarget] = useState<(EduAIMessage & { tags?: EduAITag[] }) | null>(null);

  // ★ このセッションで生成された「最後の1件」だけタイプライター
  const [typewriterId, setTypewriterId] = useState<string | null>(null);

  const busyRef = useRef(false);

  useEffect(() => {
    if (threadId) setMessages(getEduAIMessages(threadId));
  }, [threadId]);

  const persist = (id: string, next: EduAIMessage[]) => {
    setMessages(next);
    if (id) setEduAIMessages(id, next);
  };

  // スレッドを確保（オンライン/オフライン両対応）
  async function ensureThreadWithFallback() {
    try {
      if (threadId) return { id: threadId, fsOk: true as const };
      const { threadId: created } = await eduAIEnsureThread();
      setThreadId(created);
      setEduAICurrentThreadId(created);
      upsertEduAIThread({
        id: created,
        title: '新しいスレッド',
        agent: 'counselor',
        lastMessagePreview: '',
        updatedAt: Date.now(),
      });
      setEduAIThreadAgent(created, 'counselor');
      return { id: created, fsOk: true as const };
    } catch {
      const local = threadId || `local-${Date.now()}`;
      if (!threadId) {
        setThreadId(local);
        setEduAICurrentThreadId(local);
        upsertEduAIThread({
          id: local,
          title: 'ローカル下書き',
          agent: 'counselor',
          lastMessagePreview: '',
          updatedAt: Date.now(),
        });
        setEduAIThreadAgent(local, 'counselor');
      }
      return { id: local, fsOk: false as const };
    }
  }

  // タグ機能
  const onMessageLongPress = (m: EduAIMessage & { tags?: EduAITag[] }) => {
    setTagTarget(m);
    setTagOpen(true);
  };
  const commitTags = async (next: EduAITag[]) => {
    if (!tagTarget) return;
    const ensured = threadId ? { id: threadId, fsOk: true as const } : await ensureThreadWithFallback();
    const id = ensured.id;
    updateEduAIMessageTags(id, tagTarget.id, next); // MMKV
    setMessages(getEduAIMessages(id));
    try { await eduAIUpdateMessageTags(id, tagTarget.id, next); } catch {}
    setTagOpen(false);
    setTagTarget(null);
  };

  const send = async () => {
    const t = input.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;

    const { id, fsOk } = await ensureThreadWithFallback();

    const u: EduAIMessage = { id: nanoid(), role: 'user', content: t, at: Date.now() };
    setInput('');
    const base = [...messages, u];

    appendEduAIMessage(id, u, 'counselor');
    persist(id, base);
    if (fsOk) {
      await eduAIAddMessage(id, { role: 'user', content: t, agent: 'counselor', tags: [] });
    }

    try {
      // ★ 前回のタイプライター対象をクリアしてから生成開始
      setTypewriterId(null);
      setIsTyping(true);

      const recent = getEduAIMessages(id)
        .slice(-7)
        .map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: String(m.content ?? ''),
        }))
        .filter((m) => m.content.trim().length > 0);

      const text = await callCounselor([...recent, { role: 'user', content: t }], {
        allowSearch: search,
        quality,
      });

      const a: EduAIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: text,
        agent: 'counselor',
        at: Date.now(),
      };
      appendEduAIMessage(id, a, 'counselor');
      persist(id, [...base, a]);

      // ★ ここでだけタイプライター対象IDをセット
      setTypewriterId(a.id);

      if (fsOk) {
        await eduAIAddMessage(id, { role: 'assistant', content: text, agent: 'counselor', tags: [] });
      }
    } catch (e: any) {
      const reason = e?.code || e?.message || 'unknown';
      const a: EduAIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `(応答を取得できませんでした)${__DEV__ ? `\n理由: ${reason}` : ''}`,
        agent: 'counselor',
        at: Date.now(),
      };
      appendEduAIMessage(id, a, 'counselor');
      persist(id, [...base, a]);
      // 失敗時はタイプライター不要なのでセットしない
    } finally {
      setIsTyping(false);
      busyRef.current = false;
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white border-b border-neutral-200">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => nav.goBack()} className="p-2 -ml-2 mr-2">
            <ChevronLeft size={22} color="#0f172a" />
          </Pressable>
          <Text className="text-xl font-semibold flex-1">進路カウンセラー</Text>
          <WebSearchToggle
            enabled={search}
            onChange={setSearch}
            quality={quality}
            onToggleQuality={setQuality}
          />
        </View>
      </View>
      <View className={`h-1.5 ${theme.accent}`} />

      {/* Note */}
      <View className="px-4 py-2">
        <Text className="text-xs text-neutral-500">公的情報や根拠URLを重視して回答します。</Text>
      </View>

      {/* Messages */}
      <CounselorMessages
        data={messages}
        typing={isTyping}
        onLongPress={onMessageLongPress}
        typewriterMessageId={typewriterId}
        onTypewriterDone={() => setTypewriterId(null)} // 完了後にクリア（履歴再入場で発火しない）
      />

      {/* Input */}
      <ChatInput value={input} onChange={setInput} onSend={send} placeholder="進路カウンセラーAIへメッセージ…" />

      {/* タグシート */}
      <TagPickerSheet
        open={tagOpen}
        initial={(tagTarget?.tags as EduAITag[] | undefined) ?? []}
        onClose={() => { setTagOpen(false); setTagTarget(null); }}
        onSubmit={commitTags}
        title="タグを追加（進路カウンセラー）"
      />
    </KeyboardAvoidingView>
  );
}
