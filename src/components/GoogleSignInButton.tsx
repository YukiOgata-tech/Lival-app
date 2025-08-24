import React, { useEffect } from 'react';
import { Button } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestore } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

/* .env からクライアント ID 取得 */
const IOS_ID = process.env.EXPO_PUBLIC_IOS_CLIENT_ID!;
const ANDROID_ID = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID!;
const WEB_ID = process.env.EXPO_PUBLIC_WEB_CLIENT_ID!;

/* Expo Go 判定 */
const isExpoGo = Constants.appOwnership === 'expo';

export default function GoogleSignInButton() {
  /* クライアント ID をプラットフォーム別に自動切替 */
  const clientId = isExpoGo
    ? WEB_ID
    : Platform.OS === 'ios'
    ? IOS_ID
    : ANDROID_ID;

  /*
   * Firebase 連携に特化した useIdTokenAuthRequest を使用。
   * これにより、id_token が確実に取得できる。
   */
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId,
  });

  /* ────── 認証成功ハンドラ ────── */
  useEffect(() => {
    (async () => {
      if (response?.type !== 'success') return;

      // response.params に id_token が含まれて返ってくる
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      const { user } = await signInWithCredential(firebaseAuth, credential);

      /* Firestore 初期登録 */
      const ref = doc(firestore, 'users', user.uid);
      if (!(await getDoc(ref)).exists()) {
        await setDoc(ref, {
          displayName: user.displayName ?? '',
          email: user.email,
          emailVerified: true,
          createdAt: serverTimestamp(),
          level: 1,
          xp: 0,
          groupSessionCount: 0,
          groupTotalMinutes: 0,
          individualSessionCount: 0,
          individualTotalMinutes: 0,
          currentMonsterId: 'monster-00',
        });
      }
    })();
  }, [response]);

  /* ────── UI ────── */
  return (
    <Button
      mode="outlined"
      icon="google"
      disabled={!request}
      onPress={() => promptAsync()}
      className="mt-4"
    >
      Google で続ける
    </Button>
  );
}