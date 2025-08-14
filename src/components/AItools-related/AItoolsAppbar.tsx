// src/components/AItools-related/AItoolsAppbar.tsx
import React, { useEffect, useState } from 'react';
import { Appbar, Button } from 'react-native-paper';
import {
  View,
  Text,
  TouchableOpacity,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

type Props = {
  title: string;
  fontFamily?: string;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
};

export default function AItoolsAppbar({
  title,
  onRename,
  onDelete,
  fontFamily = 'NotoSansJP',
}: Props) {
  const navigation = useNavigation();

  // リネーム用
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(title);

  // 親からタイトルが変わったとき同期
  useEffect(() => {
    setRenameTitle(title);
  }, [title]);

  const handleConfirmRename = () => {
    const next = renameTitle.trim();
    if (!next || !onRename) return;
    onRename(next); // ここでのみ確定（IME合成を途切れさせない）
    setRenameOpen(false);
  };

  return (
    <>
      <Appbar.Header className="bg-white dark:bg-neutral-900">
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={
            onRename ? (
              <TouchableOpacity onPress={() => setRenameOpen(true)} activeOpacity={0.7}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily, fontSize: 20 }}
                >
                  {title}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text numberOfLines={1} style={{ fontFamily, fontSize: 20 }}>
                {title}
              </Text>
            )
          }
        />
        {onRename && <Appbar.Action icon="pencil" onPress={() => setRenameOpen(true)} />}
        {onDelete && <Appbar.Action icon="delete" onPress={onDelete} />}
      </Appbar.Header>

      {/* ▼ リネーム：純正 Modal + KAV（IMEの変換バーが途切れない） */}
      <RNModal
        visible={renameOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.35)',
              justifyContent: 'flex-end',
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={80} // 端末により調整可（Appbar高さ分）
            >
              <View
                style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 28,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                  タイトルを変更
                </Text>

                {/* ★RN純正TextInput：途中確定を一切しない（Buttonでのみ確定） */}
                <TextInput
                  value={renameTitle}
                  onChangeText={setRenameTitle}
                  autoFocus
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  placeholder="新しいタイトル"
                  style={{
                    width: '100%',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#6d5ce7',
                    backgroundColor: '#fff',
                    fontSize: 18,
                    marginBottom: 12,
                  }}
                  // ※ onSubmitEditing は付けない（IME合成を維持）
                />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                  <Button onPress={() => setRenameOpen(false)}>キャンセル</Button>
                  <Button mode="contained" onPress={handleConfirmRename} disabled={!renameTitle.trim()}>
                    変更
                  </Button>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </>
  );
}
