// src/screens/ChatRouterScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, MoveRight } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

import ChatMessages from '@/components/eduAI-related/ChatMessages';
import ChatInput from '@/components/eduAI-related/ChatInput';
import ChatHeader, { Agent as AgentKey } from '@/components/eduAI-related/ChatHeader';
import MascotOverlay from '@/components/eduAI-related/MascotOverlay';

import type { EduAIMessage } from '@/storage/eduAIStorage';
import {
  getEduAIMessages,
  setEduAIMessages,
  appendEduAIMessage,
  setEduAIMessageFsId,
  upsertEduAIThread,
  updateEduAIMessageContent,
  setEduAIThreadAgent,
  getEduAICurrentThreadId,
  setEduAICurrentThreadId,
  getEduAIRouterPreset,
  clearEduAIRouterPreset,
} from '@/storage/eduAIStorage';

import { eduAIClassify, eduAIChat } from '@/lib/eduAIClient';
import { eduAIAddMessage, eduAIEnsureThread, eduAIUpsertThread } from '@/lib/eduAIFirestore';
import { EDU_AI_THEME } from '@/theme/eduAITheme';
import { nanoid } from 'nanoid/non-secure';

// === 画面フルで使うLottie（プロジェクト側で @assets/lotties/sandy-loading.json に配置してください）===
const ROUTER_LOADING = require('@assets/lotties/sandy-loading.json');

// ---- フォールバック文言 ----
const OFFLINE_FALLBACK: Record<'tutor'|'counselor'|'planner', string> = {
  tutor:
    '（現在オフラインのためAI回答を生成できませんでした。接続後にもう一度お試しください。画像プレビューはオフラインでも可能です）',
  counselor:
    '（現在オフラインです。最新の募集要項や公式情報の参照にはネット接続が必要です。接続後に再度お試しください）',
  planner:
    '（現在オフラインのため学習プラン生成を行えません。接続後に「もう一度」ボタンから作成できます）',
};
const UNKNOWN_FALLBACK =
  '（回答の生成に失敗しました。接続状況を確認してもう一度お試しください）';

// 画面全面ローディングオーバーレイ
function FullscreenLoading({ visible, label }: { visible: boolean; label?: string }) {
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 items-center justify-center"
      style={{ backgroundColor: 'rgba(2,6,23,0.82)' }} // slate-950 / 82%
    >
      {/* テクノロジー感の“光”レイヤー */}
      <View className="absolute -top-24 -left-24 w-[280] h-[280] rounded-full bg-cyan-500/20" />
      <View className="absolute -bottom-28 -right-20 w-[320] h-[320] rounded-full bg-fuchsia-500/15" />

      <LottieView
        source={ROUTER_LOADING}
        autoPlay
        loop
        style={{ width: 280, height: 280 }}
      />
      <Text className="mt-4 text-white/90">{label ?? 'AI が考えています…'}</Text>
    </View>
  );
}

