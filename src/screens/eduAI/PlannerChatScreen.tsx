// src/screens/eduAI/PlannerChatScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { nanoid } from 'nanoid/non-secure';

import PlannerMessages from '@/components/eduAI-related/plannerAI/PlannerMessages';
import ChatInput from '@/components/eduAI-related/ChatInput';
import PlanModeToggle, { PlanHorizon } from '@/components/eduAI-related/PlanModeToggle';

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
import { callPlanner } from '@/lib/eduAIClient';
import TagPickerSheet from '@/components/eduAI-related/TagPickerSheet';

export default function PlannerChatScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const theme = EDU_AI_THEME.planner;

  // 空IDで遷移してくる可能性があるため state 管理
  const [threadId, setThreadId] = useState<string>(getEduAICurrentThreadId() ?? '');

  const [messages, setMessages] = useState<EduAIMessage[]>(
    threadId ? getEduAIMessages(threadId) : []
  );
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const busyRef = useRef(false);

  // 計画作成モードとオプション
  const [planMode, setPlanMode] = useState<boolean>(false);
  const [planHorizon, setPlanHorizon] = useState<PlanHorizon>(null);
  const [planPriorities, setPlanPriorities] = useState<string[]>([]);

  // タグシート
  const [tagOpen, setTagOpen] = useState(false);
  const [tagTarget, setTagTarget] = useState<(EduAIMessage & { tags?: EduAITag[] }) | null>(null);

  useEffect(() => {
    if (threadId) setMessages(getEduAIMessages(threadId));
  }, [threadId]);

  const persist = (id: string, next: EduAIMessage[]) => {
    setMessages(next);
    if (id) setEduAIMessages(id, next);
  };

  // Router相当：スレッドを必ず確保（Firestore成功/ローカル代替）
  async function ensureThreadWithFallback() {
    try {
      if (threadId) return { id: threadId, fsOk: true as const };
      const { threadId: created } = await eduAIEnsureThread(); // サーバ生成
      setThreadId(created);
      setEduAICurrentThreadId(created);
      upsertEduAIThread({
        id: created,
        title: '新しいスレッド',
        agent: 'planner',
        lastMessagePreview: '',
        updatedAt: Date.now(),
      });
      setEduAIThreadAgent(created, 'planner');
      return { id: created, fsOk: true as const };
    } catch {
      const local = threadId || `local-${Date.now()}`;
      if (!threadId) {
        setThreadId(local);
        setEduAICurrentThreadId(local);
        upsertEduAIThread({
          id: local,
          title: 'ローカル下書き',
          agent: 'planner',
          lastMessagePreview: '',
          updatedAt: Date.now(),
        });
        setEduAIThreadAgent(local, 'planner');
      }
      return { id: local, fsOk: false as const };
    }
  }

  const onMessageLongPress = (m: EduAIMessage & { tags?: EduAITag[] }) => {
    setTagTarget(m);
    setTagOpen(true);
  };

  const commitTags = async (next: EduAITag[]) => {
    if (!tagTarget) return;
    const id = threadId || (await ensureThreadWithFallback()).id;
    updateEduAIMessageTags(id, tagTarget.id, next); // MMKV更新
    setMessages(getEduAIMessages(id));              // 反映
    try { await eduAIUpdateMessageTags(id, tagTarget.id, next); } catch {}
    setTagOpen(false);
    setTagTarget(null);
  };

  const send = async () => {
    const t = input.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;

    // ★必ず先にスレッドを用意
    const { id, fsOk } = await ensureThreadWithFallback();

    const u: EduAIMessage = { id: nanoid(), role: 'user', content: t, at: Date.now() };
    setInput('');
    const base = [...messages, u];

    appendEduAIMessage(id, u, 'planner');
    persist(id, base);
    if (fsOk) {
      await eduAIAddMessage(id, { role: 'user', content: t, agent: 'planner', tags: [] });
    }

    try {
      setIsTyping(true);

      const recent = getEduAIMessages(id)
        .slice(-7)
        .map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: String(m.content ?? ''),
        }))
        .filter((m) => m.content.trim().length > 0);

      const text = await callPlanner(
        [...recent, { role: 'user', content: t }],
        {
          planMode,
          horizon: planHorizon ?? undefined,
          priorities: planPriorities.length ? planPriorities : undefined,
        }
      );

      const a: EduAIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: text,
        agent: 'planner',
        at: Date.now(),
      };
      appendEduAIMessage(id, a, 'planner');
      persist(id, [...base, a]);
      if (fsOk) {
        await eduAIAddMessage(id, { role: 'assistant', content: text, agent: 'planner', tags: [] });
      }
    } catch (e: any) {
      const reason = e?.code || e?.message || 'unknown';
      const a: EduAIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `(応答を取得できませんでした)${__DEV__ ? `\n理由: ${reason}` : ''}`,
        agent: 'planner',
        at: Date.now(),
      };
      appendEduAIMessage(id, a, 'planner');
      persist(id, [...base, a]);
    } finally {
      setIsTyping(false);
      busyRef.current = false;
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white border-b border-neutral-200">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => nav.goBack()} className="p-2 -ml-2 mr-2">
            <ChevronLeft size={22} color="#0f172a" />
          </Pressable>
          <Text className="text-xl font-semibold flex-1">学習計画</Text>
        </View>
      </View>
      <View className={`h-1.5 ${theme.accent}`} />

      {/* Sub header */}
      <View className="px-4 py-2">
        <Text className="text-xs text-neutral-500">
          タスク分解・週間/日次の組み立て、習慣化の相談に最適です。
        </Text>
      </View>

      {/* Messages */}
      <PlannerMessages data={messages} typing={isTyping} onLongPress={onMessageLongPress} />

      {/* Plan mode (入力バー直上) */}
      <PlanModeToggle
        enabled={planMode}
        onChangeEnabled={setPlanMode}
        horizon={planHorizon}
        onChangeHorizon={setPlanHorizon}
        priorities={planPriorities}
        onChangePriorities={setPlanPriorities}
      />

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
        placeholder={
          planMode
            ? 'ゴール/期限/学びたい分野など（詳細設定も活用可）'
            : '学習計画AIへ質問/相談…'
        }
      />

      {/* タグシート */}
      <TagPickerSheet
        open={tagOpen}
        initial={(tagTarget?.tags as EduAITag[] | undefined) ?? []}
        onClose={() => { setTagOpen(false); setTagTarget(null); }}
        onSubmit={commitTags}
        title="タグを追加（学習計画）"
      />
    </KeyboardAvoidingView>
  );
}
