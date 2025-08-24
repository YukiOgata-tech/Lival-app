// src/navigation/Approuter.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme as DefaultTheme} from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import NotificationsProvider from '@/providers/NotificationsProvider';
import { createNavigationContainerRef } from '@react-navigation/native';
import BottomTabs from '@/navigation/BottomTabs';

/* profile-related */
import EditProfileScreen from '@/screens/profile-related/EditProfileScreen';
import FriendListScreen from '@/screens/profile-related/FriendListScreen';
import UserSearchScreen from '@/screens/profile-related/UserSearchScreen';
import UserProfileScreen from '@/screens/profile-related/UserProfileScreen';
import FriendInboxScreen from '@/screens/profile-related/FriendInboxScreen';
import AccountScreen from '@/screens/AccountScreen';

/* AItools-related */
import AItoolsOCRChatScreen from '@/screens/AItools-related/AItoolsOCRChatScreen';
import AItoolsTranslationChatScreen from '@/screens/AItools-related/AItoolsTranslationChatScreen';

/* session-related */
import GroupSessionEntrance from '@/screens/session-related/GroupSessionEntrance';
import RoomCreateForm from '@/screens/session-related/RoomCreateForm';
import RoomJoinForm from '@/screens/session-related/RoomJoinForm';
import GroupSessionRoom from '@/screens/session-related/GroupSessionRoom';
import RoomResultScreen from '@/screens/session-related/RoomResultScreen';

/* eduAI-related */
import ChatRouterScreen   from '@/screens/eduAI/ChatRouterScreen';
import CounselorChatScreen from '@/screens/eduAI/CounselorChatScreen';
import PlannerChatScreen from '@/screens/eduAI/PlannerChatScreen';
import TutorChatScreen from '@/screens/eduAI/TutorChatScreen';
import UnifiedThreadsScreen from '@/screens/eduAI/UnifiedThreadsScreen';

/* auth */
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import VerifyEmailScreen from '@/screens/auth/VerifyEmailScreen';

import Splash from '@/screens/Splash';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const navigationRef = createNavigationContainerRef();

/* --------------------------- Root Navigator --------------------------- */
function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;

  return (
    <Stack.Navigator
      key={user ? 'auth' : 'guest'}
      initialRouteName={user ? 'Main' : 'Login'} 
      screenOptions={{ headerShown: false }}
    >
      {user ? (
        <>
          {/* ─── メインタブ ─── */}
          <Stack.Screen name="Main" component={BottomTabs} />

          {/* ─── プロフィール系 ─── */}
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="FriendList" component={FriendListScreen} />
          <Stack.Screen name="UserSearch" component={UserSearchScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="FriendInbox" component={FriendInboxScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />

          {/* ─── AIツール系 ─── */}
          <Stack.Screen name="AItoolsOCRChatScreen" component={AItoolsOCRChatScreen} />
          <Stack.Screen name="AItoolsTranslationChatScreen" component={AItoolsTranslationChatScreen} />

          {/* ─── セッション系 ─── */}
          <Stack.Screen name="GroupSessionEntrance" component={GroupSessionEntrance} />
          <Stack.Screen name="RoomCreateForm" component={RoomCreateForm} />
          <Stack.Screen name="RoomJoinForm" component={RoomJoinForm} />
          <Stack.Screen name="GroupSessionRoom" component={GroupSessionRoom} />
          <Stack.Screen name="RoomResult" component={RoomResultScreen} options={{ headerShown: false }} />

          {/* ─── EduAI 関連 ─── */}
          {/* <Stack.Screen name="EduAIThreads"   component={EduAIThreadsScreen} /> */}
          <Stack.Screen name="EduAIRouter"    component={ChatRouterScreen} />
          <Stack.Screen name="EduAITutor"     component={TutorChatScreen} />
          <Stack.Screen name="EduAICounselor" component={CounselorChatScreen} />
          <Stack.Screen name="EduAIPlanner"   component={PlannerChatScreen} />
          <Stack.Screen name="UnifiedThreads" component={UnifiedThreadsScreen} />



        </>
      ) : (
        <>
          {/* ─── 認証系 ─── */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

/* ---------------------------- Custom Theme ----------------------------- */
const customTheme = {
  ...DefaultTheme,
  fonts: {
    ...DefaultTheme.fonts,
    bodyLarge: { ...DefaultTheme.fonts.bodyLarge, fontFamily: 'NotoSansJP' },
    bodyMedium: { ...DefaultTheme.fonts.bodyMedium, fontFamily: 'NotoSansJP' },
    bodySmall: { ...DefaultTheme.fonts.bodySmall, fontFamily: 'NotoSansJP' },
    titleLarge: { ...DefaultTheme.fonts.titleLarge, fontFamily: 'NotoSansJP' },
    titleMedium: { ...DefaultTheme.fonts.titleMedium, fontFamily: 'NotoSansJP' },
    titleSmall: { ...DefaultTheme.fonts.titleSmall, fontFamily: 'NotoSansJP' },
    labelLarge: { ...DefaultTheme.fonts.labelLarge, fontFamily: 'NotoSansJP' },
    labelMedium: { ...DefaultTheme.fonts.labelMedium, fontFamily: 'NotoSansJP' },
    labelSmall: { ...DefaultTheme.fonts.labelSmall, fontFamily: 'NotoSansJP' },
    // 順次追加
  }
};

/* ---------------------------- App Router ----------------------------- */
export default function AppRouter() {

  const [fontsLoaded] = useFonts({
    'NotoSansJP': require('../../assets/fonts/NotoSansJP-VariableFont_wght.ttf'),
    'KosugiMaru': require('../../assets/fonts/KosugiMaru-Regular.ttf'),
    'MPLUSRounded': require('../../assets/fonts/MPLUSRounded1c-Medium.ttf'),
    'Stick': require('../../assets/fonts/Stick-Regular.ttf'),
    'PressStart2P': require('../../assets/fonts/PressStart2P-Regular.ttf'),
    'Inter': require('../../assets/fonts/Inter-Variable.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <NotificationsProvider
            onNavigateRoomResult={(roomId) => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('RoomResult' as never, { roomId } as never);
              }
            }}
            onNavigateRoomInvite={(roomId) => {
              if (navigationRef.isReady()) {
                // 招待タップ時 → 参加画面へ（ROOM ID を事前入力するなら params 名を合わせて）
                navigationRef.navigate('RoomJoinForm' as never, { prefillRoomId: roomId } as never);
              }
            }}
          >
            <GestureHandlerRootView style={{ flex: 1 }}>

            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
            </NavigationContainer>
            </GestureHandlerRootView>
            </NotificationsProvider>
          </QueryClientProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
