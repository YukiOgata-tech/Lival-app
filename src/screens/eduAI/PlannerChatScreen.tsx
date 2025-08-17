// src/screens/eduAI/PlannerChatScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { nanoid } from 'nanoid/non-secure';

import ChatMessages from '@/components/eduAI-related/ChatMessages';
import ChatInput from '@/components/eduAI-related/ChatInput';
import PlanModeToggle, { PlanHorizon } from '@/components/eduAI-related/PlanModeToggle';

import { EDU_AI_THEME } from '@/theme/eduAITheme';
import type { EduAIMessage } from '@/storage/eduAIStorage';
import {
  getEduAICurrentThreadId,
  getEduAIMessages, setEduAIMessages, appendEduAIMessage
} from '@/storage/eduAIStorage';
import { eduAIAddMessage } from '@/lib/eduAIFirestore';
import { callPlanner } from '@/lib/eduAIClient';

export default function PlannerChatScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const theme = EDU_AI_THEME.planner;

  const threadId = getEduAICurrentThreadId()!;
  const [messages, setMessages] = useState<EduAIMessage[]>(getEduAIMessages(threadId));
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const busyRef = useRef(false);

  // 計画作成モードとオプション
  const [planMode, setPlanMode] = useState<boolean>(false);
  const [planHorizon, setPlanHorizon] = useState<PlanHorizon>(null);
  const [planPriorities, setPlanPriorities] = useState<string[]>([]);

  useEffect(()=>{ setMessages(getEduAIMessages(threadId)); },[threadId]);

//   const last7 = useMemo(
//     () => messages.slice(-7).map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
//     [messages]
//   );

  const persist = (next: EduAIMessage[]) => { setMessages(next); setEduAIMessages(threadId, next); };

  const send = async () => {
    const t = input.trim(); if (!t || busyRef.current) return; busyRef.current = true;

    const u: EduAIMessage = { id:nanoid(), role:'user', content:t, at:Date.now() };
    setInput('');
    const base = [...messages, u];
    appendEduAIMessage(threadId, u, 'planner'); persist(base);
    await eduAIAddMessage(threadId, { role:'user', content:t, agent:'planner', tags:[] });

    try {
      setIsTyping(true);

      const recent = getEduAIMessages(threadId)
  .slice(-7)
  .map(m => ({ role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user'|'assistant',
               content: (m.content ?? '').toString() }))
  .filter(m => m.content.trim().length > 0);
      const text = await callPlanner(
        [...recent, { role:'user', content:t }],
        { planMode, horizon: planHorizon ?? undefined, priorities: planPriorities.length ? planPriorities : undefined }
      );

      const a: EduAIMessage = { id:nanoid(), role:'assistant', content:text, agent:'planner', at:Date.now() };
      appendEduAIMessage(threadId, a, 'planner'); persist([...base, a]);
      await eduAIAddMessage(threadId, { role:'assistant', content:text, agent:'planner', tags:[] });
    } catch (e:any) {
      const reason = e?.code || e?.message || 'unknown';
      const a: EduAIMessage = {
        id:nanoid(), role:'assistant',
        content:`(応答を取得できませんでした)${__DEV__ ? `\n理由: ${reason}` : ''}`,
        agent:'planner', at:Date.now()
      };
      appendEduAIMessage(threadId, a, 'planner'); persist([...base, a]);
    } finally {
      setIsTyping(false);
      busyRef.current = false;
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS==='ios'?'padding':undefined}>
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
        <Text className="text-xs text-neutral-500">タスク分解・週間/日次の組み立て、習慣化の相談に最適です。</Text>
      </View>

      {/* Messages */}
      <ChatMessages data={messages} typing={isTyping} typingAgent="planner" />

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
    </KeyboardAvoidingView>
  );
}
