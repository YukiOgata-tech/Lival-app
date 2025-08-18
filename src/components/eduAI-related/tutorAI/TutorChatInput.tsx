// src/components/eduAI-related/tutorAI/TutorChatInput.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, Send } from 'lucide-react-native';

type Props = {
  value: string;
  onChange: (t: string) => void;
  onSend: (p: { text: string; images: string[] }) => void;
  placeholder?: string;
  maxImages?: number;
};

/** 新旧API両対応: MediaType or MediaTypeOptions を返す */
function getImagesMediaType(): any {
  const ip: any = ImagePicker;
  return ip?.MediaType?.Images ?? ip?.MediaTypeOptions?.Images ?? 'Images';
}


export default function TutorChatInput({
  value,
  onChange,
  onSend,
  placeholder = '質問や定理の説明・証明依頼もOK（画像だけでも可）',
  maxImages = 4,
}: Props) {
  const [b64s, setB64s] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const addB64 = useCallback((b64?: string | null) => {
    if (!b64) return;
    setB64s(prev => (prev.length >= maxImages ? prev : [...prev, `data:image/jpeg;base64,${b64}`]));
  }, [maxImages]);

  /** 画像ピッカー（アルバム） */
  const pickFromLibrary = useCallback(async () => {
    if (b64s.length >= maxImages) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('アルバムにアクセスできません', '写真へのアクセスを許可してください。');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getImagesMediaType(),  // ★ここがポイント
        allowsMultipleSelection: false,
        base64: true,
        quality: 0.85,
        exif: false,
      });
      if (res.canceled || !res.assets?.length) return;
      addB64(res.assets[0]?.base64 ?? null);
    } catch (e: any) {
      Alert.alert('アルバムを開けませんでした', String(e?.message ?? e));
    }
  }, [b64s.length, maxImages, addB64]);

  /** カメラ（シミュレータは自動でライブラリにフォールバック） */
  const takePhoto = useCallback(async () => {
    if (b64s.length >= maxImages) return;
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('カメラにアクセスできません', 'カメラのアクセスを許可してください。');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.length) return;
      addB64(res.assets[0]?.base64 ?? null);
    } catch (e: any) {
      const msg = String(e?.message ?? e).toLowerCase();
      // iOSシミュレータ等：カメラ非対応ならライブラリに自動フォールバック
      if (msg.includes('not available on simulator') || msg.includes('no camera')) {
        await pickFromLibrary();
        return;
      }
      Alert.alert('カメラを起動できませんでした', String(e?.message ?? e));
    }
  }, [b64s.length, maxImages, addB64, pickFromLibrary]);

  const canSend = useMemo(() => (value?.trim()?.length ?? 0) > 0 || b64s.length > 0, [value, b64s.length]);

  const doSend = useCallback(() => {
    if (!canSend) return;
    const text = value.trim();
    const imgs = b64s.slice();
    setB64s([]);
    onChange('');
    Keyboard.dismiss();
    onSend({ text, images: imgs });
  }, [canSend, value, b64s, onSend, onChange]);

  return (
    <View className="px-3 pb-6 pt-2 bg-transparent">
      <View className="flex-row items-center rounded-2xl bg-white/10 border border-white/15">
        {/* 左: 画像ボタン群 */}
        <Pressable onPress={pickFromLibrary} className="px-3 py-3">
          <ImagePlus size={22} color="#cbd5e1" />
        </Pressable>
        <Pressable onPress={takePhoto} className="px-1 py-3 pr-2">
          <Camera size={22} color="#cbd5e1" />
        </Pressable>

        {/* 入力 */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(203,213,225,0.6)"
          multiline
          onSubmitEditing={doSend}
          blurOnSubmit={false}
          returnKeyType="send"
          className="flex-1 text-[16px] text-white py-2 px-2"
        />

        {/* 送信 */}
        <Pressable
          onPress={doSend}
          disabled={!canSend}
          className="px-3 py-3 opacity-100"
          style={{ opacity: canSend ? 1 : 0.4 }}
        >
          <Send size={22} color="#a7f3d0" />
        </Pressable>
      </View>

      {/* 簡易の選択済み枚数表示（UIはお好みで） */}
      {b64s.length > 0 && (
        <View className="px-2 pt-1">
          <View className="self-start rounded-full bg-white/10 px-2 py-1">
            <View className="flex-row">
              {/* 枚数だけ示す（画像プレビューはここでは持たない） */}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// iOS シミュレータ判定の超簡易版（必要十分）
function DeviceHasCameraSimulator() {
  return !(Platform.OS === 'ios' && !process.env.EXPO_OS); // 実機なら true 相当で通る
}
