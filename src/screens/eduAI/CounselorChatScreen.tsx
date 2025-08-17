import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { nanoid } from 'nanoid/non-secure';

import ChatMessages from '@/components/eduAI-related/ChatMessages';
import ChatInput from '@/components/eduAI-related/ChatInput';
import WebSearchToggle from '@/components/eduAI-related/WebSearchToggle';

import { EDU_AI_THEME } from '@/theme/eduAITheme';
import type { EduAIMessage } from '@/storage/eduAIStorage';
import {
  getEduAICurrentThreadId,
  getEduAIMessages,
  setEduAIMessages,
  appendEduAIMessage,
} from '@/storage/eduAIStorage';
import { eduAIAddMessage } from '@/lib/eduAIFirestore';
import { callCounselor } from '@/lib/eduAIClient';

export default function CounselorChatScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const theme = EDU_AI_THEME.counselor;

  const threadId = getEduAICurrentThreadId()!;
  const [messages, setMessages] = useState<EduAIMessage[]>(getEduAIMessages(threadId));
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // UIトグル：Web検索 / 品質。※渡さないと関数側は allowSearch=false / quality='standard'
  const [search, setSearch] = useState<boolean>(true);
  const [quality, setQuality] = useState<'standard' | 'premium'>('standard');

  const busyRef = useRef(false);

  // スレッド切替時にローカルから再読込
  useEffect(() => {
    setMessages(getEduAIMessages(threadId));
  }, [threadId]);
  
  const persist = (next: EduAIMessage[]) => {
    setMessages(next);
    setEduAIMessages(threadId, next);
  };

  const send = async () => {
    const t = input.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;

    // 送信メッセージをローカル＆DBに反映
    const u: EduAIMessage = { id: nanoid(), role: 'user', content: t, at: Date.now() };
    setInput('');
    const base = [...messages, u];
    appendEduAIMessage(threadId, u, 'counselor');
    persist(base);
    await eduAIAddMessage(threadId, { role: 'user', content: t, agent: 'counselor', tags: [] });

    try {
      setIsTyping(true);
      const recent = getEduAIMessages(threadId)
      .slice(-7)
      .map(m => ({ role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user'|'assistant',
               content: (m.content ?? '').toString() }))
      .filter(m => m.content.trim().length > 0);

      // 関数側にも保険はあるが、フロントでも直近8件に絞ってコスト節約
      const text = await callCounselor(
        [...recent, { role: 'user', content: t }],
        { allowSearch: search, quality }
      );

      const a: EduAIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: text,
        agent: 'counselor',
        at: Date.now(),
      };
      appendEduAIMessage(threadId, a, 'counselor');
      persist([...base, a]);
      await eduAIAddMessage(threadId, { role: 'assistant', content: text, agent: 'counselor', tags: [] });
    } catch (e: any) {
      const reason = e?.code || e?.message || 'unknown';
      const a: EduAIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `(応答を取得できませんでした)${__DEV__ ? `\n理由: ${reason}` : ''}`,
        agent: 'counselor',
        at: Date.now(),
      };
      appendEduAIMessage(threadId, a, 'counselor');
      persist([...base, a]);
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

          {/* Web検索ON/OFF & 品質トグル（近未来バッジ） */}
          <WebSearchToggle
            enabled={search}
            onChange={setSearch}
            quality={quality}
            onToggleQuality={setQuality}
          />
        </View>
      </View>
      <View className={`h-1.5 ${theme.accent}`} />

      {/* Sub header */}
      <View className="px-4 py-2">
        <Text className="text-xs text-neutral-500">志望校・入試・制度の調査に最適です。</Text>
      </View>

      {/* Chat */}
      <ChatMessages data={messages} typing={isTyping} typingAgent="counselor" />
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
        placeholder="進路カウンセラーAIへメッセージ…"
      />
    </KeyboardAvoidingView>
  );
}
