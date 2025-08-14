// src/components/AItools-related/SelectableChatList.tsx
import React from "react";
import { FlatList, Pressable, View } from "react-native";
import { List, Text, Button, Checkbox } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AItoolsChatThread } from "@/types/AItoolsChatTypes";

type Props = {
  threads: AItoolsChatThread[];
  onPressItem: (thread: AItoolsChatThread) => void;
  selectedIds: string[];
  onSelect: (id: string) => void;
  selectionMode: boolean;
  onDeleteSelected: () => void;
  /** 通常時の長押しで呼ばれる（リネーム用）*/
  onLongPressItem?: (thread: AItoolsChatThread) => void;
};

export default function SelectableChatList({
  threads,
  onPressItem,
  selectedIds,
  onSelect,
  selectionMode,
  onDeleteSelected,
  onLongPressItem,
}: Props) {
  return (
    <View className="flex-1">
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              if (selectionMode) {
                onSelect(item.id);
              } else {
                onPressItem(item);
              }
            }}
            onLongPress={() => {
              if (selectionMode) {
                onSelect(item.id);
              } else {
                onLongPressItem?.(item); // ★通常時の長押し→リネーム
              }
            }}
            delayLongPress={300}
            className="px-2"
          >
            <List.Item
              title={item.title}
              description={new Date(item.updatedAt).toLocaleString()}
              left={() =>
                selectionMode ? (
                  <Checkbox
                    status={selectedIds.includes(item.id) ? "checked" : "unchecked"}
                    onPress={() => onSelect(item.id)}
                  />
                ) : item.type === "ocr" ? (
                  <MaterialCommunityIcons name="camera" size={26} color="#7dd619" style={{ marginTop: 6 }} />
                ) : (
                  <MaterialCommunityIcons name="translate" size={26} color="#2686f7" style={{ marginTop: 6 }} />
                )
              }
              right={() => (
                <Text className={`font-bold text-sm ${item.type === "ocr" ? "text-lime-600" : "text-sky-600"}`}>
                  {item.type === "ocr" ? "OCR" : "翻訳"}
                </Text>
              )}
              className={`rounded-xl bg-white/80 dark:bg-neutral-800/80 my-2 shadow ${
                selectionMode ? "opacity-80" : ""
              }`}
            />
          </Pressable>
        )}
        ListFooterComponent={<View className="h-20" />}
      />
      {/* 一括削除ボタン（選択モード時のみ） */}
      {selectionMode && selectedIds.length > 0 && (
        <View className="absolute bottom-8 left-0 w-full items-center">
          <Button mode="contained" onPress={onDeleteSelected} style={{ backgroundColor: "#f87171", minWidth: 180 }}>
            {selectedIds.length}件を一括削除
          </Button>
        </View>
      )}
    </View>
  );
}
