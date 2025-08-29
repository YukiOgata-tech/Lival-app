// src/components/study/CreateStudyRecordModal.tsx
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput as RNTextInput, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Button, Card, List, ActivityIndicator, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useAuth } from '@/providers/AuthProvider';
import BarcodeScanner from '@/components/study/BarcodeScanner';
import type { BookSearchResult, StudyLogFormData, StudyLogMode } from '@/types/StudyLogTypes';
import { createBookRecord, createStudyLog, sanitizeNullable, searchBookByISBN, searchBookByTitle } from '@/lib/studyLogApi';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function CreateStudyRecordModal({ visible, onDismiss, onCreated }: Props) {
  const { user } = useAuth();

  // UI states
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<StudyLogFormData>({
    mode: 'none',
    durationMinutes: 60,
    studiedAt: new Date(),
    memo: '',
  });
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const memoDraftRef = useRef<string>('');

  useEffect(() => {
    if (!visible) return;
    // リセット（新規オープン時）
    setFormData({ mode: 'none', durationMinutes: 60, studiedAt: new Date(), memo: '' });
    setSelectedBook(null);
    setBookSearchQuery('');
    setBookSearchResults([]);
    memoDraftRef.current = '';
  }, [visible]);

  const handleModeChange = (mode: StudyLogMode) => {
    setFormData(prev => ({ ...prev, mode }));
    setSelectedBook(null);
    setBookSearchResults([]);
    setBookSearchQuery('');
  };

  const handleBarcodeScanned = async (isbn: string) => {
    setSearchLoading(true);
    try {
      const book = await searchBookByISBN(isbn);
      if (book) {
        setSelectedBook(book);
        setFormData(prev => ({ ...prev, mode: 'isbn', bookId: book.id }));
      } else {
        Alert.alert('書籍が見つかりません', 'ISBNで書籍を検索できませんでした');
      }
    } catch (error) {
      console.error('ISBN search error:', error);
      Alert.alert('エラー', '書籍検索に失敗しました');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBookSearch = async (q?: string) => {
    const query = (q ?? bookSearchQuery).trim();
    if (!query) return;
    setSearchLoading(true);
    try {
      const results = await searchBookByTitle(query);
      setBookSearchResults(results.slice(0, 12));
      setBookSearchQuery(query);
    } catch (error) {
      console.error('Book search error:', error);
      Alert.alert('エラー', '書籍検索に失敗しました');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBookSelect = async (book: BookSearchResult) => {
    try {
      let bookWithId = book;
      if (!book.id) {
        const savedBook = await createBookRecord(book);
        if (savedBook) bookWithId = { ...book, id: savedBook.id };
      }
      setSelectedBook(bookWithId);
      setFormData(prev => ({ ...prev, mode: 'title', bookId: bookWithId.id }));
      setBookSearchResults([]);
    } catch (error) {
      console.error('Failed to select book:', error);
      Alert.alert('エラー', '書籍の選択に失敗しました');
    }
  };

  const handleSubmit = async () => {
    if (!user || formData.durationMinutes <= 0) {
      Alert.alert('入力エラー', '学習時間を正しく入力してください');
      return;
    }
    if (formData.mode === 'manual' && !formData.manualTitle?.trim()) {
      Alert.alert('入力エラー', '書籍名を入力してください');
      return;
    }
    if ((formData.mode === 'isbn' || formData.mode === 'title') && !formData.bookId) {
      Alert.alert('入力エラー', '書籍を選択してください');
      return;
    }

    setSubmitting(true);
    try {
      const memoText = memoDraftRef.current ?? formData.memo;
      const input = {
        book_id: formData.bookId || null,
        manual_book_title: formData.mode === 'manual' ? sanitizeNullable(formData.manualTitle) : null,
        duration_minutes: formData.durationMinutes,
        memo: sanitizeNullable(memoText),
        studied_at: formData.studiedAt.toISOString(),
        free_mode: formData.mode === 'none',
      };

      const newLog = await createStudyLog(user.uid, input);
      if (newLog) {
        onDismiss?.();
        await onCreated?.();
        Alert.alert('完了', '学習記録を追加しました');
      } else {
        Alert.alert('エラー', '学習記録の追加に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create study log:', error);
      Alert.alert('エラー', '学習記録の追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: 'white',
          marginHorizontal: 16,
          marginVertical: 60,
          borderRadius: 16,
          height: '80%',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        {/* Header */}
        <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={{ padding: 20 }} className="rounded-t-2xl">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">📚 学習記録を追加</Text>
            <TouchableOpacity onPress={onDismiss}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#f9fafb' }}>
          {/* Mode Selection */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#374151' }}>記録方法</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { key: 'none', label: '書籍なし' },
                { key: 'isbn', label: 'バーコード' },
                { key: 'title', label: 'タイトル検索' },
                { key: 'manual', label: '手動入力' },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.key}
                  onPress={() => handleModeChange(mode.key as any)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 25,
                    backgroundColor: formData.mode === mode.key ? '#3b82f6' : '#f3f4f6',
                    borderWidth: 1,
                    borderColor: formData.mode === mode.key ? '#3b82f6' : '#d1d5db',
                    marginBottom: 8,
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: formData.mode === mode.key ? 'white' : '#374151', fontWeight: '600', fontSize: 15 }}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Book Selection */}
          {formData.mode === 'isbn' && (
            <View className="mb-4">
              <Button mode="outlined" onPress={() => setShowBarcodeScanner(true)} icon="qr-code-scanner">
                バーコードをスキャン / ISBN入力
              </Button>
              {selectedBook && (
                <Card className="mt-2 p-3">
                  <Text className="font-semibold">{selectedBook.title}</Text>
                  <Text className="text-sm text-gray-600">{selectedBook.author}</Text>
                </Card>
              )}
            </View>
          )}

          {formData.mode === 'title' && (
            <View className="mb-4">
              <TitleSearchRow initial={bookSearchQuery} disabled={searchLoading} onSubmit={(q) => handleBookSearch(q)} />

              {searchLoading ? (
                <View className="items-center justify-center h-48">
                  <LottieView source={require('../../../assets/lotties/sandy-loading.json')} autoPlay loop style={{ width: 120, height: 120 }} />
                </View>
              ) : (
                bookSearchResults.length > 0 && (
                  <View className="mt-2 max-h-48">
                    <ScrollView>
                      {bookSearchResults.map((book, index) => (
                        <List.Item
                          key={`${book.isbn}-${index}`}
                          title={book.title}
                          titleNumberOfLines={2}
                          description={`${book.author || '著者不明'} - ${book.company || '出版社不明'}`}
                          descriptionNumberOfLines={2}
                          onPress={() => handleBookSelect(book)}
                          left={() =>
                            book.cover_image_url ? (
                              <Image
                                source={{ uri: book.cover_image_url.replace('http://', 'https://').replace('https//', 'https://') }}
                                style={{ width: 40, height: 60 }}
                                contentFit="cover"
                                transition={300}
                              />
                            ) : (
                              <View className="w-10 h-[60px] items-center justify-center bg-gray-200 rounded">
                                <List.Icon icon="book-open-variant" />
                              </View>
                            )
                          }
                        />
                      ))}
                    </ScrollView>
                  </View>
                )
              )}

              {selectedBook && (
                <Card className="mt-2 p-3 bg-blue-50 border border-blue-200">
                  <Text className="font-semibold text-blue-800">{selectedBook.title}</Text>
                  <Text className="text-sm text-blue-600">{selectedBook.author}</Text>
                </Card>
              )}
            </View>
          )}

          {formData.mode === 'manual' && (
            <View className="mb-4">
              <TextInput mode="outlined" label="書籍名" value={formData.manualTitle || ''} onChangeText={(text) => setFormData(prev => ({ ...prev, manualTitle: text }))} />
            </View>
          )}

          {/* Duration Input */}
          <View className="mb-4">
            <TextInput
              mode="outlined"
              label="学習時間（分）"
              value={formData.durationMinutes.toString()}
              onChangeText={(text) => {
                const minutes = parseInt(text) || 0;
                setFormData(prev => ({ ...prev, durationMinutes: minutes }));
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Date/Time Selection */}
          <View className="mb-4">
            <Text className="font-semibold mb-2">学習日時</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Card className="p-3">
                <Text>
                  {formData.studiedAt.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </Text>
              </Card>
            </TouchableOpacity>
          </View>

          {/* Memo Input */}
          <View className="mb-4">
            <MemoField initial={formData.memo || ''} onChangeDraft={(t) => { memoDraftRef.current = t; }} />
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 20, backgroundColor: '#f9fafb' }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={onDismiss} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
              <Text style={{ color: '#374151', fontWeight: '600', fontSize: 16 }}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center' }}
              activeOpacity={0.9}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {submitting && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{submitting ? '保存中...' : '保存'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={formData.studiedAt}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setFormData(prev => ({ ...prev, studiedAt: selectedDate }));
            }}
          />
        )}

        {/* Barcode Scanner */}
        <BarcodeScanner isOpen={showBarcodeScanner} onClose={() => setShowBarcodeScanner(false)} onScanComplete={handleBarcodeScanned} />
      </Modal>
    </Portal>
  );
}

// IME を壊さない検索行（非制御）
function TitleSearchRow({ initial, disabled, onSubmit }: { initial?: string; disabled?: boolean; onSubmit: (query: string) => void }) {
  const [draft, setDraft] = React.useState(initial ?? '');
  React.useEffect(() => { setDraft(initial ?? ''); }, [initial]);
  const submit = useCallback(() => { const q = draft.trim(); if (!q || disabled) return; onSubmit(q); }, [draft, disabled, onSubmit]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
      <RNTextInput
        defaultValue={initial}
        onChangeText={setDraft}
        placeholder="書籍名を入力"
        style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="search"
        blurOnSubmit={false}
        onSubmitEditing={submit}
      />
      <TouchableOpacity onPress={submit} disabled={disabled} activeOpacity={0.8}>
        <LinearGradient colors={['#3b82f6', '#2563eb']} style={{ borderRadius: 10, height: 48, width: 80, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.7 : 1 }}>
          <MaterialIcons name="search" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// IME を壊さないメモ欄（非制御 + ref 同期）
function MemoField({ initial, onChangeDraft }: { initial?: string; onChangeDraft: (t: string) => void }) {
  const [draft, setDraft] = React.useState(initial ?? '');
  useEffect(() => { setDraft(initial ?? ''); }, [initial]);
  const handleChange = (t: string) => { setDraft(t); onChangeDraft(t); };
  return (
    <RNTextInput
      defaultValue={initial}
      onChangeText={handleChange}
      placeholder="メモ（任意）"
      multiline
      numberOfLines={3}
      style={{ backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 72, textAlignVertical: 'top' }}
      autoCorrect={false}
      spellCheck={false}
      returnKeyType="default"
      blurOnSubmit={false}
    />
  );
}

