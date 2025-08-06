import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '@/providers/AuthProvider';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

export default function VerifyEmailScreen() {
  const { user } = useAuth();          // user!.reload() で最新状態を取得
  const navigation = useNavigation();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const resendMail = async () => {
    setSending(true);
    await sendEmailVerification(user!);
    Alert.alert('確認メールを再送しました');
    setSending(false);
  };

  const checkVerified = async () => {
    setChecking(true);
    await user!.reload();              // emailVerified を最新に
    await new Promise((r) => setTimeout(r, 300)); // UI 更新待ち
    if (user!.emailVerified) {
    // ✅ 下位スタックをクリアしてタブ画面へ
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' as never }], // AppRouter で BottomTabs に割り当てた名前
    });
    return;
  }
  Alert.alert('まだ確認が完了していません');
    setChecking(false);
  };

  return (
    <View className="flex-1 items-center justify-center px-8 bg-white dark:bg-neutral-900">
      <Text variant="headlineMedium" className="mb-4 text-center">
        メールアドレスを確認してください
      </Text>
      <Text className="text-center mb-8">
        送信された確認メール内のリンクをタップしたあと、
        「確認が完了した」を押してください。
      </Text>

      <Button mode="contained" onPress={checkVerified} disabled={checking}>
        {checking ? <ActivityIndicator size="small" /> : '確認が完了した'}
      </Button>

      <Button
        mode="outlined"
        onPress={resendMail}
        disabled={sending}
        className="mt-4"
      >
        {sending ? <ActivityIndicator size="small" /> : '確認メールを再送'}
      </Button>

      <Button onPress={() => signOut(firebaseAuth)} className="mt-8">
        ログアウト
      </Button>
    </View>
  );
}
