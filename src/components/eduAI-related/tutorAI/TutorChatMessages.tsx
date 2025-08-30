// src/components/eduAI-related/tutorAI/TutorChatMessages.tsx
import React, {
  useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState, memo,
} from 'react';
import {
  FlatList, Keyboard, View, Platform,
  NativeSyntheticEvent, NativeScrollEvent, Pressable, Text,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import TutorMessage from './TutorMessage';
import type { EduAITag } from '@/storage/eduAIStorage';

export type TutorRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  tags?: EduAITag[];
  at?: number;
};

type Props = {
  data: TutorRow[];
  typing?: boolean;
  onLongPress?: (row: TutorRow) => void;
};

export type TutorChatMessagesHandle = {
  scrollToLatest: (animated?: boolean) => void;
};

const NEAR_BOTTOM_PX = 120; // この距離以内なら自動追従

const BaseTutorChatMessages = forwardRef<TutorChatMessagesHandle, Props>(
  ({ data, typing, onLongPress }: Props, ref) => {
    const listRef = useRef<FlatList<TutorRow>>(null);
    const screenEnteredAtRef = useRef<number>(Date.now());
    const atBottomRef = useRef<boolean>(true);
    const forceFollowNextRef = useRef<boolean>(false); // 自分の送信直後は true
    const prevLenRef = useRef<number>(data.length);
    const [showJump, setShowJump] = useState(false);

    const scrollToLatest = (animated = true) => {
      listRef.current?.scrollToEnd({ animated });
    };
    useImperativeHandle(ref, () => ({ scrollToLatest }));

    // 初回のみ最下部へ
    useEffect(() => {
      const id = setTimeout(() => scrollToLatest(false), 0);
      return () => clearTimeout(id);
    }, []);

    // data 変化を検知：ユーザー送信なら次回強制追従、AI/typing は下端にいる時だけ追従
    useEffect(() => {
      const prevLen = prevLenRef.current;
      const currLen = data.length;
      if (currLen > prevLen) {
        const last = data[currLen - 1];
        // 自分の送信は必ず追従
        if (last?.role === 'user') {
          forceFollowNextRef.current = true;
        }
      }
      prevLenRef.current = currLen;

      if (forceFollowNextRef.current || atBottomRef.current) {
        scrollToLatest(true);
        forceFollowNextRef.current = false;
      } else {
        // 下端から離れている場合はジャンプ表示
        setShowJump(true);
      }
    }, [data.length]);

    // typing の点滅更新があっても「下端付近」のときだけ追従
    useEffect(() => {
      if (atBottomRef.current) scrollToLatest(true);
      else setShowJump(true);
    }, [typing]);

    // 画面入場後に届いた最後の assistant だけタイプ表示
    const typewriterTargetId = useMemo(() => {
      const enteredAt = screenEnteredAtRef.current;
      for (let i = data.length - 1; i >= 0; i--) {
        const m = data[i];
        if (m.role === 'assistant' && (m.at ?? 0) >= enteredAt && m.content.trim() !== '（生成中…）') {
          return m.id;
        }
      }
      return null;
    }, [data]);

    // スクロール位置監視：下端付近なら追従ON扱い、離れたらジャンプ表示
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceToBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const atBottom = distanceToBottom <= NEAR_BOTTOM_PX;
      atBottomRef.current = atBottom;
      if (atBottom) setShowJump(false);
    };

    const keyExtractor = React.useCallback((item: TutorRow) => item.id, []);
    const renderItem = React.useCallback(({ item }: { item: TutorRow }) => (
      <TutorMessage
        role={item.role}
        content={item.content}
        images={item.images}
        tags={item.tags}
        animate={item.role === 'assistant' && item.id === typewriterTargetId}
        onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      />
    ), [onLongPress, typewriterTargetId]);

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 106 }}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onContentSizeChange={() => {
            if (atBottomRef.current || forceFollowNextRef.current) {
              scrollToLatest(true);
              forceFollowNextRef.current = false;
            } else {
              setShowJump(true);
            }
          }}
          onScroll={onScroll}
          scrollEventThrottle={32}
          initialNumToRender={Math.min(20, data.length)}
          onScrollBeginDrag={() => Keyboard.dismiss()}
        />

        {/* ↓ 最新へ ピル（下端から離れていて新着/typingがあるときに表示） */}
        {showJump && (
          <Pressable
            onPress={() => {
              scrollToLatest(true);
              atBottomRef.current = true;
              setShowJump(false);
            }}
            className="absolute right-3 bottom-24 px-3 py-2 rounded-full bg-slate-900/90 border border-white/15 flex-row items-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
          >
            <ChevronDown size={16} color="#e5e7eb" />
            <Text className="ml-1 text-[12px] text-slate-200">最新へ</Text>
          </Pressable>
        )}
      </View>
    );
  }
);

const areEqual = (prev: Props, next: Props) => {
  return (
    prev.data === next.data &&
    prev.typing === next.typing &&
    prev.onLongPress === next.onLongPress
  );
};

export default memo(BaseTutorChatMessages, areEqual);
