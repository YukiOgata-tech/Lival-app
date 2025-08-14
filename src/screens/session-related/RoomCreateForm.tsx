// src/screens/session-related/RoomCreateForm.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TextInput, Button, HelperText, Snackbar, RadioButton, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { nanoid } from 'nanoid/non-secure';
import { firestore } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/providers/AuthProvider';
import TimePickerPanel from '@/components/session-related/TimePickerPanel';
import FriendPicker from '@/components/session-related/FriendPicker';

const MAX_USERS = 7;
const ROOM_TAGS = [
  { label: '一般', value: 'general' },
  { label: '学習', value: 'study' },
  { label: '仕事', value: 'work' },
];

type Props = { onClose?: () => void };

export default function RoomCreateForm({ onClose }: Props) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [goal, setGoal] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [roomTag, setRoomTag] = useState('general');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = roomName.trim() !== '' && goal.trim() !== '' && minutes >= 10;

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    const roomId = nanoid(10);

    try {
      // 1) ルーム作成
      await setDoc(doc(firestore, 'rooms', roomId), {
        roomName, password, goal, minutes, roomTag,
        maxUsers: MAX_USERS,
        hostUserId: user?.uid ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [user?.uid],
        status: 'active',
        sessionStartAt: serverTimestamp(),
      });

      // 2) 招待の作成（Functions onRoomInviteCreated がPush送信）
      if (selectedFriends.length > 0) {
        const inviteId = nanoid(12);
        await setDoc(doc(firestore, 'rooms', roomId, 'invites', inviteId), {
          fromUid: user?.uid ?? null,
          toUids: selectedFriends,                        // ★複数招待
          message: inviteMessage?.trim() || null,
          createdAt: serverTimestamp(),
        });
        console.log('[RoomCreate] invite created');
      }

      navigation.navigate('GroupSessionRoom' as never, { roomId } as never);
      onClose && onClose();
    } catch (e: any) {
      setError(`ルーム作成に失敗: ${e?.message || JSON.stringify(e)}`);
      console.error('[RoomCreate] ERROR:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text className="mb-1 text-base text-gray-700 dark:text-gray-200 font-bold">ルームの種類</Text>
      <RadioButton.Group onValueChange={setRoomTag} value={roomTag}>
        <View className="flex-row mb-3 border rounded-md p-2 bg-white dark:bg-neutral-900">
          {ROOM_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag.value}
              className="flex-row items-center mr-6"
              activeOpacity={0.8}
              onPress={() => setRoomTag(tag.value)}
            >
              <View className={`mr-1 rounded-full border-2 ${roomTag === tag.value ? 'border-blue-500' : 'border-gray-400'} p-0.5`}>
                <RadioButton
                  value={tag.value}
                  color={roomTag === tag.value ? '#3b82f6' : '#a3a3a3'}
                  uncheckedColor="#a3a3a3"
                />
              </View>
              <Text className={`ml-1 text-base ${roomTag === tag.value ? 'text-blue-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </RadioButton.Group>

      <TextInput label="ルーム名" value={roomName} onChangeText={setRoomName} mode="outlined" className="mb-2" />
      <TextInput label="パスワード（任意）" value={password} onChangeText={setPassword} mode="outlined" secureTextEntry className="mb-2" />
      <TextInput label="目標（例: 数学の勉強）" value={goal} onChangeText={setGoal} mode="outlined" className="mb-2" />
      <TimePickerPanel value={minutes} onChange={setMinutes} />
      <View className="flex-row items-center mb-2">
        <Text className="text-base text-gray-700 dark:text-gray-200">最大人数</Text>
        <Text className="text-xl font-bold ml-2">{MAX_USERS}</Text>
        <Text className="text-base ml-1">人（固定）</Text>
      </View>
      <HelperText type="info">時間・目標・最大人数はあとでルーム内でも確認できます</HelperText>

      {/* 招待UI */}
      <Divider className="my-3" />
      <Text className="mb-1 text-base text-gray-700 dark:text-gray-200 font-bold">フレンドに招待を送る（任意）</Text>
      <FriendPicker value={selectedFriends} onChange={setSelectedFriends} />
      <TextInput
        label="招待メッセージ（任意）"
        value={inviteMessage}
        onChangeText={setInviteMessage}
        mode="outlined"
        className="mt-2"
        placeholder="例：今から集中作業しませんか？"
      />

      <Button mode="contained" onPress={handleCreate} disabled={!canSubmit || loading} loading={loading} className="mt-3">
        ルームを作成
      </Button>
      <Snackbar visible={!!error} onDismiss={() => setError('')}>{error}</Snackbar>
    </View>
  );
}
