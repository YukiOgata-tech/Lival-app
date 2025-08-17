// src/components/eduAI-related/tutorAI/TutorChatInput.tsx
import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, Image, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, ImageIcon, SendHorizontal } from 'lucide-react-native';

export type TutorSendPayload = { text: string; images: string[] }; // imagesは dataURL(base64)

type Props = {
  value: string;
  onChange: (t: string) => void;
  onSend: (p: TutorSendPayload) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  maxImages?: number; // 既定=4枚
};

export default function TutorChatInput({
  value,
  onChange,
  onSend,
  placeholder,
  autoFocus,
  disabled,
  maxImages = 4,
}: Props) {
  const insets = useSafeAreaInsets();
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [b64s, setB64s] = useState<string[]>([]);

  const sendDisabled = !!disabled || (value.trim().length === 0 && b64s.length === 0);

  const doSend = () => {
    if (sendDisabled) return;
    onSend({ text: value.trim(), images: b64s });
    onChange('');
    setThumbs([]);
    setB64s([]);
  };

  /** 画像→dataURL(base64) 変換（高速・省メモリ用に縮小圧縮） */
  const pushAsset = async (uri: string, inlineBase64?: string | null) => {
  try {
    // base64 が来ていればそれを使い、無ければ生成
    let base64 = inlineBase64 ?? null;

    if (!base64) {
      const out = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      base64 = out.base64 ?? null;
      uri = out.uri ?? uri;
    }

    if (!base64) {
      Alert.alert('画像の処理に失敗しました', 'base64 の生成に失敗しました。');
      return;
    }

    const dataUrl = `data:image/jpeg;base64,${base64}`;
    setThumbs((prev) => [...prev, uri].slice(0, maxImages));
    setB64s((prev) => [...prev, dataUrl].slice(0, maxImages));
  } catch (e: any) {
    Alert.alert('画像の処理に失敗しました', String(e?.message ?? e));
  }
};

  const removeAt = (i: number) => {
    setThumbs((x) => x.filter((_, idx) => idx !== i));
    setB64s((x) => x.filter((_, idx) => idx !== i));
  };

  /** 写真ライブラリ */
  const pickFromLibrary = async () => {
    if (b64s.length >= maxImages) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('写真へのアクセスを許可してください');
      return;
    }

    try {
      // 新API: mediaTypes は ImagePicker.MediaType またはその配列
      const opts: any = {
        quality: 0.85,
        base64: true,
        selectionLimit: 1,
      };
      if ((ImagePicker as any).MediaType) {
        // 新版
        // @ts-ignore (型差異を吸収)
        opts.mediaTypes = [(ImagePicker as any).MediaType.image];
      } else {
        // 旧版（互換）
        // eslint-disable-next-line deprecation/deprecation
        opts.mediaTypes = ImagePicker.MediaTypeOptions.Images;
      }

      const res = await ImagePicker.launchImageLibraryAsync(opts);
      if (!res || res.canceled || !res.assets?.length) return;

      const asset =
        res.assets.find((a: any) => (a.type ?? 'image').startsWith('image')) ?? res.assets[0];

      await pushAsset(asset.uri, asset.base64);
    } catch (e: any) {
      Alert.alert('アルバムを開けませんでした', String(e?.message ?? e));
    }
  };

  /** カメラ（シミュレータ等では自動でライブラリにフォールバック） */
  const takePhoto = async () => {
    if (b64s.length >= maxImages) return;

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('カメラへのアクセスを許可してください');
      return;
    }

    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.9, base64: true });
      if (!res || res.canceled || !res.assets?.length) return;
      await pushAsset(res.assets[0].uri, res.assets[0].base64);
    } catch (e: any) {
      const msg = String(e?.message || e).toLowerCase();
      // iOSシミュレータなどカメラ非搭載端末
      if (msg.includes('not available') || msg.includes('no camera') || msg.includes('unavailable')) {
        Alert.alert('この端末ではカメラが使えません', '代わりにアルバムを開きます。');
        return pickFromLibrary();
      }
      Alert.alert('カメラ起動に失敗しました', String(e?.message ?? e));
    }
  };

  return (
    <View
      className="border-t border-white/10 bg-white/5"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {/* 添付プレビュー */}
      {thumbs.length ? (
        <View className="px-4 pt-2 flex-row gap-8 flex-wrap">
          {thumbs.map((u, i) => (
            <View key={`${u}-${i}`} className="relative">
              <Image source={{ uri: u }} style={{ width: 78, height: 78, borderRadius: 10 }} />
              <Pressable
                onPress={() => removeAt(i)}
                className="absolute -top-2 -right-2 bg-black/60 border border-white/30 rounded-full px-2 py-1"
                accessibilityRole="button"
                accessibilityLabel="画像を削除"
              >
                <Text className="text-white text-[11px]">×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* 入力行 */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={takePhoto}
          className="p-2 rounded-xl bg-white/10 border border-white/20 mr-2"
          accessibilityRole="button"
          accessibilityLabel="カメラで撮影"
        >
          <Camera size={18} color="#E5E7EB" />
        </Pressable>

        <Pressable
          onPress={pickFromLibrary}
          className="p-2 rounded-xl bg-white/10 border border-white/20 mr-2"
          accessibilityRole="button"
          accessibilityLabel="アルバムから選択"
        >
          <ImageIcon size={18} color="#E5E7EB" />
        </Pressable>

        <TextInput
          className="flex-1 rounded-xl px-3 py-2 bg-white/8 border border-white/15 text-white"
          placeholder={
            placeholder ?? '質問や定理の説明・証明依頼もOK（画像だけでも可）'
          }
          placeholderTextColor="rgba(255,255,255,0.55)"
          value={value}
          onChangeText={onChange}
          multiline={false}
          returnKeyType="send"
          enablesReturnKeyAutomatically
          onSubmitEditing={doSend}
          blurOnSubmit={false}
          autoFocus={autoFocus}
          keyboardAppearance="dark"
          selectionColor="rgba(16,185,129,0.9)"
          autoCorrect={false}
          spellCheck={false}
        />

        <Pressable
          onPress={doSend}
          disabled={sendDisabled}
          className={`ml-2 px-3.5 py-2 rounded-xl border ${
            sendDisabled
              ? 'bg-white/10 border-white/15'
              : 'bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-400/40'
          }`}
          accessibilityRole="button"
          accessibilityLabel="送信"
        >
          <SendHorizontal size={18} color={sendDisabled ? '#9CA3AF' : '#0b1220'} />
        </Pressable>
      </View>
    </View>
  );
}
