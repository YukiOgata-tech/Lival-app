// src/components/session-related/home/RoomTabs.tsx
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import RoomHomePanel from '@/components/session-related/home/RoomHomePanel';
import AIChatPanel from '@/components/session-related/chat/RoomAIChatPanel';
import GroupChatPanel from '@/components/session-related/chat/RoomGroupChatPanel';

const Tab = createMaterialTopTabNavigator();

export default function RoomTabs({ roomId, roomData }: { roomId: string; roomData: any }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tab.Screen
        name="RoomHome"
        options={{ tabBarLabel: 'ROOMホーム' }}
        children={() => <RoomHomePanel roomId={roomId} roomData={roomData} />}
      />
      <Tab.Screen
        name="AIChat"
        options={{ tabBarLabel: 'AIチャット' }}
        children={() => <AIChatPanel roomId={roomId} roomData={roomData} />}
      />
      <Tab.Screen
        name="GroupChat"
        options={{ tabBarLabel: 'グループチャット' }}
        children={() => <GroupChatPanel roomId={roomId} />}
      />
    </Tab.Navigator>
  );
}