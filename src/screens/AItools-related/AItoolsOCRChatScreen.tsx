// src/screens/AItools-related/AItoolsOCRChatScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, KeyboardAvoidingView, Platform, FlatList, Image, Keyboard } from "react-native";
import { TextInput, Button, Snackbar, Text } from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nanoid } from "nanoid/non-secure";
import * as ImagePicker from "expo-image-picker";
import TextRecognition from "react-native-text-recognition";
import {
  addAItoolsChatThread,
  getAItoolsChatThreadById,
  updateAItoolsChatThreadMessages,
  renameAItoolsChatThread,
  removeAItoolsChatThread,
} from "@/storage/AItoolsChatStorage";
import {
  AItoolsChatThread,
  AItoolsChatMessage,
} from "@/types/AItoolsChatTypes";
import AItoolsAppbar from "@/components/AItools-related/AItoolsAppbar";
import AItoolsChatBubble from "@/components/AItools-related/AItoolsChatBubble";
import AItoolsLoading from "@/components/AItools-related/AItoolsLoading";

export default function AItoolsOCRChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const threadId: string | undefined = route.params?.threadId;
  const [thread, setThread] = useState<AItoolsChatThread | null>(null);

  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState("");
  const [renameSnackbar, setRenameSnackbar] = useState("");

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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

  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(show, () => setKeyboardVisible(true));
    const h = Keyboard.addListener(hide, () => setKeyboardVisible(false));
    return () => { s.remove(); h.remove(); };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  }, []);

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
          setTimeout(scrollToEnd, 100);
        }
      }
    } catch {
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
      keyboardVerticalOffset={28}
    >
      <AItoolsAppbar
        title={thread.title}
        fontFamily="MPLUSRounded"
        onRename={(newTitle) => {
          if (!thread) return;
          renameAItoolsChatThread(thread.id, newTitle);
          setThread({ ...thread, title: newTitle, updatedAt: Date.now() });
          setRenameSnackbar("タイトルを変更しました");
        }}
        onDelete={() => {
          if (!thread) return;
          removeAItoolsChatThread(thread.id);
          navigation.goBack();
        }}
      />

      <View className="flex-1">
        <FlatList
          ref={flatListRef}
          data={thread.messages}
          keyExtractor={(msg) => msg.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View className={`mb-2 px-3 w-full ${item.role === "user" ? "items-end" : "items-start"}`}>
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
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={scrollToEnd}
        />

        {/* 入力エリア（サイズは既存のまま） */}
        <View
          style={{
            paddingBottom: keyboardVisible ? 0 : insets.bottom, // ★キーボード表示中の余白を0に
            backgroundColor: "#ffffffEE",
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
          }}
        >
          <View className="pb-1 pt-1 px-2">
            <View className="flex-row items-center w-full gap-2 justify-center">
              <Button
                mode="contained"
                icon="camera"
                onPress={pickImageAndRecognize}
                loading={loading}
                disabled={loading}
                className="bg-lime-500 rounded-full min-w-[36px] h-12"
                contentStyle={{ height: 40 }}
                labelStyle={{ color: "white", fontWeight: "bold" }}
              >
                画像
              </Button>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="メモやコメント"
                className="flex-1 bg-gray-200 dark:bg-neutral-900 rounded-2xl px-1 py-0 text-base mx-1"
                style={{ minHeight: 16, maxHeight: 100, fontSize: 16, fontFamily: "NotoSansJP" }}
                disabled={loading}
                multiline
                blurOnSubmit={false}
                underlineColor="transparent"
                theme={{ roundness: 24 }}
                onFocus={scrollToEnd}
              />
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
                  setTimeout(scrollToEnd, 100);
                }}
                className="bg-blue-400 rounded-full min-w-[56px] h-12"
                contentStyle={{ height: 40 }}
                disabled={!input.trim() || loading}
                loading={loading}
                labelStyle={{ color: "white", fontWeight: "bold", fontSize: 16 }}
              >
                送信
              </Button>
            </View>
          </View>
        </View>
      </View>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar("")}>
        {snackbar}
      </Snackbar>
      <Snackbar visible={!!renameSnackbar} onDismiss={() => setRenameSnackbar("")}>
        {renameSnackbar}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
