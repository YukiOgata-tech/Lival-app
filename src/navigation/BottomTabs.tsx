// src/navigation/BottomTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';

import EduAIThreadsScreen from '@/screens/eduAI/EduAIThreadsScreen';
import ChatRouterScreen   from '@/screens/eduAI/ChatRouterScreen';
import TutorChatScreen from '@/screens/eduAI/TutorChatScreen';
import CounselorChatScreen from '@/screens/eduAI/CounselorChatScreen';
import PlannerChatScreen from '@/screens/eduAI/PlannerChatScreen';

import SessionScreen from '@/screens/SessionScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AchievementScreen from '@/screens/AchievementScreen';

import AItoolsChatListScreen from '@/screens/AItools-related/AItoolsChatListScreen';


export type EduAIStackParamList = {
  EduAIThreads: undefined;
  EduAIRouter: { threadId?: string; presetAgent?: 'auto'|'tutor'|'counselor'|'planner'|null };
  EduAITutor:     { threadId: string };
  EduAICounselor: { threadId: string };
  EduAIPlanner:   { threadId: string };
};
export type TabsParamList = {
  Home: NavigatorScreenParams<EduAIStackParamList>;
  // 以下は必要に応じて
  AItool: undefined;
  Session: undefined;
  Achievement: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator();


export default function BottomTabs() {
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
      <Tab.Screen
        name="Home"
        component={EduAIThreadsScreen}
        options={{ tabBarLabel: 'Lival AI',
                   tabBarIcon: ({ color, size }) => (
                     <MaterialCommunityIcons name="home" size={size} color={color} />
                   ),
                 }}
      />
      <Tab.Screen
        name="AItool"
        component={AItoolsChatListScreen}
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
