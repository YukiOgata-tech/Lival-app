// src/screens/AItools-related/AItoolsChatListScreen.tsx
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Appbar,
  FAB,
  Text,
  Portal,
  Modal,
  Button,
  ActivityIndicator,
  Dialog,
} from 'react-native-paper';
import {
  getAItoolsChatThreads,
  removeAItoolsChatThread,
  renameAItoolsChatThread,
} from '@/storage/AItoolsChatStorage';
import { AItoolsChatThread } from '@/types/AItoolsChatTypes';
import SelectableChatList from '@/components/AItools-related/SelectableChatList';

const LivalLoading = () => (
  <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
    <Image
      source={require('../../../assets/Lival-text.png')}
      style={{ width: 100, height: 100, opacity: 0.9 }}
      contentFit="contain"
    />
    <ActivityIndicator size="large" color="#3ba2e3" style={{ marginTop: 24 }} />
  </View>
);

export default function AItoolsChatListScreen() {
  const navigation = useNavigation();
  const [threads, setThreads] = useState<AItoolsChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規作成モーダル（種類選択）
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);

  // 長押しアクション（リネーム/削除）
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 一括選択
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadThreads = useCallback(() => {
    setThreads(getAItoolsChatThreads());
  }, []);

  useEffect(() => {
    refresh();
  }, []);
  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      loadThreads();
      setLoading(false);
      setSelectedIds([]);
      setSelectionMode(false);
    }, 300);
  };

  useFocusEffect(
    useCallback(() => {
      loadThreads();
    }, [loadThreads])
  );

  // 新規作成
  const handleCreate = (type: 'ocr' | 'translation') => {
    setTypeSelectOpen(false);
    if (type === 'ocr') {
      // @ts-ignore
      navigation.navigate('AItoolsOCRChatScreen', { threadId: undefined });
    } else {
      // @ts-ignore
      navigation.navigate('AItoolsTranslationChatScreen', { threadId: undefined });
    }
  };

  // 個別削除
  const handleDelete = () => {
    if (!actionTargetId) return;
    removeAItoolsChatThread(actionTargetId);
    loadThreads();
    setActionTargetId(null);
    setConfirmDelete(false);
  };

  // リネーム（確定時のみ実行）
  const handleRename = () => {
    if (!actionTargetId) return;
    const title = newTitle.trim();
    if (!title) return;
    renameAItoolsChatThread(actionTargetId, title);
    loadThreads();
    setActionTargetId(null);
    setRenameOpen(false);
    setNewTitle('');
  };

  // 一括削除
  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => removeAItoolsChatThread(id));
    loadThreads();
    setSelectedIds([]);
    setSelectionMode(false);
  };

  // アイテムタップ
  const handlePressItem = (item: AItoolsChatThread) => {
    if (item.type === 'ocr') {
      // @ts-ignore
      navigation.navigate('AItoolsOCRChatScreen', { threadId: item.id });
    } else {
      // @ts-ignore
      navigation.navigate('AItoolsTranslationChatScreen', { threadId: item.id });
    }
  };

  // 選択切替
  const handleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* Appbar */}
      <Appbar.Header className="bg-white dark:bg-neutral-900">
        <Appbar.Content title={<Text style={{ fontSize: 20, fontFamily: 'MPLUSRounded' }}>AIツールチャット</Text>} />
        {threads.length > 0 && (
          <Appbar.Action
            icon={selectionMode ? 'close' : 'check-circle-outline'}
            onPress={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds([]);
            }}
            accessibilityLabel={selectionMode ? '選択終了' : '複数選択'}
          />
        )}
      </Appbar.Header>

      {/* 本文 */}
      {loading ? (
        <LivalLoading />
      ) : threads.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Image
            source={require('../../../assets/Lival-text.png')}
            style={{ width: 90, height: 90, marginBottom: 12 }}
          />
          <Text className="text-lg text-neutral-500">まだチャット履歴がありません</Text>
          <Text className="text-base text-neutral-400 mt-1">＋ボタンから新しいチャットを始めよう！</Text>
        </View>
      ) : (
        <SelectableChatList
          threads={threads}
          onPressItem={handlePressItem}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          selectionMode={selectionMode}
          onDeleteSelected={handleDeleteSelected}
          // ★通常時の長押し→リネームシート
          onLongPressItem={(t) => {
            setActionTargetId(t.id);
            setNewTitle(t.title);
            setRenameOpen(true);
          }}
        />
      )}

      {/* 右下FAB（種類選択 Paper Modal のままでOK） */}
      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 20, bottom: 28, backgroundColor: '#3ba2e3' }}
        onPress={() => setTypeSelectOpen(true)}
        visible
      />

      <Portal>
        <Modal
          visible={typeSelectOpen}
          onDismiss={() => setTypeSelectOpen(false)}
          contentContainerStyle={{
            backgroundColor: '#fff',
            margin: 24,
            borderRadius: 24,
            padding: 32,
            alignItems: 'center',
          }}
        >
          <Text className="text-xl font-bold mb-4">どのAIチャットを開始しますか？</Text>
          <Button
            icon="camera"
            mode="contained"
            style={{ width: 200, marginBottom: 12, backgroundColor: '#6ee7b7' }}
            onPress={() => handleCreate('ocr')}
          >
            画像テキスト認識
          </Button>
          <Button
            icon="translate"
            mode="contained"
            style={{ width: 200, backgroundColor: '#60a5fa' }}
            onPress={() => handleCreate('translation')}
          >
            翻訳チャット
          </Button>
          <Button mode="text" style={{ marginTop: 12 }} onPress={() => setTypeSelectOpen(false)}>
            キャンセル
          </Button>
        </Modal>
      </Portal>

      {/* ▼ リネーム：純正 Modal + KAV（IME合成が途切れない） */}
      <RNModal
        visible={renameOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={80}
            >
              <View
                style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 28,
                }}
              >
                <Text className="text-xl font-bold mb-2">タイトルを変更</Text>
                <TextInput
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  // ★途中確定を一切させない（Done/変更ボタンだけで確定）
                  // onSubmitEditing は付けない
                  placeholder="新しいタイトル"
                  style={{
                    width: '100%',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#6d5ce7',
                    backgroundColor: '#fff',
                    fontSize: 18,
                    marginBottom: 12,
                  }}
                />
                <View className="flex-row justify-end gap-3">
                  <Button mode="text" onPress={() => setRenameOpen(false)}>
                    キャンセル
                  </Button>
                  <Button mode="contained" onPress={handleRename}>
                    変更
                  </Button>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* ▼ 個別削除確認（既存のまま） */}
      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>本当に削除しますか？</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>キャンセル</Button>
            <Button onPress={handleDelete} textColor="#f87171">
              削除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
