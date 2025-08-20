// src/components/eduAI-related/TagPickerSheet.tsx
import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { TAG_KEYS, TAGS } from '@/constants/eduAITags';
import type { EduAITag } from '@/storage/eduAIStorage';

type Props = {
  open: boolean;
  initial?: EduAITag[];
  onClose: () => void;
  onSubmit: (next: EduAITag[]) => void;
  title?: string;
};

export default function TagPickerSheet({ open, initial, onClose, onSubmit, title }: Props) {
  const [select, setSelect] = useState<Set<EduAITag>>(new Set(initial ?? []));
  React.useEffect(() => { setSelect(new Set(initial ?? [])); }, [initial, open]);

  const toggle = (k: EduAITag) => {
    const s = new Set(select);
    s.has(k) ? s.delete(k) : s.add(k);
    setSelect(s);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4">
          <Text className="text-base font-semibold mb-3">{title ?? 'メッセージにタグを追加'}</Text>

          <View className="flex-row flex-wrap">
            {TAG_KEYS.map(k => {
              const spec = TAGS[k];
              const active = select.has(k);
              return (
                <Pressable
                  key={k}
                  onPress={() => toggle(k)}
                  className="px-3 py-2 rounded-full mr-2 mb-2 border"
                  style={{ backgroundColor: spec.bg, borderColor: spec.border, opacity: active ? 1 : 0.45 }}
                >
                  <View className="flex-row items-center">
                    {active ? <Check size={14} color={spec.fg} /> : null}
                    <Text className="ml-1 text-[12px]" style={{ color: spec.fg }}>{spec.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row mt-4">
            <Pressable onPress={onClose} className="flex-1 py-3 rounded-xl bg-neutral-200 mr-2">
              <Text className="text-center text-neutral-800 font-medium">キャンセル</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(Array.from(select))}
              className="flex-1 py-3 rounded-xl bg-neutral-900"
            >
              <Text className="text-center text-white font-medium">保存</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
