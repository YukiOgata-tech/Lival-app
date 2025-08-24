import React, { useState } from 'react';
import { View, Alert, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { authErrorJa } from '@/lib/firebaseErrors';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';

const schema = z.object({
  email: z.string().email({ message: 'メール形式が不正です' }),
  password: z.string().min(6, { message: '6文字以上で入力してください' }),
});
export type LoginForm = z.infer<typeof schema>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList, 'Login'>>();
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(schema),
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const onSubmit = async ({ email, password }: LoginForm) => {
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await user.reload();
      if (!user.emailVerified) {
        await signOut(firebaseAuth);
        Alert.alert('メール確認が必要です', '送信済みの確認メール内リンクをタップしてください。');
      }
    } catch (e: any) {
      setAuthError(authErrorJa[e.code] ?? 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#E0E7FF', '#C7D2FE', '#A5B4FC']} style={styles.container}>
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
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    label="Email"
                    value={value} onChangeText={onChange} error={!!errors.email}
                    style={styles.input}
                    keyboardType="email-address" autoCapitalize="none"
                  />
                  <HelperText type="error" visible={!!errors.email}>{errors.email?.message}</HelperText>
                </>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    label="Password"
                    secureTextEntry value={value} onChangeText={onChange} error={!!errors.password}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!errors.password}>{errors.password?.message}</HelperText>
                </>
              )}
            />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              style={styles.button}
            >
              {loading ? <ActivityIndicator animating size="small" color="white" /> : 'ログイン'}
            </Button>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.divider} />
            </View>
            <GoogleSignInButton />
          </BlurView>

          <Button onPress={() => navigation.navigate('Register')} style={styles.switchButton}>
            <Text style={styles.switchButtonText}>アカウント作成はこちら</Text>
          </Button>

          <View style={styles.lottieContainer}>
            <LottieView
              source={require('@assets/lotties/loading-animation.json')}
              autoPlay
              loop
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
