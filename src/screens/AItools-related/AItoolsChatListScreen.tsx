import React, { useEffect, useState } from 'react';
import { View, FlatList, Pressable, Image } from 'react-native';
import { Appbar, FAB, List, Text, Portal, Modal, Button, ActivityIndicator, Dialog, TextInput as PaperInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAItoolsChatThreads, removeAItoolsChatThread, renameAItoolsChatThread } from '@/storage/AItoolsChatStorage';
import { AItoolsChatThread } from '@/types/AItoolsChatTypes';
import SelectableChatList from "@/components/AItools-related/SelectableChatList";

// ローディング用Livalロゴ
const LivalLoading = () => (
  <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
    <Image
      source={require('../../../assets/Lival-text.png')}
      style={{ width: 100, height: 100, opacity: 0.9 }}
      resizeMode="contain"
    />
    <ActivityIndicator size="large" color="#3ba2e3" style={{ marginTop: 24 }} />
  </View>
);

export default function AItoolsChatListScreen() {
  const navigation = useNavigation();
  const [threads, setThreads] = useState<AItoolsChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  // 長押し操作の個別用
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 一括選択モード
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 履歴取得
  useEffect(() => {
    refresh();
  }, []);
  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setThreads(getAItoolsChatThreads());
      setLoading(false);
      setSelectedIds([]);
      setSelectionMode(false);
    }, 400);
  };

  // 新規作成→種別選択モーダル
  const handleCreate = (type: "ocr" | "translation") => {
    setModal(false);
    if (type === "ocr") {
      navigation.navigate("AItoolsOCRChatScreen", { threadId: undefined });
    } else if (type === "translation") {
      navigation.navigate("AItoolsTranslationChatScreen", { threadId: undefined });
    }
  };

  // 個別で削除
  const handleDelete = () => {
    if (!actionTargetId) return;
    removeAItoolsChatThread(actionTargetId); // removeを利用
    setThreads(getAItoolsChatThreads());
    setActionTargetId(null);
    setConfirmDelete(false);
  };

  // リネーム
  const handleRename = () => {
    if (!actionTargetId || !newTitle.trim()) return;
    renameAItoolsChatThread(actionTargetId, newTitle.trim());
    setThreads(getAItoolsChatThreads());
    setActionTargetId(null);
    setRenameModal(false);
    setNewTitle("");
  };

  // 一括削除
  const handleDeleteSelected = () => {
    selectedIds.forEach(id => removeAItoolsChatThread(id));
    setThreads(getAItoolsChatThreads());
    setSelectedIds([]);
    setSelectionMode(false);
  };

  // アイテムタップ動作
  const handlePressItem = (item: AItoolsChatThread) => {
    if (item.type === "ocr") {
      navigation.navigate("AItoolsOCRChatScreen", { threadId: item.id });
    } else if (item.type === "translation") {
      navigation.navigate("AItoolsTranslationChatScreen", { threadId: item.id });
    }
  };

  // 選択切り替え
  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* Appbar */}
      <Appbar.Header className="bg-white dark:bg-neutral-900">
        <Appbar.Content
          title={
            <Text style={{ fontFamily: 'MPLUSRounded', fontSize: 20 }}>
              AIツールチャット
            </Text>}
        />
        {/* トップバー右に「選択モード」切り替えボタン */}
        {threads.length > 0 && (
          <Appbar.Action
            icon={selectionMode ? "close" : "check-circle-outline"}
            onPress={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds([]);
            }}
            accessibilityLabel={selectionMode ? "選択終了" : "複数選択"}
          />
        )}
      </Appbar.Header>

      {/* ローディング */}
      {loading ? (
        <LivalLoading />
      ) : (
        <>
          {threads.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Image source={require('../../../assets/Lival-text.png')} style={{ width: 90, height: 90, marginBottom: 12 }} />
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
            />
          )}

          {/* 新規チャットFAB */}
          <FAB
            icon="plus"
            label="新規チャット"
            style={{
              position: 'absolute', right: 24, bottom: 78, }}
            onPress={() => setModal(true)}
            color="black"
            className="bg-gradient-to-r from-sky-400 to-lime-400"
          />
        </>
      )}

      {/* ツール種別選択モーダル */}
      <Portal>
        <Modal
          visible={modal}
          onDismiss={() => setModal(false)}
          contentContainerStyle={{
            backgroundColor: "#fff",
            margin: 24,
            borderRadius: 24,
            padding: 32,
            alignItems: "center"
          }}
        >
          <Text className="text-xl font-bold mb-4">どのAIチャットを開始しますか？</Text>
          <Button
            icon="camera"
            mode="contained"
            style={{ width: 200, marginBottom: 12, backgroundColor: "#6ee7b7" }}
            onPress={() => handleCreate("ocr")}
          >画像テキスト認識</Button>
          <Button
            icon="translate"
            mode="contained"
            style={{ width: 200, backgroundColor: "#60a5fa" }}
            onPress={() => handleCreate("translation")}
          >翻訳チャット</Button>
          <Button
            mode="text"
            style={{ marginTop: 12 }}
            onPress={() => setModal(false)}
          >キャンセル</Button>
        </Modal>
      </Portal>

      {/* リネームモーダル */}
      <Portal>
        <Modal
          visible={renameModal}
          onDismiss={() => setRenameModal(false)}
          contentContainerStyle={{
            backgroundColor: "#fff",
            margin: 24,
            borderRadius: 24,
            padding: 24,
            alignItems: "center"
          }}
        >
          <Text className="text-xl font-bold mb-2">タイトルを変更</Text>
          <PaperInput
            value={newTitle}
            onChangeText={setNewTitle}
            style={{ width: 220, marginBottom: 12 }}
            autoFocus
          />
          <Button mode="contained" onPress={handleRename} style={{ marginBottom: 8 }}>変更</Button>
          <Button onPress={() => setRenameModal(false)}>キャンセル</Button>
        </Modal>
      </Portal>

      {/* 削除確認ダイアログ */}
      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>本当に削除しますか？</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>キャンセル</Button>
            <Button onPress={handleDelete} color="#f87171">削除</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
