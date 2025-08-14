import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, KeyboardAvoidingView, Platform, FlatList, Keyboard } from "react-native";
import { TextInput, Button, Menu, Snackbar, Text } from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nanoid } from "nanoid/non-secure";

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
import {
  AItoolsGeminiTranslate,
  AItoolsTranslateLang,
  AItoolsTranslateTone,
} from "@/lib/AItoolsGemini";
import AItoolsAppbar from "@/components/AItools-related/AItoolsAppbar";
import AItoolsChatBubble from "@/components/AItools-related/AItoolsChatBubble";
import AItoolsLoading from "@/components/AItools-related/AItoolsLoading";

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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const threadId: string | undefined = route.params?.threadId;
  const [thread, setThread] = useState<AItoolsChatThread | null>(null);

  const [input, setInput] = useState("");
  const [lang, setLang] = useState<AItoolsTranslateLang>("zh");
  const [tone, setTone] = useState<AItoolsTranslateTone>("formal");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState("");
  const [renameSnackbar, setRenameSnackbar] = useState("");
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [toneMenuVisible, setToneMenuVisible] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);

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
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(show, () => setKeyboardVisible(true));
    const h = Keyboard.addListener(hide, () => setKeyboardVisible(false));
    return () => {
      isMounted.current = false;
      s.remove(); h.remove();
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // メッセージ送信
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
      if (isMounted.current) {
        setThread(updated);
        setInput("");
        setTimeout(scrollToEnd, 100);
      }
    } catch {
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
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={scrollToEnd}
        />

        {/* 入力エリア（サイズは既存のまま） */}
        <View
          style={{
            paddingBottom: keyboardVisible ? 0 : insets.bottom, // ★キーボード表示中はSafeAreaの下余白を無効化
            backgroundColor: "#ffffffEE",
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
          }}
        >
          <View className="px-2 pt-2">
            {/* オプション行（既存） */}
            <View className="flex-row w-full justify-center mb-1 gap-4">
              <Menu
                visible={langMenuVisible}
                onDismiss={() => setLangMenuVisible(false)}
                anchor={
                  <Button mode="outlined" className="rounded-full min-w-[90px]" onPress={() => setLangMenuVisible(true)}>
                    {langOptions.find((l) => l.value === lang)?.label ?? "言語選択"}
                  </Button>
                }
              >
                {langOptions.map((opt) => (
                  <Menu.Item key={opt.value} onPress={() => { setLang(opt.value); setLangMenuVisible(false); }} title={opt.label} />
                ))}
              </Menu>

              <Menu
                visible={toneMenuVisible}
                onDismiss={() => setToneMenuVisible(false)}
                anchor={
                  <Button mode="outlined" className="rounded-full min-w-[90px]" onPress={() => setToneMenuVisible(true)}>
                    {toneOptions.find((t) => t.value === tone)?.label ?? "トーン"}
                  </Button>
                }
              >
                {toneOptions.map((opt) => (
                  <Menu.Item key={opt.value} onPress={() => { setTone(opt.value); setToneMenuVisible(false); }} title={opt.label} />
                ))}
              </Menu>
            </View>

            <View className="flex-row items-end w-full py-1 px-2 rounded-2xl bg-neutral-50 dark:bg-neutral-800 shadow-sm mb-0">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="翻訳したいテキストを入力"
                className="flex-1 mr-2 bg-white dark:bg-neutral-900 rounded-2xl px-1 py-0 text-base"
                style={{ minHeight: 18, maxHeight: 100, fontSize: 16, fontFamily: "NotoSansJP" }}
                disabled={loading}
                multiline
                blurOnSubmit={false}
                underlineColor="transparent"
                theme={{ roundness: 24 }}
                onFocus={scrollToEnd}
              />
              <Button
                mode="contained"
                onPress={handleSend}
                loading={loading}
                disabled={!input.trim() || loading}
                className="bg-blue-400 rounded-full min-w-[54px] h-12"
                labelStyle={{ fontSize: 16, color: "white", fontWeight: "bold" }}
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
