// src/screens/AItools-related/AItoolsOCRChatScreen.tsx
// AItools OCRチャット画面
import React, { useState, useEffect, useRef } from "react";
import { View, KeyboardAvoidingView, Platform, FlatList, Image } from "react-native";
import { TextInput, Button, Snackbar, Menu, Text } from "react-native-paper";
import { useRoute } from "@react-navigation/native";
import { nanoid } from "nanoid/non-secure";
import * as ImagePicker from "expo-image-picker";
import TextRecognition from "react-native-text-recognition";
import {
  addAItoolsChatThread,
  getAItoolsChatThreadById,
  updateAItoolsChatThreadMessages,
} from "@/storage/AItoolsChatStorage";
import {
  AItoolsChatThread,
  AItoolsChatMessage,
} from "@/types/AItoolsChatTypes";
import AItoolsAppbar from "@/components/AItools-related/AItoolsAppbar";
import AItoolsChatBubble from "@/components/AItools-related/AItoolsChatBubble";
import AItoolsLoading from "@/components/AItools-related/AItoolsLoading";
import { renameAItoolsChatThread, removeAItoolsChatThread } from "@/storage/AItoolsChatStorage";

export default function AItoolsOCRChatScreen() {
  const route = useRoute<any>();
  const threadId: string | undefined = route.params?.threadId;
  const [thread, setThread] = useState<AItoolsChatThread | null>(null);

  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [input, setInput] = useState(""); // 任意でテキスト入力も可能に
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [renameSnackbar, setRenameSnackbar] = useState("");


  // 履歴ロード（既存/新規）
  useEffect(() => {
    if (threadId) {
      const t = getAItoolsChatThreadById(threadId);
      if (t) setThread(t);
    } else {
      const newThread: AItoolsChatThread = {
        id: nanoid(),
        type: "ocr",
        title: `OCRチャット ${new Date().toLocaleString()}`,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addAItoolsChatThread(newThread);
      setThread(newThread);
    }
  }, [threadId]);

  // 画像を撮影/選択→OCR実行
  const pickImageAndRecognize = async () => {
    setSnackbar("");
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        setOcrImage(uri);
        const texts = await TextRecognition.recognize(uri);
        const ocrText = texts.join("\n").trim();
        setOcrResult(ocrText);
        // チャット履歴にも自動追加
        if (thread) {
          const userMsg: AItoolsChatMessage = {
            id: nanoid(),
            type: "ocr",
            content: "[画像をOCR認識]",
            role: "user",
            timestamp: Date.now(),
            imageUri: uri,
          };
          const aiMsg: AItoolsChatMessage = {
            id: nanoid(),
            type: "ocr",
            content: ocrText,
            role: "ai",
            timestamp: Date.now(),
            ocrText,
            imageUri: uri,
          };
          const updated = {
            ...thread,
            messages: [...thread.messages, userMsg, aiMsg],
            updatedAt: Date.now(),
          };
          updateAItoolsChatThreadMessages(thread.id, updated.messages);
          setThread(updated);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch (e: any) {
      setSnackbar("OCRに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (!thread) return <AItoolsLoading />;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-neutral-900"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Appbar */}
      <AItoolsAppbar title={thread.title} fontFamily="MPLUSRounded" onRename={(newTitle) => {
        if (!thread) return;
        renameAItoolsChatThread(thread.id, newTitle);
        // メモリ上のthreadも即座に更新
        setThread({ ...thread, title: newTitle, updatedAt: Date.now() });
        setRenameSnackbar("タイトルを変更しました");
      }}
      onDelete={() => {
        if (!thread) return;
        removeAItoolsChatThread(thread.id);
        navigation.goBack(); // チャットリストに戻る
      }}
      />

      {/* チャット履歴 */}
      <FlatList
        ref={flatListRef}
        data={thread.messages}
        keyExtractor={(msg) => msg.id}
        renderItem={({ item }) => (
          <View className={`mb-2 px-3 w-full ${item.role === "user" ? "items-end" : "items-start"}`}>
            {/* 画像があれば先頭にサムネイル */}
            {item.imageUri && item.role === "user" && (
              <Image source={{ uri: item.imageUri }} style={{ width: 56, height: 56, borderRadius: 10, marginBottom: 4 }} />
            )}
            <AItoolsChatBubble
              message={item.content}
              isUser={item.role === "user"}
              subText={item.role === "ai" && item.ocrText ? "認識テキスト" : undefined}
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 96, paddingTop: 8 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <AItoolsLoading />
            <Text className="text-lg text-neutral-400 mt-2">ここにOCRチャットが表示されます</Text>
          </View>
        }
      />

      {/* 下部入力UI */}
      <View className="absolute bottom-0 left-0 w-full pb-3 pt-2 px-2 bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 rounded-t-2xl shadow-md">
        <View className="flex-row items-center w-full gap-2 justify-center">
          {/* 画像OCRボタン */}
          <Button
            mode="contained"
            icon="camera"
            onPress={pickImageAndRecognize}
            loading={loading}
            disabled={loading}
            className="bg-lime-500 rounded-full min-w-[36px] h-12 text-white text-base font-bold"
            contentStyle={{ height: 40 }}
          >
            <Text className="" style={{ fontSize: 15, fontWeight: "bold", color: "white" }}>画像</Text>
          </Button> 
          {/* テキスト入力 */}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="メモやコメント"
            className="flex-1 bg-gray-200 dark:bg-neutral-900 rounded-2xl px-2 py-0.5 text-base mx-1"
            style={{ minHeight: 30, fontSize: 16, fontFamily: "NotoSansJP",  }}
            disabled={loading}
            multiline
            underlineColor="transparent"
            theme={{ roundness: 24 }}
          />
          {/* コメント送信（OCRチャットに限り） */}
          <Button
            mode="contained"
            onPress={() => {
              if (!input.trim() || !thread) return;
              const msg: AItoolsChatMessage = {
                id: nanoid(),
                type: "ocr",
                content: input.trim(),
                role: "user",
                timestamp: Date.now(),
              };
              const updated = {
                ...thread,
                messages: [...thread.messages, msg],
                updatedAt: Date.now(),
              };
              updateAItoolsChatThreadMessages(thread.id, updated.messages);
              setThread(updated);
              setInput("");
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }}
            className="bg-blue-400 rounded-full min-w-[56px] h-12 text-white text-base font-bold"
            contentStyle={{ height: 40 }}
            disabled={!input.trim() || loading}
            loading={loading}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "white" }}>送信</Text>
          </Button>
        </View>
      </View>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar("")}>
        {snackbar}
      </Snackbar>
      <Snackbar visible={!!renameSnackbar} onDismiss={() => setRenameSnackbar("")}>{renameSnackbar}</Snackbar>
    </KeyboardAvoidingView>
  );
}
