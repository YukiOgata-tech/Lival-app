// src/screens/reception/ReceptionAIScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import  LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { upsertUserProfile } from '@/lib/userProfilesApi';

type Message = { id: string; role: 'bot' | 'user'; text: string };

const steps = [
  { key: 'display_name', prompt: 'はじめまして！お名前を教えてください。', optional: true },
  { key: 'grade', prompt: '学年を教えてください。（例: 高3, 中2, 社会人）', optional: true },
  { key: 'deviation_score', prompt: '現在の偏差値はどれくらい？（数字でOK。未入力は50で登録します）', optional: true },
  { key: 'career_interests', prompt: '興味のある分野があれば教えてください（自由入力）', optional: true },
  { key: 'target_universities', prompt: '志望大学があれば教えてください（自由入力）', optional: true },
  { key: 'avg_study_min', prompt: '1日の平均学習時間（分）を教えてください。（例: 90）', optional: true },
  { key: 'prefers_video', prompt: '動画学習が好き？（はい/いいえ）', optional: true },
  { key: 'prefers_text', prompt: '文章学習が好き？（はい/いいえ）', optional: true },
  { key: 'recency_mark', prompt: '最近重視している科目があれば教えてください。（例: 数学, 英語）', optional: true },
];

export default function ReceptionAIScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [typing, setTyping] = useState(false);
  const [profileDraft, setProfileDraft] = useState<any>({});

  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    // 初回プロンプト
    typeOutBot(steps[0].prompt);
  }, []);

  // Typing dots animation
  const TypingDots = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;
    const makeAnim = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true, delay }),
          Animated.timing(v, { toValue: 0, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    useEffect(() => {
      makeAnim(dot1, 0);
      makeAnim(dot2, 150);
      makeAnim(dot3, 300);
    }, []);
    const styleFor = (v: Animated.Value) => ({ opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] });
    return (
      <View className="flex-row items-center">
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 2, backgroundColor: 'white' }, styleFor(dot1)]} />
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 2, backgroundColor: 'white' }, styleFor(dot2)]} />
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 2, backgroundColor: 'white' }, styleFor(dot3)]} />
      </View>
    );
  };

  // Animated message bubble
  const MessageBubble = ({ role, children }: { role: 'bot' | 'user'; children: React.ReactNode }) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    }, []);
    const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
    const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
    return (
      <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 18,
            maxWidth: '78%',
            minWidth: role === 'bot' ? '65%' : undefined, // AIメッセージには最小幅を設定
            opacity: 0.98,
            backgroundColor: role === 'bot' ? '#1f2937' : '#10b981',
            borderWidth: 1,
            borderColor: role === 'bot' ? '#374151' : '#0ea5a5',
          }}
        >
          <Text style={{ color: role === 'bot' ? '#e5e7eb' : '#052e2b', flexShrink: 1 }}>{children}</Text>
        </View>
      </Animated.View>
    );
  };

  const typeOutBot = (text: string, delayMs?: number) => {
    setTyping(true);
    const id = `${Date.now()}-bot`;
    let shown = '';
    
    // メッセージの長さに基づいて自然な遅延時間を計算
    const naturalDelay = delayMs ?? Math.min(Math.max(text.length * 8, 400), 1200);
    
    // 最初は空のメッセージを追加
    setMessages((prev) => [...prev, { id, role: 'bot', text: '' }]);
    const chars = [...text];
    
    setTimeout(() => {
      setTyping(false);
      let i = 0;
      // より自然なタイピング速度（日本語を考慮）
      const typingSpeed = text.includes('？') || text.includes('！') ? 25 : 18;
      
      const timer = setInterval(() => {
        i++;
        shown = chars.slice(0, i).join('');
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: shown } : m)));
        flatRef.current?.scrollToEnd({ animated: true });
        
        if (i >= chars.length) {
          clearInterval(timer);
        }
      }, typingSpeed);
    }, naturalDelay);
  };

  const normalize = (key: string, value: string) => {
    const v = value.trim();
    switch (key) {
      case 'deviation_score': {
        const n = parseInt(v, 10);
        return isNaN(n) ? undefined : n;
      }
      case 'avg_study_min': {
        const n = parseInt(v, 10);
        return isNaN(n) ? undefined : n;
      }
      case 'prefers_video':
      case 'prefers_text': {
        if (!v) return undefined;
        return v === 'はい' || v.toLowerCase() === 'yes' || v === '1' || v === 'true';
      }
      case 'career_interests':
      case 'target_universities':
        return v || undefined;
      case 'grade':
        return v || undefined;
      default:
        return v || undefined;
    }
  };

  const validate = (key: string, value: string): { ok: boolean; normalized?: any; err?: string } => {
    const v = value.trim();
    if (!v) return { ok: true, normalized: undefined };
    switch (key) {
      case 'display_name':
        if (v.length > 50) return { ok: false, err: 'お名前は50文字以内で入力してください。' };
        return { ok: true, normalized: v };
      case 'grade':
        if (v.length > 30) return { ok: false, err: '学年は30文字以内で入力してください。' };
        return { ok: true, normalized: v };
      case 'deviation_score': {
        const n = parseInt(v, 10);
        if (isNaN(n)) return { ok: false, err: '偏差値は数値で入力してください。（例: 55）' };
        if (n < 20 || n > 80) return { ok: false, err: '偏差値は20〜80の範囲で入力してください。' };
        return { ok: true, normalized: n };
      }
      case 'career_interests':
        if (v.length > 120) return { ok: false, err: '興味分野は120文字以内で入力してください。' };
        return { ok: true, normalized: v };
      case 'target_universities':
        if (v.length > 120) return { ok: false, err: '志望大学は120文字以内で入力してください。' };
        return { ok: true, normalized: v };
      case 'avg_study_min': {
        const n = parseInt(v, 10);
        if (isNaN(n)) return { ok: false, err: '平均学習時間は数値（分）で入力してください。（例: 90）' };
        if (n < 0 || n > 1440) return { ok: false, err: '平均学習時間は0〜1440の範囲で入力してください。' };
        return { ok: true, normalized: n };
      }
      case 'prefers_video':
      case 'prefers_text': {
        const truthy = ['はい', 'yes', '1', 'true'];
        const falsy = ['いいえ', 'no', '0', 'false'];
        if (truthy.includes(v.toLowerCase())) return { ok: true, normalized: true };
        if (falsy.includes(v.toLowerCase())) return { ok: true, normalized: false };
        return { ok: false, err: '「はい」または「いいえ」で回答してください。' };
      }
      case 'recency_mark':
        if (v.length > 30) return { ok: false, err: '科目タグは30文字以内で入力してください。' };
        return { ok: true, normalized: v };
      default:
        return { ok: true, normalized: v };
    }
  };

  const handleSend = async () => {
    if (!input && steps[stepIndex]?.optional !== true) return;
    const current = steps[stepIndex];
    const userText = input || 'スキップ';
    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: 'user', text: userText }]);
    flatRef.current?.scrollToEnd({ animated: true });

    // バリデーションと保存用整形
    if (current) {
      const { ok, normalized, err } = validate(current.key, input);
      if (!ok && err) {
        // エラーメッセージは少し早めに表示
        typeOutBot(err, 200);
        return;
      }
      const normalizedFinal = normalized ?? normalize(current.key, input);
      if (normalizedFinal !== undefined) {
        setProfileDraft((p: any) => ({ ...p, [current.key]: normalizedFinal }));
      }
    }

    setInput('');
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);

    if (nextIndex < steps.length) {
      typeOutBot(steps[nextIndex].prompt);
    } else {
      await finalize();
    }
  };

  const finalize = async () => {
    typeOutBot('ありがとうございます。いただいた内容を保存します…', 800);
    
    // 保存処理を実際のタイミングで実行
    setTimeout(async () => {
      const payload = {
        uid: user?.uid!,
        deviation_score: profileDraft.deviation_score ?? 50,
        display_name: profileDraft.display_name ?? null,
        grade: profileDraft.grade ?? null,
        target_universities: profileDraft.target_universities ?? null,
        career_interests: profileDraft.career_interests ?? null,
        avg_study_min: profileDraft.avg_study_min ?? null,
        prefers_video: profileDraft.prefers_video ?? null,
        prefers_text: profileDraft.prefers_text ?? null,
        recency_mark: profileDraft.recency_mark ?? null,
      };
      
      try {
        await upsertUserProfile(payload);
        typeOutBot('保存が完了しました。ホームに戻って引き続きお楽しみください！', 300);
      } catch (error) {
        typeOutBot('保存中にエラーが発生しました。もう一度お試しください。', 300);
      }
    }, 2000); // 2秒後に実際の保存処理を実行
  };

  const progress = Math.min((stepIndex / steps.length) * 100, 100);

  return (
    <View className="flex-1 bg-neutral-950" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-neutral-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-bold">受付AI（プロファイル登録）</Text>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <MaterialIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View className="mt-3 h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
          <View style={{ width: `${progress}%` }} className="h-full bg-emerald-500" />
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4 py-2">
              {item.role === 'bot' ? (
                <View className="flex-row items-end" style={{ alignSelf: 'flex-start' }}>
                  <View className="w-9 h-9 rounded-full items-center justify-center overflow-hidden bg-neutral-900 border border-neutral-700">
                    <LottieView
                      source={require('@assets/lotties/face-morphing.json')}
                      autoPlay
                      loop
                      style={{ width: 36, height: 36 }}
                    />
                  </View>
                  <View className="ml-2">
                    <MessageBubble role="bot">{item.text}</MessageBubble>
                  </View>
                </View>
              ) : (
                <View className="items-end" style={{ alignSelf: 'flex-end' }}>
                  <MessageBubble role="user">{item.text}</MessageBubble>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={typing ? (
            <View className="px-4 pt-1 pb-3" style={{ alignItems: 'flex-start' }}>
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full items-center justify-center overflow-hidden bg-neutral-900 border border-neutral-700">
                  <LottieView
                    source={require('@assets/lotties/face-morphing.json')}
                    autoPlay
                    loop
                    style={{ width: 36, height: 36 }}
                  />
                </View>
                <View className="ml-2 px-3 py-2 rounded-2xl bg-neutral-800 border border-neutral-700">
                  <TypingDots />
                </View>
              </View>
            </View>
          ) : null}
        />

        {/* Input */}
        <View className="px-4 pb-5">
          <View className="flex-row items-center bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-800">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="ここに入力（未入力はスキップ扱い）"
              placeholderTextColor="#94a3b8"
              className="flex-1 text-white"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleSend} disabled={typing} className="ml-2 px-3 py-2 rounded-xl" style={{ backgroundColor: typing ? '#475569' : '#10b981' }}>
              <Text className="text-black font-semibold">送信</Text>
            </TouchableOpacity>
          </View>
          {steps[stepIndex]?.optional && (
            <TouchableOpacity onPress={handleSend} disabled={typing} className="mt-2 self-end">
              <Text className="text-white/70 text-sm">スキップ</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
