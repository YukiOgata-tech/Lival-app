// src/screens/ChatRouterScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ChatMessages from '@/components/eduAI-related/ChatMessages';
import type { EduAIMessage } from '@/storage/eduAIStorage';
import ChatInput from '@/components/eduAI-related/ChatInput';
import ChatHeader, { Agent as AgentKey } from '@/components/eduAI-related/ChatHeader';
import MascotOverlay from '@/components/eduAI-related/MascotOverlay';
import { EDU_AI_THEME } from '@/theme/eduAITheme';
import { nanoid } from 'nanoid/non-secure';

import {
  getEduAIMessages, setEduAIMessages, appendEduAIMessage,
  setEduAIMessageFsId, upsertEduAIThread, updateEduAIMessageContent, setEduAIThreadAgent,
  getEduAICurrentThreadId, setEduAICurrentThreadId,
  getEduAIRouterPreset, clearEduAIRouterPreset
} from '@/storage/eduAIStorage';

import { eduAIClassify, eduAIChat } from '@/lib/eduAIClient';
import { eduAIAddMessage, eduAIEnsureThread, eduAIUpsertThread } from '@/lib/eduAIFirestore';
import { ChevronLeft, MoveRight } from 'lucide-react-native';


export default function ChatRouterScreen() {
  const nav = useNavigation<any>();

  // 初期状態
  const initialThreadId = getEduAICurrentThreadId() ?? '';
  const initialPreset   = getEduAIRouterPreset();

  const [threadId, setThreadId] = useState<string>(initialThreadId);
  const [manualAgent, setManualAgent] = useState<AgentKey>(initialPreset);
  const [assignedAgent, setAssignedAgent] = useState<'tutor'|'counselor'|'planner'|null>(
    initialPreset !== 'auto' ? (initialPreset as any) : null
  );

  const [messages, setMessages] = useState<EduAIMessage[]>(threadId ? getEduAIMessages(threadId) : []);
  const [input, setInput] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState<'tutor'|'counselor'|'planner'|null>(null);

  const busyRef = useRef(false);


  useEffect(() => { if (threadId) setMessages(getEduAIMessages(threadId)); }, [threadId]);

  const last8ForModel = useMemo(
    () => messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
    [messages]
  );

  const persist = (next: EduAIMessage[]) => {
    setMessages(next);
    if (threadId) setEduAIMessages(threadId, next);
  };

  // Thread確保（オンライン失敗でもローカルで続行）
  async function ensureThreadWithFallback() {
    try {
      if (threadId) { await eduAIUpsertThread(threadId, undefined); return { id: threadId, online: true as const }; }
      const { threadId: created } = await eduAIEnsureThread();
      setThreadId(created);
      setEduAICurrentThreadId(created);
      upsertEduAIThread({
        id: created, title: '新しいスレッド', agent: null, lastMessagePreview: '', updatedAt: Date.now()
      });
      return { id: created, online: true as const };
    } catch {
      const local = threadId || `local-${Date.now()}`;
      if (!threadId) {
        setThreadId(local);
        setEduAICurrentThreadId(local);
        upsertEduAIThread({
          id: local, title: 'ローカル下書き', agent: null, lastMessagePreview: '', updatedAt: Date.now()
        });
      }
      return { id: local, online: false as const };
    }
  }

  // Headerロック・プレビュー外観
  const headerLocked = !!assignedAgent || messages.length > 0;
  const previewAgent: ('tutor'|'counselor'|'planner') | null =
    assignedAgent ?? (manualAgent !== 'auto' ? (manualAgent as any) : null);
  const accentClass = previewAgent ? EDU_AI_THEME[previewAgent].accent : 'bg-neutral-200';
  const placeholder = previewAgent
    ? `${EDU_AI_THEME[previewAgent].nameJa} へ送るメッセージ…`
    : '最初の一文で担当を自動判定します';

  // 初回回答後に自動遷移
  useEffect(() => {
    if (!readyToNavigate || !threadId) return;
    clearEduAIRouterPreset();
    setEduAIThreadAgent(threadId, readyToNavigate);
    setShowMascot(true);
    const to = setTimeout(() => {
      nav.replace(
        readyToNavigate === 'tutor' ? 'EduAITutor' :
        readyToNavigate === 'counselor' ? 'EduAICounselor' : 'EduAIPlanner'
      );
    }, 900);
    return () => clearTimeout(to);
  }, [readyToNavigate, threadId]);

  // 送信（分類→案内→初回回答→遷移）
  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;

    // 一文目を抽出して分類・初回応答に使用
    const firstSentence = (trimmed.split(/[。．.!?！？\n]/)[0] || trimmed).slice(0, 200);

    // 楽観更新（ユーザー入力＋ステータス）
    const userMsg: EduAIMessage = { id: nanoid(), role:'user', content: trimmed, at: Date.now() };
    const statusId = nanoid();
    const statusMsg: EduAIMessage = { id: statusId, role:'assistant', content:'司令塔: 判定中…', at: Date.now() };

    setInput('');
    setMessages(prev => [...prev, userMsg, statusMsg]);

    try {
      // スレッド確定
      const { id, online } = await ensureThreadWithFallback();

      // ローカル保存 / FS 反映
      appendEduAIMessage(id, userMsg, undefined);
      setEduAIMessages(id, getEduAIMessages(id));
      if (online) {
        try {
          const fsUserId = await eduAIAddMessage(id, { role:'user', content:userMsg.content, agent: undefined });
          setEduAIMessageFsId(id, userMsg.id, fsUserId);
        } catch {}
      }

      // 手動 > 自動 判定
      let agentToUse: 'tutor'|'counselor'|'planner';
      if (manualAgent !== 'auto') agentToUse = manualAgent as any;
      else {
        try { agentToUse = await eduAIClassify(firstSentence); }
        catch { agentToUse = 'tutor'; }
      }
      const theme = EDU_AI_THEME[agentToUse];

      // ご案内文へ更新
      updateEduAIMessageContent(id, statusId, `司令塔: 今回は ${theme.nameJa} が担当します`);
      setMessages(getEduAIMessages(id));
      setAssignedAgent(agentToUse);

      // 初回回答（Counselor 初回は検索OFFを明示）
      setIsGenerating(true);
      let text = '(応答を取得できませんでした)';
      try {
        if (online) {
          text = await eduAIChat(
            agentToUse,
            [...last8ForModel, { role:'user', content:firstSentence }],
            agentToUse === 'counselor' ? { allowSearch: false } : undefined
          );
        }
      } catch {} finally { setIsGenerating(false); }

      const aiMsg: EduAIMessage = {
        id: nanoid(), role:'assistant', content: text, agent: agentToUse, at: Date.now()
      };
      appendEduAIMessage(id, aiMsg, agentToUse);
      setMessages(getEduAIMessages(id));
      if (online) {
        try {
          const fsAiId = await eduAIAddMessage(id, { role:'assistant', content: text, agent: agentToUse });
          setEduAIMessageFsId(id, aiMsg.id, fsAiId);
        } catch {}
      }

      setReadyToNavigate(agentToUse);

    } finally {
      busyRef.current = false;
    }
  };

  // 新しいスレッド
  const startNewThread = () => {
    setEduAICurrentThreadId('');
    setThreadId('');
    setMessages([]);
    setAssignedAgent(null);
    setShowMascot(false);
    setReadyToNavigate(null);
    setManualAgent('auto'); // 司令塔(自動)に戻す
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS==='ios' ? 'padding' : undefined}>
      {/* Header */}
      <View className="pt-12 px-4 pb-3 border-b border-neutral-200 flex-row items-center">
        <Pressable onPress={() => nav.goBack()} className="mr-3 p-2 -ml-2">
          <ChevronLeft size={22} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-semibold flex-1">司令塔</Text>
        {assignedAgent && threadId && (
          <Pressable
            onPress={() => nav.replace(
              assignedAgent === 'tutor' ? 'EduAITutor'
              : assignedAgent === 'counselor' ? 'EduAICounselor'
              : 'EduAIPlanner'
            )}
            className="px-3 py-1.5 rounded-lg bg-blue-600 flex-row items-center"
          >
            <Text className="text-white mr-1">移動する</Text><MoveRight size={16} color="white" />
          </Pressable>
        )}
      </View>

      {/* accent */}
      <View className={`h-1.5 ${accentClass}`} />

      {/* 手動/自動 切替（確定後はロック） */}
      <ChatHeader
        manualAgent={manualAgent}
        assignedAgent={assignedAgent}
        locked={headerLocked}
        onSelect={setManualAgent}
        onNewThread={startNewThread}
      />

      {/* メッセージ一覧（typing演出はそのまま） */}
      {/* @ts-ignore: ChatMessages の props 拡張がある環境でもそのまま動かすため */}
      <ChatMessages data={messages} typing={isGenerating} typingAgent={assignedAgent ?? null} />

      {/* 入力欄 */}
      <ChatInput value={input} onChange={setInput} onSend={send} placeholder={placeholder} />

      {/* マスコット演出 */}
      {readyToNavigate && (
        <MascotOverlay
          visible={true}
          emoji={EDU_AI_THEME[readyToNavigate].emoji}
          label={`${EDU_AI_THEME[readyToNavigate].nameJa} へ移動中…`}
        />
      )}
    </KeyboardAvoidingView>
  );
}
