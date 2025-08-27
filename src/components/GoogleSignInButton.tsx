import React, { useEffect } from 'react';
import { Button } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { callCallable } from '@/lib/functionsCallable';

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
      await signInWithCredential(firebaseAuth, credential);
      // トークンが確実に付与されるまで更新
      await firebaseAuth.currentUser?.getIdToken(true);
      // 既存ユーザーは migrate、不足時は initialize（リージョン自動フォールバック付き）
      try { await callCallable('migrateExistingUsers'); }
      catch (err) {
        try {
          // 念のため再度トークン更新後に初期化を試行
          await firebaseAuth.currentUser?.getIdToken(true);
          await callCallable('initializeUserData', { platform: 'mobile' });
        }
        catch (e2) { console.warn('[google-signin] initializeUserData fallback failed', e2); }
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
