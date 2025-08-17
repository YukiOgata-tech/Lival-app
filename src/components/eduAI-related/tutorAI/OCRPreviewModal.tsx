// src/components/eduAI-related/tutorAI/OCRPreviewModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, Platform } from 'react-native';

type Props = {
  visible: boolean;
  rawText: string;
  onCancel: () => void;
  onConfirm: (finalText: string) => void;
};

function extractPreview(raw: string) {
  const m = raw.match(/\[TEXT\]([\s\S]*?)\[END\]/);
  return (m ? m[1] : raw).trim();
}

export default function OCRPreviewModal({ visible, rawText, onCancel, onConfirm }: Props) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (visible) setText(extractPreview(rawText));
  }, [visible, rawText]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-2xl p-4" style={{ paddingBottom: Platform.OS==='ios'? 24 : 12 }}>
          <Text className="text-base font-semibold mb-2">画像から抽出したテキストを確認</Text>
          <Text className="text-xs text-neutral-500 mb-2">必要なら修正してから送信してください</Text>
          <TextInput
            className="bg-neutral-100 rounded-xl px-3 py-2 h-40"
            multiline
            value={text}
            onChangeText={setText}
          />
          <View className="flex-row justify-end mt-3">
            <Pressable onPress={onCancel} className="px-4 py-2 rounded-xl bg-neutral-200 mr-2">
              <Text className="font-semibold">キャンセル</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(text)} className="px-4 py-2 rounded-xl bg-blue-600">
              <Text className="text-white font-semibold">送信</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
