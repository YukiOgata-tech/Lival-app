// src/components/AItools-related/AItoolsAppbar.tsx
import React, { useState } from 'react';
import { Appbar, TextInput, Dialog, Portal, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  fontFamily?: string;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
};

export default function AItoolsAppbar({ title, onRename, onDelete, fontFamily = 'NotoSansJP' }: Props) {
  const navigation = useNavigation();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(title);

  // タイトルが変更されたら最新化（親からのtitle変化を受け取る用）
  React.useEffect(() => { setRenameTitle(title); }, [title]);

  return (
    <>
      <Appbar.Header className="bg-gray-400 dark:bg-neutral-900" style={{ backgroundColor: '#3ba2e3' }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={
            onRename ? (
              <TouchableOpacity onPress={() => setRenameOpen(true)}>
                <Text style={{ fontFamily, fontSize: 20 }} numberOfLines={1}>
                  {title}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontFamily, fontSize: 20 }} numberOfLines={1}>
                {title}
              </Text>
            )
          }
        />
        {onRename && (
          <Appbar.Action icon="pencil" onPress={() => setRenameOpen(true)} />
        )}
        {onDelete && (
          <Appbar.Action icon="delete" onPress={onDelete} />
        )}
      </Appbar.Header>
      {/* Renameモーダル */}
      <Portal>
        <Dialog visible={renameOpen} onDismiss={() => setRenameOpen(false)}>
          <Dialog.Title>タイトルを変更</Dialog.Title>
          <Dialog.Content>
            <TextInput
              value={renameTitle}
              onChangeText={setRenameTitle}
              autoFocus
              maxLength={40}
              style={{ backgroundColor: "#fff", fontSize: 18 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRenameOpen(false)}>キャンセル</Button>
            <Button
              onPress={() => {
                if (renameTitle.trim() && onRename) {
                  onRename(renameTitle.trim());
                  setRenameOpen(false);
                }
              }}
              disabled={!renameTitle.trim()}
            >変更</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
