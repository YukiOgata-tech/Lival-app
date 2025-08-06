import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import * as ImagePicker from 'expo-image-picker';
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import {
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Avatar,
  Button,
  TextInput,
  Text,
  RadioButton,
  Appbar,
  useTheme,
} from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { firestore, storage } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

/*                               Schema / Types                               */
const schema = z.object({
  displayName: z.string().min(2).max(30),
  bio: z.string().max(160).optional(),
  birthday: z.date({ required_error: '生年月日を選択してください' }),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: '性別を選択してください',
  }),
});

type FormValues = z.infer<typeof schema>;

/*                                Utils / API                                 */
async function uploadAvatarAsync(uri: string, uid: string): Promise<string> {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const avatarRef = ref(storage, `avatars/${uid}.jpg`);
  await uploadBytes(avatarRef, blob, { contentType: blob.type });
  return getDownloadURL(avatarRef);
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                   */
/* -------------------------------------------------------------------------- */
export default function EditProfileScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();

  const [avatarUri, setAvatarUri] = useState<string | null>(user?.photoURL ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      bio: '',
      birthday: new Date(),
      gender: 'other',
    },
  });

  const birthday = watch('birthday');

  /* ---------------------- 初期値を Firestore から取得 ---------------------- */
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const snap = await getDoc(doc(firestore, 'users', user.uid));
      if (!snap.exists()) return;
      const data = snap.data();
      reset({
        displayName: data.displayName ?? '',
        bio: data.bio ?? '',
        birthday: data.birthday?.toDate() ?? new Date(),
        gender: data.gender ?? 'other',
      });
      setAvatarUri(data.photoURL ?? null);
    }
    loadProfile();
  }, [user, reset]);

  /* ---------------------------- Image Picker ----------------------------- */
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  /* ---------------------------- Submit ---------------------------------- */
  const onSubmit = async (data: FormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      let photoURL = user.photoURL ?? null;
      if (avatarUri && avatarUri !== user.photoURL) {
        photoURL = await uploadAvatarAsync(avatarUri, user.uid);
      }

      await updateDoc(doc(firestore, 'users', user.uid), {
        displayName: data.displayName.trim(),
        bio: data.bio?.trim() ?? '',
        photoURL,
        birthday: Timestamp.fromDate(data.birthday),
        gender: data.gender,
        updatedAt: Timestamp.now(),
      });

      navigation.goBack();
    } catch (e) {
      console.error('[edit-profile] update failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header with cancel */}
      <Appbar.Header mode="small" elevated>
        <Appbar.Action icon="close" onPress={() => navigation.goBack()} />
        <Appbar.Content title="プロフィール編集" />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <BlurView intensity={30} tint="light" style={{ borderRadius: 999 }}>
              {avatarUri ? (
                <Avatar.Image size={120} source={{ uri: avatarUri }} />
              ) : (
                <Avatar.Icon size={120} icon="account" />
              )}
            </BlurView>
            <Button mode="outlined" style={{ marginTop: 12 }} onPress={pickImage} icon="camera">
              画像を変更
            </Button>
          </View>

          {/* Display Name */}
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="名前"
                mode="outlined"
                style={{ marginBottom: 16 }}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.displayName}
              />
            )}
          />
          {errors.displayName && (
            <Text style={{ color: theme.colors.error, marginBottom: 8 }}>
              {errors.displayName.message}
            </Text>
          )}

          {/* Birthday */}
          <Controller
            control={control}
            name="birthday"
            render={({ field: { value, onChange } }) => (
              <>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                  <TextInput
                    label="生年月日"
                    mode="outlined"
                    editable={false}
                    pointerEvents="none"
                    value={value.toLocaleDateString()}
                    right={<TextInput.Icon icon="calendar" />}
                  />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={value}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(evt, selected) => {
                      if (selected) onChange(selected);
                      setShowDatePicker(false);
                    }}
                  />
                )}

                {errors.birthday && (
                  <Text style={{ color: theme.colors.error, marginBottom: 8 }}>
                    {errors.birthday.message}
                  </Text>
                )}
              </>
            )}
          />

          {/* ───── Gender (枠付きボタン) ───── */}
<Controller
  control={control}
  name="gender"
  render={({ field: { value, onChange } }) => (
    <View className="mt-6">
      <Text variant="labelLarge" className="text-secondary">
        性別
      </Text>

      {/* 横並びの 3 つのカードボタン */}
      <View className="flex-row gap-3 mt-3">
        {([
          { key: 'male',   label: '男性'   },
          { key: 'female', label: '女性'   },
          { key: 'other',  label: 'その他' },
        ] as const).map(({ key, label }) => {
          const selected = value === key;
          return (
            <TouchableOpacity
              key={key}
              className={`
                flex-row items-center px-3 py-2 rounded-lg
                border ${selected ? 'border-primary/80 bg-primary/10' : 'border-outline'}
              `}
              activeOpacity={0.8}
              onPress={() => onChange(key)}
            >
              <RadioButton
                value={key}
                status={selected ? 'checked' : 'unchecked'}
                uncheckedColor={theme.colors.outline}
              />
              <Text className="ml-1">{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errors.gender && (
        <Text className="text-error mt-2">{errors.gender.message}</Text>
      )}
    </View>
  )}
/>


          {/* Bio */}
          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="BIO"
                mode="outlined"
                multiline
                numberOfLines={4}
                style={{ marginBottom: 24 }}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.bio}
              />
            )}
          />
          {errors.bio && (
            <Text style={{ color: theme.colors.error, marginBottom: 8 }}>{errors.bio.message}</Text>
          )}

          {/* Footer Spacer so button isn't hidden */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button (sticky at bottom) */}
        <View style={{ padding: 16 }}>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            disabled={submitting}
            contentStyle={{ paddingVertical: 8 }}
          >
            保存する
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
