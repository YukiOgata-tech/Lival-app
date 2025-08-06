import React, { useState, useEffect, useRef } from "react";
import { View, KeyboardAvoidingView, Platform, FlatList } from "react-native";
import { TextInput, Button, Menu, Snackbar, Text } from "react-native-paper";
import { useRoute } from "@react-navigation/native";
import { nanoid } from "nanoid/non-secure";

import {
  addAItoolsChatThread,
  getAItoolsChatThreadById,
  updateAItoolsChatThreadMessages,
} from "@/storage/AItoolsChatStorage";
import {
  AItoolsChatThread,
  AItoolsChatMessage,
} from "@/types/AItoolsChatTypes";
import {
  AItoolsGeminiTranslate,
  AItoolsTranslateLang,
  AItoolsTranslateTone,
} from "@/lib/AItoolsGemini";
import AItoolsAppbar from "@/components/AItools-related/AItoolsAppbar";
import AItoolsChatBubble from "@/components/AItools-related/AItoolsChatBubble";
import AItoolsLoading from "@/components/AItools-related/AItoolsLoading";
import { renameAItoolsChatThread, removeAItoolsChatThread } from "@/storage/AItoolsChatStorage";

const langOptions: { value: AItoolsTranslateLang; label: string }[] = [
  { value: "en", label: "英語" },
  { value: "ko", label: "韓国語" },
  { value: "zh", label: "中国語" },
  { value: "ja", label: "日本語" },
];
const toneOptions: { value: AItoolsTranslateTone; label: string }[] = [
  { value: "formal", label: "フォーマル" },
  { value: "casual", label: "カジュアル" },
];

export default function AItoolsTranslationChatScreen() {
  const route = useRoute<any>();
  const threadId: string | undefined = route.params?.threadId;
  const [thread, setThread] = useState<AItoolsChatThread | null>(null);

  const [input, setInput] = useState("");
  const [lang, setLang] = useState<AItoolsTranslateLang>("zh");
  const [tone, setTone] = useState<AItoolsTranslateTone>("formal");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState("");
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [toneMenuVisible, setToneMenuVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);
  const [renameSnackbar, setRenameSnackbar] = useState(""); // 任意: 成功表示などに


  // 履歴ロード
  useEffect(() => {
    if (threadId) {
      const t = getAItoolsChatThreadById(threadId);
      if (t) setThread(t);
    } else {
      const newThread: AItoolsChatThread = {
        id: nanoid(),
        type: "translation",
        title: `翻訳チャット ${new Date().toLocaleString()}`,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addAItoolsChatThread(newThread);
      setThread(newThread);
    }
  }, [threadId]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // メッセージ送信・Gemini翻訳
  const handleSend = async () => {
    if (!input.trim() || !thread) return;
    const userMsg: AItoolsChatMessage = {
      id: nanoid(),
      type: "translation",
      content: input.trim(),
      role: "user",
      timestamp: Date.now(),
    };
    setLoading(true);
    try {
      const aiResult = await AItoolsGeminiTranslate(input, lang, tone);
      const aiMsg: AItoolsChatMessage = {
        id: nanoid(),
        type: "translation",
        content: aiResult,
        role: "ai",
        timestamp: Date.now(),
        translatedText: aiResult,
      };
      const updated = {
        ...thread,
        messages: [...thread.messages, userMsg, aiMsg],
        updatedAt: Date.now(),
      };
      updateAItoolsChatThreadMessages(thread.id, updated.messages);
      // ここでアンマウント確認
      if (isMounted.current) {
        setThread(updated);
        setInput("");
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e: any) {
      if (isMounted.current) setSnackbar("翻訳に失敗しました");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  if (!thread) return <AItoolsLoading />;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-neutral-900"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Appbar */}
      <AItoolsAppbar title={thread.title} fontFamily="MPLUSRounded"
      onRename={(newTitle) => {
        if (!thread) return;
        renameAItoolsChatThread(thread.id, newTitle);
        // メモリ上のthreadも即座に更新
        setThread({ ...thread, title: newTitle, updatedAt: Date.now() });
        setRenameSnackbar("タイトルを変更しました");
      }}
      onDelete={() => {
        if (!thread) return;
        removeAItoolsChatThread(thread.id);
        navigation.goBack();
        }}
/>

      {/* チャット履歴 */}
      <FlatList
        ref={flatListRef}
        data={thread.messages}
        keyExtractor={(msg) => msg.id}
        renderItem={({ item }) => (
          <View className={`mb-2 px-3 w-full ${item.role === "user" ? "items-end" : "items-start"}`}>
            <AItoolsChatBubble
              message={item.content}
              isUser={item.role === "user"}
              subText={
                item.role === "ai"
                  ? `${langOptions.find((l) => l.value === lang)?.label} / ${toneOptions.find((t) => t.value === tone)?.label}`
                  : undefined
              }
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <AItoolsLoading />
            <Text className="text-lg text-neutral-400 mt-2">ここに翻訳チャットが表示されます</Text>
          </View>
        }
      />

      {/* 入力エリア（LINE風バー＋選択ボタン上配置） */}
      <View className="absolute bottom-0 left-0 w-full pb-3 pt-2 px-2 bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 rounded-t-2xl shadow-md">
      <View className="flex-row w-full justify-center mb-1 gap-2">
          {/* 言語 */}
          <Menu
            visible={langMenuVisible}
            onDismiss={() => setLangMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                className="rounded-full min-w-[90px]"
                onPress={() => setLangMenuVisible(true)}
              >
                {langOptions.find((l) => l.value === lang)?.label ?? "言語選択"}
              </Button>
            }
          >
            {langOptions.map((opt) => (
              <Menu.Item
                key={opt.value}
                onPress={() => {
                  setLang(opt.value);
                  setLangMenuVisible(false);
                }}
                title={opt.label}
              />
            ))}
          </Menu>
          {/* トーン */}
          <Menu
            visible={toneMenuVisible}
            onDismiss={() => setToneMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                className="rounded-full min-w-[90px]"
                onPress={() => setToneMenuVisible(true)}
              >
                {toneOptions.find((t) => t.value === tone)?.label ?? "トーン"}
              </Button>
            }
          >
            {toneOptions.map((opt) => (
              <Menu.Item
                key={opt.value}
                onPress={() => {
                  setTone(opt.value);
                  setToneMenuVisible(false);
                }}
                title={opt.label}
              />
            ))}
          </Menu>
        </View>

        {/* 入力バー（高さ・丸み・影・LINE風デザイン） */}
        <View className="flex-row items-end w-full py-2 px-2 bottom-2 mt-1 rounded-2xl bg-neutral-50 dark:bg-neutral-800 shadow-sm">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="翻訳したいテキストを入力"
            className="flex-1 mr-2 bg-white dark:bg-neutral-900 rounded-2xl px-4 py-2 text-base"
            style={{ height: 40, fontSize: 16, fontFamily: "NotoSansJP" }} 
            disabled={loading}
            multiline
            underlineColor="transparent"
            theme={{ roundness: 24 }}
          />
          <Button
            mode="contained"
            onPress={handleSend}
            loading={loading}
            disabled={!input.trim() || loading}
            className="bg-blue-400 rounded-full min-w-[54px] h-12 text-white text-base font-bold"
            labelStyle={{ fontSize: 16, color: "white", fontWeight: "bold" }}
          >
            送信
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
