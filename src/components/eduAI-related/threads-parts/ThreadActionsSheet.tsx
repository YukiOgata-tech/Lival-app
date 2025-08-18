// src/components/eduAI-related/threads-parts/ThreadActionsSheet.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  Platform,
  TextInput,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Pencil, Trash2, Check, X } from 'lucide-react-native';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 既存互換: 引数なしでも可。引数ありの (newName: string) にも対応 */
  onRename: (() => void) | ((newName: string) => void);
  onDelete: () => void;
  /** リネーム入力の初期値（任意） */
  defaultName?: string;
  /** 呼び出し側から渡されるスレッド（任意） */
  thread?: any | null;
};

export default function ThreadActionsSheet({
  open,
  onClose,
  onRename,
  onDelete,
  defaultName,
  thread,
}: Props) {
  const insets = useSafeAreaInsets();
  const baseBottomGap = Math.max(insets.bottom, 16) + 24;

  /** ▼ 追加：キーボード高さを監視して bottom を持ち上げる */
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      const h = e.endCoordinates?.height ?? 0;
      setKbHeight(h);
    };
    const onHide = () => setKbHeight(0);

    const showEvt = Platform.select({
      ios: 'keyboardWillShow',
      android: 'keyboardDidShow',
      default: 'keyboardDidShow',
    }) as any;
    const hideEvt = Platform.select({
      ios: 'keyboardWillHide',
      android: 'keyboardDidHide',
      default: 'keyboardDidHide',
    }) as any;

    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  // onRename が (newName: string) を要求しているかチェック
  const needsName = useMemo(() => (onRename as Function)?.length >= 1, [onRename]);

  // 初期値は defaultName → thread?.title → 空文字
  const initial = (defaultName ?? thread?.title ?? '') as string;

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState<string>(initial);

  // open/prop 変化時に入力初期値を同期（開くたびに直近タイトルを入れる）
  useEffect(() => {
    if (open && needsName) {
      setName((defaultName ?? thread?.title ?? '') as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultName, thread, needsName]);

  const startRename = () => {
    if (needsName) {
      setRenaming(true);
    } else {
      onClose();
      (onRename as () => void)();
    }
  };

  const confirmRename = () => {
    const n = String(name ?? '').trim();
    if (!n) {
      setRenaming(false);
      Keyboard.dismiss();
      return;
    }
    onClose();
    setRenaming(false);
    Keyboard.dismiss();
    (onRename as (newName: string) => void)(n);
  };

  const cancelRename = () => {
    setRenaming(false);
    Keyboard.dismiss();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/55" onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: baseBottomGap + kbHeight,
          }}
        >
          <View className="self-center w-[92%] rounded-2xl bg-white/80 dark:bg-neutral-900/90 border border-white/30 dark:border-neutral-800 shadow-2xl p-3 pt-0">
            {/* Lottie バッジ */}
            <View style={{ position: 'absolute', top: -104, left: 16, alignSelf: 'center' }}>
              <LottieView
                source={require('@assets/lotties/ai-and-man.json')}
                autoPlay
                loop
                style={{ width: 110, height: 110 }}
              />
            </View>

            <Text className="text-center text-[13px] text-neutral-500 dark:text-neutral-400 mt-3 mb-2">
              スレッドの操作
            </Text>

            {renaming ? (
              <View className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3 mb-2">
                <Text className="text-[13px] text-neutral-600 dark:text-neutral-300 mb-2">
                  新しい名前を入力
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="スレッド名"
                  placeholderTextColor="#9ca3af"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmRename}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
                />

                <View className="flex-row justify-end gap-2 mt-3">
                  <Pressable
                    onPress={cancelRename}
                    className="flex-row items-center px-3 py-2 rounded-lg bg-neutral-100 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700"
                  >
                    <X size={16} color="#6b7280" />
                    <Text className="ml-1 text-[14px] text-neutral-600 dark:text-neutral-300">キャンセル</Text>
                  </Pressable>

                  <Pressable
                    onPress={confirmRename}
                    className="flex-row items-center px-3 py-2 rounded-lg bg-indigo-600 active:bg-indigo-700"
                  >
                    <Check size={16} color="#fff" />
                    <Text className="ml-1 text-[14px] text-white">OK</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={startRename}
                  className="flex-row items-center px-4 py-3 rounded-xl bg-neutral-50 active:bg-neutral-100 dark:bg-neutral-800/60 dark:active:bg-neutral-800"
                  style={{ marginBottom: 8 }}
                >
                  <Pencil size={18} color={Platform.OS === 'ios' ? '#111827' : '#1f2937'} />
                  <Text className="ml-2 text-[16px] font-medium text-neutral-900 dark:text-neutral-100">
                    名前を変更
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                    onDelete();
                  }}
                  className="flex-row items-center px-4 py-3 rounded-xl bg-red-50 active:bg-red-100 dark:bg-red-900/20 dark:active:bg-red-900/30"
                >
                  <Trash2 size={18} color="#b91c1c" />
                  <Text className="ml-2 text-[16px] font-semibold text-red-700 dark:text-red-300">削除</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
