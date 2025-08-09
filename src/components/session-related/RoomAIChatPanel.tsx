// src/components/session-related/RoomAIChatPanel.tsx
import React, { useEffect, useState, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { AIChatGemini } from '@/lib/GroupSession-related/AIChatGemini';
import { useAuth } from '@/providers/AuthProvider';
import RoomChatMessageList from './RoomChatMessageList';
import RoomChatInputBar from './RoomChatInputBar';

type RoleType = 'ai' | 'user';
type Message = {
  id: string;
  userId: string;
  text: string;
  createdAt: any;
  type: RoleType;
};

export default function RoomAIChatPanel({ roomId, roomData }: { roomId: string; roomData: any }) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Firestoreのパスをユーザーごとに分ける
  const messagesCol =
    user?.uid && collection(firestore, 'rooms', roomId, 'aiChats', user.uid, 'messages');

    // onSnapshot エラーを一度だけ通知するためのフラグ
  const snapshotErrorShown = useRef(false);

  // メッセージ購読
  useEffect(() => {
    if (!roomId || !user?.uid || !messagesCol) return;
    const q = query(messagesCol, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message)));
      },
      (err) => {
        console.warn('[AIChat] onSnapshot error:', err?.code, err?.message);
        if (!snapshotErrorShown.current) {
          snapshotErrorShown.current = true;
          Alert.alert('AIチャットの購読に失敗', `${err?.code ?? 'unknown'}: ${err?.message ?? ''}`);
        }
      }
    );
    return unsubscribe;
  }, [roomId, user?.uid, messagesCol]);

  // 送信処理
  const handleSend = async () => {
    if (!input.trim() || loading || !user?.uid || !messagesCol) return;
    setLoading(true);
    try {
      // ユーザー発言を保存
      await addDoc(messagesCol, {
        userId: user.uid,
        text: input,
        createdAt: serverTimestamp(),
        type: 'user',
      });

      // 履歴は過去5往復分
      const history: { role: RoleType; text: string }[] = [
        ...messages.slice(-10).map((m) => ({
          role: m.type,
          text: m.text,
        })),
        { role: 'user', text: input },
      ];

      // AI呼び出し
      const aiReply = await AIChatGemini(input, history, roomData?.roomTag ?? 'general');

      // AI応答を保存
      await addDoc(messagesCol, {
        userId: 'ai',
        text: aiReply,
        createdAt: serverTimestamp(),
        type: 'ai',
      });

      setInput('');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || 'AIチャット送信に失敗しました');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <RoomChatMessageList messages={messages} myUserId={user?.uid || ''} />
      <RoomChatInputBar
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        disabled={loading || !user?.uid}
        loading={loading}
        placeholder="AIに質問..."
      />
    </KeyboardAvoidingView>
  );
}
