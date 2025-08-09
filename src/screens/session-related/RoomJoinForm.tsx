// src/screens/session-related/RoomJoinForm.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '@/providers/AuthProvider';

export default function RoomJoinForm() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = roomId.trim() !== '';

  const handleJoin = async () => {
    setLoading(true);
    setError('');
    try {
      const ref = doc(firestore, 'rooms', roomId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('ルームが存在しません');
      const data = snap.data();
      if (data.password && data.password !== password) throw new Error('パスワードが違います');
      // すでにメンバーかチェック
      if (!data.members?.includes(user?.uid)) {
        await updateDoc(ref, {
          members: arrayUnion(user?.uid),
          updatedAt: new Date(),
        });
      }
      navigation.navigate('GroupSessionRoom' as never, { roomId } as never);
    } catch (e: any) {
      setError(e.message || '参加に失敗しました');
    }
    setLoading(false);
  };

  return (
    <View>
      <TextInput
        label="ルームID"
        value={roomId}
        onChangeText={setRoomId}
        mode="outlined"
        className="mb-2"
      />
      <TextInput
        label="パスワード（必要な場合）"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        className="mb-2"
      />
      <Button
        mode="contained"
        onPress={handleJoin}
        disabled={!canSubmit || loading}
        loading={loading}
        className="mt-2"
      >
        ルームに参加
      </Button>
      <Snackbar visible={!!error} onDismiss={() => setError('')}>
        {error}
      </Snackbar>
    </View>
  );
}
