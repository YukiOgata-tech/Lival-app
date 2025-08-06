// src/navigation/Approuter.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme as DefaultTheme} from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import BottomTabs from '@/navigation/BottomTabs';

/* profile-related */
import EditProfileScreen from '@/screens/profile-related/EditProfileScreen';
import FriendListScreen from '@/screens/profile-related/FriendListScreen';
import UserSearchScreen from '@/screens/profile-related/UserSearchScreen';
import UserProfileScreen from '@/screens/profile-related/UserProfileScreen';
import FriendInboxScreen from '@/screens/profile-related/FriendInboxScreen';

/* AItools-related */
import AItoolsOCRChatScreen from '@/screens/AItools-related/AItoolsOCRChatScreen';
import AItoolsTranslationChatScreen from '@/screens/AItools-related/AItoolsTranslationChatScreen';
//import AItoolsChatListScreen from '@/screens/AItools-related/AItoolsChatListScreen';

/* auth */
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import VerifyEmailScreen from '@/screens/auth/VerifyEmailScreen';

import Splash from '@/screens/Splash';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

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

          {/* ─── AIツール系 ─── */}
          <Stack.Screen name="AItoolsOCRChatScreen" component={AItoolsOCRChatScreen} />
          <Stack.Screen name="AItoolsTranslationChatScreen" component={AItoolsTranslationChatScreen} />


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
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
