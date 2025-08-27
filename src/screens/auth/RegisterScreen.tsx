import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { callCallable } from '@/lib/functionsCallable';
import { useNavigation } from '@react-navigation/native';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { authErrorJa } from '@/lib/firebaseErrors';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';

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

  const lottieRef = useRef<LottieView>(null); // LottieView の ref を追加
  const [lottiePlayCount, setLottiePlayCount] = useState(0); // 再生回数を管理するstate

  useEffect(() => {
    // コンポーネントがマウントされたときにアニメーションを再生開始
    if (lottieRef.current) {
      lottieRef.current.play();
    }
  }, []); // 空の依存配列で一度だけ実行

  const handleLottieAnimationFinish = () => {
    setLottiePlayCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount < 3) {
        // 3回未満なら再度再生
        lottieRef.current?.play();
      }
      return newCount;
    });
  };

  const onSubmit = async ({ email, password, displayName }: Form) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await sendEmailVerification(cred.user);
      await updateProfile(cred.user, { displayName });
      // トークンを最新化
      await firebaseAuth.currentUser?.getIdToken(true);

      // Functions: ユーザーデータ初期化（モバイル用スキーマ）
      try {
        await callCallable('initializeUserData', { platform: 'mobile' });
      }
      catch (err) { console.warn('[register] initializeUserData failed', err); }

      navigation.reset({ index: 0, routes: [{ name: 'VerifyEmail' as never }] });
    } catch (e: any) {
      setAuthError(authErrorJa[e.code] ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#A5B4FC', '#C7D2FE', '#E0E7FF']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <Image
              source={require('@assets/images/header-Lival.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <BlurView intensity={80} tint="light" style={styles.blurContainer}>
            <Controller
              control={control} name="displayName"
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    label="ユーザー名" value={value} onChangeText={onChange} error={!!errors.displayName}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!errors.displayName}>{errors.displayName?.message}</HelperText>
                </>
              )}
            />
            <Controller
              control={control} name="email"
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    label="Email" value={value} keyboardType="email-address" autoCapitalize="none" onChangeText={onChange} error={!!errors.email}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!errors.email}>{errors.email?.message}</HelperText>
                </>
              )}
            />
            <Controller
              control={control} name="password"
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    label="Password" secureTextEntry value={value} onChangeText={onChange} error={!!errors.password}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!errors.password}>{errors.password?.message}</HelperText>
                </>
              )}
            />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <Button
              mode="contained" onPress={handleSubmit(onSubmit)} disabled={loading}
              style={styles.button}
            >
              {loading ? <ActivityIndicator animating size="small" color="white" /> : '新規登録'}
            </Button>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.divider} />
            </View>
            <GoogleSignInButton />
          </BlurView>

          <Button onPress={() => navigation.navigate('Login' as never)} style={styles.switchButton}>
            <Text style={styles.switchButtonText}>すでにアカウントをお持ちですか？</Text>
          </Button>

          <View style={styles.lottieContainer}>
            <LottieView
              ref={lottieRef} // ref を設定
              source={require('@assets/lotties/loading-animation.json')}
              autoPlay={false} // autoPlay を false に変更
              loop={false} // loop を false に変更
              onAnimationFinish={handleLottieAnimationFinish} // コールバックを追加
              style={styles.lottie}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: { 
    width: 256, 
    height: 80, 
  },
  blurContainer: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  authError: {
    color: '#B91C1C',
    marginVertical: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 16,
    paddingVertical: 4,
    backgroundColor: '#4F46E5',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#4B5563',
  },
  switchButton: {
    marginTop: 24,
  },
  switchButtonText: {
    color: 'white',
  },
  lottieContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  lottie: { 
    width: 120, 
    height: 120, 
  },
});