export default function ChatRouterScreen() {
  const nav = useNavigation<any>();

  // 既存スレッド/プリセットの復元
  const initialThreadId = getEduAICurrentThreadId() ?? '';
  const initialPreset = getEduAIRouterPreset();

  const [threadId, setThreadId] = useState<string>(initialThreadId);
  const [manualAgent, setManualAgent] = useState<AgentKey>(initialPreset);
  const [assignedAgent, setAssignedAgent] = useState<'tutor'|'counselor'|'planner'|null>(
    initialPreset !== 'auto' ? (initialPreset as any) : null
  );

  const [messages, setMessages] = useState<EduAIMessage[]>(
    threadId ? getEduAIMessages(threadId) : []
  );
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState<'tutor'|'counselor'|'planner'|null>(null);

  const busyRef = useRef(false);

  useEffect(() => {
    if (threadId) setMessages(getEduAIMessages(threadId));
  }, [threadId]);

  // 直近だけをモデルに渡す
  const last8ForModel = useMemo(
    () => messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
    [messages]
  );

  const persist = (next: EduAIMessage[]) => {
    setMessages(next);
    if (threadId) setEduAIMessages(threadId, next);
  };

  /** スレッド確保（FS 到達失敗でもローカル継続） */
  async function ensureThreadWithFallback() {
    try {
      if (threadId) {
        await eduAIUpsertThread(threadId, undefined);
        return { id: threadId, fsOk: true as const };
      }
      const { threadId: created } = await eduAIEnsureThread();
      setThreadId(created);
      setEduAICurrentThreadId(created);
      upsertEduAIThread({
        id: created,
        title: '新しいスレッド',
        agent: null,
        lastMessagePreview: '',
        updatedAt: Date.now(),
      });
      return { id: created, fsOk: true as const };
    } catch {
      // FS 書き込みに失敗してもローカルで続行
      const local = threadId || `local-${Date.now()}`;
      if (!threadId) {
        setThreadId(local);
        setEduAICurrentThreadId(local);
        upsertEduAIThread({
          id: local,
          title: 'ローカル下書き',
          agent: null,
          lastMessagePreview: '',
          updatedAt: Date.now(),
        });
      }
      return { id: local, fsOk: false as const };
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
    const to = setTimeout(() => {
      nav.replace(
        readyToNavigate === 'tutor'
          ? 'EduAITutor'
          : readyToNavigate === 'counselor'
          ? 'EduAICounselor'
          : 'EduAIPlanner'
      );
    }, 850);
    return () => clearTimeout(to);
  }, [readyToNavigate, threadId]);

  // 送信（分類 → ご案内 → 初回回答（必ず Functions を叩く）→ 遷移）
  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;

    // 分類用に最初の一文だけ抽出（回答は全文で）
    const firstSentence = (trimmed.split(/[。．.!?！？\n]/)[0] || trimmed).slice(0, 200);

    // 楽観更新（ユーザー入力＋ステータス）
    const userMsg: EduAIMessage = {
      id: nanoid(),
      role: 'user',
      content: trimmed,
      at: Date.now(),
    };
    const statusId = nanoid();
    const statusMsg: EduAIMessage = {
      id: statusId,
      role: 'assistant',
      content: '司令塔: 判定中…',
      at: Date.now(),
    };

    setInput('');
    persist([...messages, userMsg, statusMsg]);

    try {
      // スレッド確定（FS は失敗しても続行）
      const { id, fsOk } = await ensureThreadWithFallback();

      // ローカル保存 / Firestore 反映
      appendEduAIMessage(id, userMsg, undefined);
      setEduAIMessages(id, getEduAIMessages(id));
      if (fsOk) {
        try {
          const fsUserId = await eduAIAddMessage(id, {
            role: 'user',
            content: userMsg.content,
            agent: undefined,
          });
          setEduAIMessageFsId(id, userMsg.id, fsUserId);
        } catch {}
      }

      // 手動 > 自動 判定
      let agentToUse: 'tutor'|'counselor'|'planner';
      if (manualAgent !== 'auto') {
        agentToUse = manualAgent as any;
      } else {
        try {
          agentToUse = await eduAIClassify(firstSentence);
        } catch {
          agentToUse = 'tutor';
        }
      }
      const theme = EDU_AI_THEME[agentToUse];

      // ご案内文へ更新
      updateEduAIMessageContent(id, statusId, `司令塔: 今回は ${theme.nameJa} が担当します`);
      setMessages(getEduAIMessages(id));
      setAssignedAgent(agentToUse);

      // ---- 初回回答：FS 可否に関係なく、必ず Functions を叩く ----
      setIsGenerating(true);
      let text = '';
      try {
        text = await eduAIChat(
          agentToUse,
          // 直近履歴 + 今回全文
          [...last8ForModel, { role: 'user', content: trimmed }],
          // Counselor 初回は検索OFFで固定（仕様）
          agentToUse === 'counselor' ? { allowSearch: false } : undefined
        );
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? '');
        const offlineLike = /OFFLINE|unavailable|network-request-failed|Failed to fetch|Network Error/i.test(
          msg
        );
        text = offlineLike ? OFFLINE_FALLBACK[agentToUse] : UNKNOWN_FALLBACK;
      } finally {
        setIsGenerating(false);
      }

      // 返答を追加
      const aiMsg: EduAIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: text,
        agent: agentToUse,
        at: Date.now(),
      };
      appendEduAIMessage(id, aiMsg, agentToUse);
      setMessages(getEduAIMessages(id));

      // Firestore 同期（到達できる時だけ）
      if (fsOk) {
        try {
          const fsAiId = await eduAIAddMessage(id, {
            role: 'assistant',
            content: text,
            agent: agentToUse,
          });
          setEduAIMessageFsId(id, aiMsg.id, fsAiId);
        } catch {}
      }

      // 遷移
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
    setReadyToNavigate(null);
    setManualAgent('auto'); // 司令塔(自動)に戻す
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* “万能AI”らしいヘッダー：タイトルを強め、右側にジャンプボタン */}
      <View className="pt-12 px-4 pb-3 border-b border-neutral-200 flex-row items-center">
        <Pressable onPress={() => nav.goBack()} className="mr-3 p-2 -ml-2">
          <ChevronLeft size={22} color="#0f172a" />
        </Pressable>
        <Text className="text-[22px] font-semibold flex-1 tracking-wide">司令塔（Router）</Text>
        {assignedAgent && threadId && (
          <Pressable
            onPress={() =>
              nav.replace(
                assignedAgent === 'tutor'
                  ? 'EduAITutor'
                  : assignedAgent === 'counselor'
                  ? 'EduAICounselor'
                  : 'EduAIPlanner'
              )
            }
            className="px-3 py-1.5 rounded-xl bg-slate-900 flex-row items-center"
          >
            <Text className="text-white mr-1">移動</Text>
            <MoveRight size={16} color="white" />
          </Pressable>
        )}
      </View>

      {/* テーマアクセント */}
      <View className={`h-1.5 ${accentClass}`} />

      {/* 手動/自動 切替（確定後はロック） */}
      <ChatHeader
        manualAgent={manualAgent}
        assignedAgent={assignedAgent}
        locked={headerLocked}
        onSelect={setManualAgent}
        onNewThread={startNewThread}
      />

      {/* メッセージ一覧（簡潔＋アニメーションはコンポーネント側で付与） */}
      {/* @ts-ignore 互換維持（typingAgent などの拡張） */}
      <ChatMessages data={messages} typing={isGenerating} typingAgent={assignedAgent ?? null} />

      {/* 入力欄：最初の一文入力が主用途 */}
      <ChatInput value={input} onChange={setInput} onSend={send} placeholder={placeholder} />

      {/* 画面全面ローディング（初回応答の生成中だけ） */}
      <FullscreenLoading visible={isGenerating} label="司令塔が最適な担当を手配中…" />

      {/* 遷移前の演出（既存） */}
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
