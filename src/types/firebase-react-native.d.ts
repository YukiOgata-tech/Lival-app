// src/types/firebase-react-native.d.ts
declare module 'firebase/auth/react-native' {
  export * from 'firebase/auth';

  // getReactNativePersistence の簡易型
  import { Persistence } from 'firebase/auth';
  export function getReactNativePersistence(storage: any): Persistence;
}
