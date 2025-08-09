// src/screens/session-related/TimePickerPanel.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import { Button } from 'react-native-paper';

const MIN_MINUTES = 10;
const MAX_MINUTES = 720;
const STEP = 10; // 10分刻み

type Props = {
  value: number;
  onChange: (v: number) => void;
};

export default function TimePickerPanel({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const timeOptions = Array.from(
    { length: (MAX_MINUTES - MIN_MINUTES) / STEP + 1 },
    (_, i) => MIN_MINUTES + i * STEP
  );
  return (
    <View className="mb-2">
      <TouchableOpacity
        onPress={() => setVisible(true)}
        className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-neutral-800"
      >
        <Text className="text-base text-gray-700 dark:text-gray-200">
          セッション時間：<Text className="font-bold">{value}</Text> 分（タップして選択）
        </Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View className="flex-1 justify-end bg-black/30">
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                className="bg-white dark:bg-neutral-900 rounded-t-2xl max-h-96 p-4"
                pointerEvents="box-none"
              >
                <Text className="mb-2 pb-2 text-lg font-bold border-b">セッション時間を選択</Text>
                <FlatList
                  data={timeOptions}
                  keyExtractor={(item) => item.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="py-3 px-2"
                      onPress={() => {
                        onChange(item);
                        setVisible(false);
                      }}
                    >
                      <Text className="text-center text-lg">{item} 分</Text>
                    </TouchableOpacity>
                  )}
                  initialScrollIndex={Math.floor((value - MIN_MINUTES) / STEP)}
                  getItemLayout={(_, index) => ({
                    length: 48,
                    offset: 48 * index,
                    index,
                  })}
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator={false}
                />
                <Button
                  onPress={() => setVisible(false)}
                  className="mt-2"
                  mode="text"
                  style={{ marginBottom: 6 }}
                >
                  閉じる
                </Button>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
