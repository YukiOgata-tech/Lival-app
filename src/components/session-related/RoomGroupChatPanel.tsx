// src/components/session-related/RoomGroupChatPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, DocumentData } from 'firebase/firestore';
import { useAuth } from '@/providers/AuthProvider';
import RoomChatMessageList from '@/components/session-related/RoomChatMessageList'; // ← 誤 @// 修正
import RoomChatInputBar from '@/components/session-related/RoomChatInputBar';
import type { ChatMessage } from './chat/MessageTypes';

// テスト用
import { TouchableOpacity, Text,  } from 'react-native';
import { postGroupLog } from '@/lib/GroupSession-related/groupLog';

export default function RoomGroupChatPanel({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const canSend = useMemo(() => !!user?.uid && input.trim().length > 0, [user?.uid, input]);

  const messagesCol = collection(firestore, 'rooms', roomId, 'groupChats');

  // 購読：typeは 'user' | 'log' のみ許可（それ以外は 'user' に落とす）
  useEffect(() => {
    if (!roomId) return;
    const q = query(messagesCol, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        const t = (data.type as ChatMessage['type']) ?? 'user';
        return {
          id: d.id,
          userId: (data.userId as string) ?? null,
          text: (data.text as string) ?? '',
          createdAt: data.createdAt ?? null,
          type: t === 'log' ? 'log' : 'user',
        };
      });
      setMessages(rows);
    });
    return unsub;
  }, [roomId]);

  const handleSend = async () => {
    if (!canSend) return;
    await addDoc(messagesCol, {
      userId: user?.uid ?? null,
      text: input.trim(),
      createdAt: serverTimestamp(),
      type: 'user',
    });
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-neutral-900"
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View className="flex-1">
        <RoomChatMessageList messages={messages} myUserId={user?.uid ?? undefined} />
      </View>
      {__DEV__ && (
  <View className="px-3 py-2">
    <TouchableOpacity
      className="self-start rounded-lg px-3 py-2 bg-neutral-200"
      onPress={() => postGroupLog(roomId, '（DEV）手動テストLOG')}
    >
      <Text>手動でLOGを流す</Text>
    </TouchableOpacity>
  </View>
)}
      <RoomChatInputBar
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        placeholder={user ? 'みんなにメッセージ…' : 'ログインが必要です'}
        disabled={!canSend}
      />
    </KeyboardAvoidingView>
  );
}
