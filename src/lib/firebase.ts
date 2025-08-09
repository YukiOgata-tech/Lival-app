// src/lib/firebase.ts
import { getApps, getApp, initializeApp } from 'firebase/app';
import {
  initializeAuth,
  inMemoryPersistence,
  GoogleAuthProvider,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);


// export const firebaseAuth = initializeAuth(app);

export const firebaseAuth = initializeAuth(app, {
  persistence: Constants.appOwnership === 'expo'
    ? inMemoryPersistence                    // Expo Go → ハング＆警告回避
    : getReactNativePersistence(AsyncStorage), // Dev Client / 本番 → 永続化
});


export const firestore = getFirestore(app);
export const storage   = getStorage(app);
export const analytics = getAnalytics(app);
export const functions = getFunctions(app);

// エミュレーターの部分
// if (__DEV__) {
//    // Firestore Emulator
//    connectFirestoreEmulator(firestore, 'localhost', 8080);
//    // Functions Emulator
//    connectFunctionsEmulator(functions, 'localhost', 5001);
// }

// Google プロバイダーを共通 util として export
export const googleProvider = new GoogleAuthProvider();


// Initialize the Gemini Developer API backend service
export const ai = getAI(app, { backend: new GoogleAIBackend() });
// Create a `GenerativeModel` instance with a model that supports your use case
export const aitoolsGemini = getGenerativeModel(ai, { model: "gemini-2.0-flash" });
