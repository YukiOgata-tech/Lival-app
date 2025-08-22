// src/navigation/BottomTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import HomePlaceholderScreen from '@/screens/HomePlaceholderScreen';
import AItoolsChatListScreen from '@/screens/AItools-related/AItoolsChatListScreen';
import EduAIThreadsScreen from '@/screens/eduAI/EduAIThreadsScreen';
import UnifiedThreadsScreen from '@/screens/eduAI/UnifiedThreadsScreen';

import SessionScreen from '@/screens/SessionScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AchievementScreen from '@/screens/AchievementScreen';



export type EduAIStackParamList = {
  EduAIThreads: undefined;
  EduAIRouter: { threadId?: string; presetAgent?: 'auto'|'tutor'|'counselor'|'planner'|null };
  EduAITutor:     { threadId: string };
  EduAICounselor: { threadId: string };
  EduAIPlanner:   { threadId: string };
};
export type TabsParamList = {
  Home: NavigatorScreenParams<EduAIStackParamList>;
  AItool: undefined;
  Session: undefined;
  Achievement: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator();


export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { height: 80, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      {/* <Tab.Screen
        name="Home"
        component={EduAIThreadsScreen}
        options={{ tabBarLabel: 'Lival AI',
                   tabBarIcon: ({ color, size }) => (
                     <MaterialCommunityIcons name="home" size={size} color={color} />
                   ),
                 }}
      /> */}
      {/* <Tab.Screen
        name="AItool"
        component={AItoolsChatListScreen}
        options={{
          tabBarLabel: 'AIツール',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" size={size} color={color} />
          ),
        }}
      /> */}
      <Tab.Screen
        name="Home"
        component={HomePlaceholderScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AItool"
        component={UnifiedThreadsScreen}
        initialParams={{ initialLane: 'tool' }}
        options={{
          tabBarLabel: 'AIツール',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Session"
        component={SessionScreen}
        options={{
          tabBarLabel: 'セッション',
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Achievement"
        component={AchievementScreen}
        options={{
          tabBarLabel: '実績',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'プロフィール',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
