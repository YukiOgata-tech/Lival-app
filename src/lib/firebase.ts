// src/lib/firebase.ts
import { getApps, getApp, initializeApp } from 'firebase/app';
import {
  initializeAuth,
  inMemoryPersistence,
  GoogleAuthProvider,
  signInAnonymously,
  getAuth,
  getReactNativePersistence,
  type Auth,
  onAuthStateChanged,
} from 'firebase/auth';

import { getFirestore as _getFirestore, initializeFirestore, setLogLevel, memoryLocalCache, } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ★ RN/Expo では getAuth() より先に initializeAuth() を必ず呼ぶ
const persistence =
  Constants.appOwnership === 'expo'
    ? inMemoryPersistence
    : getReactNativePersistence(AsyncStorage);

// Fast Refresh 対応: initializeAuth の多重初期化を防ぐ
const globalAny = globalThis as unknown as { __auth?: Auth };
export const firebaseAuth: Auth =
  globalAny.__auth ?? (globalAny.__auth = initializeAuth(app, { persistence }));


// Firestore / Storage / Functions
export const firestore = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
});
export const storage   = getStorage(app);
const functionsRegion = process.env.EXPO_PUBLIC_FUNCTIONS_REGION || 'asia-northeast1';
export const functions = getFunctions(app, functionsRegion);
if (__DEV__) setLogLevel('error');

// 開発時: 環境変数で Functions エミュレーターに接続
const useFnsEmu = process.env.EXPO_PUBLIC_USE_FUNCTIONS_EMULATOR === '1';
if (useFnsEmu) {
  const host = process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST
    ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  const port = Number(process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT ?? '5001');
  try { connectFunctionsEmulator(functions, host, port); } catch {}
}

export let analytics: any = null;

// 匿名サインイン: onCall を呼ぶ前に 1 回だけ保証
let _signing: Promise<void> | null = null;
export async function ensureSignedIn() {
  const auth = firebaseAuth;
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true).catch(()=>{});
    return;
  }
  if (_signing) return _signing;
  _signing = (async () => {
    await signInAnonymously(auth);
    await auth.currentUser!.getIdToken(true);
  })().finally(() => (_signing = null));
  return _signing;
}

// Google プロバイダーを共通 util として export
export const googleProvider = new GoogleAuthProvider();
// Initialize the Gemini Developer API backend service
export const ai = getAI(app, { backend: new GoogleAIBackend() });
// Create a `GenerativeModel` instance with a model that supports your use case
export const aitoolsGemini = getGenerativeModel(ai, { model: "gemini-2.0-flash" });
