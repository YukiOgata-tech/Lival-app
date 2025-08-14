// src/components/session-related/chat/RoomGroupChatPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { firestore } from '@/lib/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, DocumentData } from 'firebase/firestore';
import { useAuth } from '@/providers/AuthProvider';
import RoomChatMessageList from '@/components/session-related/chat/RoomChatMessageList';
import RoomChatInputBar from '@/components/session-related/chat/RoomChatInputBar';
import type { ChatMessage } from './MessageTypes';


export default function RoomGroupChatPanel({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const canSend = useMemo(() => !!user?.uid && input.trim().length > 0, [user?.uid, input]);

  // const messagesCol = collection(firestore, 'rooms', roomId, 'groupChats');
  const messagesCol = useMemo(
    () => collection(firestore, 'rooms', roomId, 'groupChats'),
    [roomId]
  );


  // 購読：typeは 'user' | 'log' のみ許可（それ以外は 'user' に落とす）
  useEffect(() => {
    //if (!messagesCol) return;
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
    },
    (err) => console.warn('[GroupChat] onSnapshot error:', err?.code, err?.message)
    );
    return unsub;
  }, [messagesCol]);

  const handleSend = async () => {
    const text = input.trim();
    if (!user?.uid || !text) return;
    setInput(''); // 送信直後に即クリア（AIパネルと同じ）
    await addDoc(messagesCol, {
      userId: user.uid,
      text,
      createdAt: serverTimestamp(),
      type: 'user',
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-neutral-900"
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View className="flex-1">
        <RoomChatMessageList messages={messages} myUserId={user?.uid ?? undefined} />
      </View>
      <RoomChatInputBar
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        placeholder={user ? 'みんなにメッセージ…' : 'ログインが必要です'}
        disabled={!user?.uid || !input.trim()}
      />
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}