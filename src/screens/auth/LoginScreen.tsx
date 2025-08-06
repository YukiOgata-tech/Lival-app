// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import {
  useNavigation,
  StackActions,
  CommonActions,
  type NavigationProp,
} from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { authErrorJa } from '@/lib/firebaseErrors';

// ---------------------------------------------------------------------------
// Validation Schema
// ---------------------------------------------------------------------------
const schema = z.object({
  email: z.string().email({ message: 'メール形式が不正です' }),
  password: z.string().min(6, { message: '6文字以上で入力してください' }),
});
export type LoginForm = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LoginScreen() {
  // 型安全ナビ
  const navigation =
    useNavigation<NavigationProp<RootStackParamList, 'Login'>>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(schema),
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // -------------------------------------------------------------------------
  // Helpers
  /**
   * どの階層にいてもルート Stack (Main を持つ方) まで遡って置き換える
   */
  const replaceToMain = () => {
    let parent: any = navigation;
    // 最上位 NavigationContainer 直下に "Main" がある
    while (parent && !parent.getState().routeNames.includes('Main')) {
      parent = parent.getParent();
    }
    (parent ?? navigation).dispatch(StackActions.replace('Main'));
  };

  // Submit
  const onSubmit = async ({ email, password }: LoginForm) => {
    try {
      setLoading(true);

      const { user } = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password,
      );
      await user.reload();
      console.log('verified?', user.emailVerified);

      if (!user.emailVerified) {
        await signOut(firebaseAuth);
        Alert.alert(
          'メール確認が必要です',
          '送信済みの確認メール内リンクをタップしてください。',
        );
        return;
      }
      //navigation.replace('Main');

      return;
    } catch (e: any) {
      console.error(e);
      setAuthError(authErrorJa[e.code] ?? 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <View className="flex-1 justify-center px-8 bg-white dark:bg-neutral-900">
      <Text variant="headlineLarge" className="text-center mb-8">
        ログイン
      </Text>

      {/* Email */}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              error={!!errors.email}
              className="mb-1"
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email?.message}
            </HelperText>
          </>
        )}
      />

      {/* Password */}
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="Password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              error={!!errors.password}
              className="mb-1"
            />
            <HelperText type="error" visible={!!errors.password}>
              {errors.password?.message}
            </HelperText>
          </>
        )}
      />

      {/* Auth error */}
      {authError ? (
        <Text className="text-red-600 mb-2 text-center">{authError}</Text>
      ) : null}

      {/* Submit */}
      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
        className="mt-2"
      >
        {loading ? <ActivityIndicator animating size="small" /> : 'ログイン'}
      </Button>

      {/* Google Sign-In (optional) */}
      <GoogleSignInButton />

      {/* Navigation to Register */}
      <Button onPress={() => navigation.navigate('Register')} className="mt-2">
        アカウント作成はこちら
      </Button>
    </View>
  );
}
