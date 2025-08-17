// src/navigation/types.ts
// ------- ルートスタック (AppRouter.tsx の Stack) -------
export type RootStackParamList = {
  /** BottomTabs をネストしたアプリ本体 */
  Main: undefined;
  /** 認証系 */
  Login: undefined;
  Register: undefined;
  VerifyEmail: undefined;

  /** プロフィール関連 (Optional) */
  EditProfile?: undefined;
  FriendList?: undefined;
  UserSearch?: undefined;
};

// ------- BottomTabs -------
export type BottomTabParamList = {
  Home: undefined;
  AItools: undefined;
  Session: undefined;
  Achievements: undefined;
  Profile: undefined;
};


