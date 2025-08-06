// src/navigation/BottomTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import HomeScreen from '@/screens/HomeScreen';
//import AItoolsScreen from '@/screens/AItoolsScreen';
import SessionScreen from '@/screens/SessionScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AchievementScreen from '@/screens/AchievementScreen';

import AItoolsChatListScreen from '@/screens/AItools-related/AItoolsChatListScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6', // Tailwind "blue-500"
        tabBarInactiveTintColor: '#64748b', // Tailwind "slate-500"
        tabBarStyle: { height: 80, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
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
