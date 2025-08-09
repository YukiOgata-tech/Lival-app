// src/components/session-related/EntranceFormHeader.tsx
import React from 'react';
import { View, Text, Platform } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

type Props = {
  title: string;
  onBack?: () => void;
};

export default function EntranceFormHeader({ title, onBack }: Props) {
  const navigation = useNavigation();
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View
      className="flex-row items-center mb-4"
      style={{
        height: 48,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* 戻るボタン（左端固定） */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' }}>
        <IconButton
          icon={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-left'}
          size={28}
          onPress={handleBack}
          accessibilityLabel="戻る"
          style={{ margin: 0 }}
        />
      </View>
      {/* タイトル（中央揃え） */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text className="text-xl font-bold" style={{ textAlign: 'center' }}>
          {title}
        </Text>
      </View>
      {/* 右端ダミーViewで左右バランス維持（タイトル中央寄せのため） */}
      <View style={{ width: 48 }} />
    </View>
  );
}
