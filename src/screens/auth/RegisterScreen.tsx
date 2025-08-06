// src/screens/auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestore } from '@/lib/firebase';
import { useNavigation } from '@react-navigation/native';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { authErrorJa } from '@/lib/firebaseErrors';

const schema = z.object({
  displayName: z.string().min(2, { message: '2文字以上で入力してください' }),
  email: z.string().email({ message: 'メール形式が不正です' }),
  password: z.string().min(6, { message: '6文字以上で入力してください' }),
});
type Form = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: { email: '', password: '', displayName: '' },
    resolver: zodResolver(schema),
  });
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const onSubmit = async ({ email, password, displayName }: Form) => {
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password,
      );

      // Email verification
      await sendEmailVerification(cred.user);

      // Auth profile
      await updateProfile(cred.user, { displayName });

      // Firestore users/{uid}
      await setDoc(doc(firestore, 'users', cred.user.uid), {
        displayName,
        email: cred.user.email,
        emailVerified: false,  
        level: 1,
        xp: 0,
        groupSessionCount: 0,
        groupSessionTotalMinutes: 0,
        individualSessionCount: 0,
        individualTotalMinutes: 0,
        currentMonsterId: 'monster-00',
        createdAt: serverTimestamp(),
      });
      // 確認メール画面へ
      navigation.reset({
  index: 0,
  routes: [{ name: 'VerifyEmail' as never }],
});
    } catch (e: any) {
      setAuthError(authErrorJa[e.code] ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white dark:bg-neutral-900">
      <Text variant="headlineLarge" className="text-center mb-8">アカウント作成</Text>

      {/* displayName */}
      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="ユーザー名"
              value={value}
              onChangeText={onChange}
              error={!!errors.displayName}
              className="mb-1"
            />
            <HelperText type="error" visible={!!errors.displayName}>
              {errors.displayName?.message}
            </HelperText>
          </>
        )}
      />

      {/* email */}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="Email"
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
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

      {/* password */}
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
      {authError ? <Text className="text-red-600 mb-2">{authError}</Text> : null}

      {/* Submit */}
      <Button mode="contained" onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator animating size="small" /> : '新規登録'}
      </Button>

      {/* Google */}
      <GoogleSignInButton />

      {/* Navigation */}
      <Button onPress={() => navigation.navigate('Login' as never)} className="mt-2">
        すでにアカウントをお持ちですか？
      </Button>
    </View>
  );
}
