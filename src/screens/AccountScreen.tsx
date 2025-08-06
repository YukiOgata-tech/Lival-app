// src/screens/settings/AccountScreen.tsx
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

export default function AccountScreen() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-xl mb-4">アカウント設定</Text>
      <Button mode="outlined" onPress={() => signOut(firebaseAuth)}>
        ログアウト
      </Button>
    </View>
  );
}
