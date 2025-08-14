// src/components/session-related/chat/RoomAIChatPanel.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { AIChatGemini } from '@/lib/GroupSession-related/AIChatGemini';
import { useAuth } from '@/providers/AuthProvider';
import RoomChatMessageList from '@/components/session-related/chat/RoomChatMessageList';
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

  const messagesCol = useMemo(
    () => (user?.uid ? collection(firestore, 'rooms', roomId, 'aiChats', user.uid, 'messages') : null),
    [roomId, user?.uid]
  );

  const snapshotErrorShown = useRef(false);

  useEffect(() => {
    if (!messagesCol) return;
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
  }, [messagesCol]);

  // 送信処理（即クリア & typing 演出用に loading を立てる）
  const handleSend = async () => {
    const textToSend = input.trim();
    if (!textToSend || loading || !user?.uid || !messagesCol) return;

    setLoading(true);
    setInput(''); // ★ 送信直後に即クリア（以前はAI応答保存後だったため入力が残って見えた）

    try {
      // ユーザー発言を保存
      await addDoc(messagesCol, {
        userId: user.uid,
        text: textToSend,
        createdAt: serverTimestamp(),
        type: 'user',
      });

      // 過去数往復分の履歴 + 今回の入力
      const history: { role: RoleType; text: string }[] = [
        ...messages.slice(-10).map((m) => ({ role: m.type, text: m.text })),
        { role: 'user', text: textToSend },
      ];

      // AI呼び出し
      const aiReply = await AIChatGemini(textToSend, history, roomData?.roomTag ?? 'general');

      // AI応答を保存
      await addDoc(messagesCol, {
        userId: user.uid,
        text: aiReply,
        createdAt: serverTimestamp(),
        type: 'ai',
      });
    } catch (e: any) {
      Alert.alert('エラー', e?.message || 'AIチャット送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <RoomChatMessageList messages={messages as any} myUserId={user?.uid || ''} loading={loading} />
        <RoomChatInputBar
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          disabled={loading || !user?.uid}
          loading={loading}
          placeholder="AIに質問..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
