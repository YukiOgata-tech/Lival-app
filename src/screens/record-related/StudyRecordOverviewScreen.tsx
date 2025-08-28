// src/screens/record-related/StudyRecordOverviewScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  Alert,
  TouchableOpacity
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { 
  Card, 
  Portal,
  Modal,
  Button,
  TextInput,
  List,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { 
  getStudyLogs, 
  getStudyStats, 
  createStudyLog, 
  searchBookByISBN, 
  searchBookByTitle,
  createBookRecord,
  sanitizeNullable 
} from '@/lib/studyLogApi';
import BarcodeScanner from '@/components/study/BarcodeScanner';
import FuturisticWeeklyChart from '@/components/study/FuturisticWeeklyChart';
import StudyHistoryModal from '@/components/study/StudyHistoryModal';
import LottieView from 'lottie-react-native';
import type { 
  StudyLog, 
  StudyStats, 
  BookSearchResult, 
  StudyLogMode,
  StudyLogFormData 
} from '@/types/StudyLogTypes';

export default function StudyRecordScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Animation values for FAB
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);
  
  // Chart states
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [logs, stats] = await Promise.all([
        getStudyLogs(user.uid),
        getStudyStats(user.uid)
      ]);
      
      setStudyLogs(logs);
      setStudyStats(stats);
      generateWeeklyData(logs, weekOffset);
    } catch (error) {
      console.error('Failed to load study data:', error);
      Alert.alert('エラー', '学習データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyData = (logs: StudyLog[], offset: number) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const weekData = [];
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.studied_at);
        return logDate.toDateString() === date.toDateString();
      });

      weekData.push({
        day: dayNames[i],
        date: date.toISOString(),
        minutes: dayLogs.reduce((sum, log) => sum + log.duration_minutes, 0),
        sessions: dayLogs.length,
      });
    }

    setWeeklyData(weekData);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const handleWeekChange = (newOffset: number) => {
    setWeekOffset(newOffset);
    generateWeeklyData(studyLogs, newOffset);
  };

  // Animated styles for FAB
  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${fabRotation.value}deg` }
    ],
  }));

  const handleCreateRecord = () => {
    // Button press animation
    fabScale.value = withSpring(0.9, { duration: 100 }, () => {
      fabScale.value = withSpring(1, { duration: 200 });
    });
    fabRotation.value = withTiming(360, { duration: 500 }, () => {
      fabRotation.value = 0;
    });
    
    setFormData({
      mode: 'none',
      durationMinutes: 60,
      studiedAt: new Date(),
      memo: '',
    });
    setSelectedBook(null);
    setBookSearchQuery('');
    setBookSearchResults([]);
    setShowCreateModal(true);
  };

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
        setFormData(prev => ({ 
          ...prev, 
          mode: 'isbn',
          bookId: book.id 
        }));
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

  const handleBookSearch = async () => {
    if (!bookSearchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const results = await searchBookByTitle(bookSearchQuery.trim());
      setBookSearchResults(results.slice(0, 12)); // Limit to 12 results
    } catch (error) {
      console.error('Book search error:', error);
      Alert.alert('エラー', '書籍検索に失敗しました');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBookSelect = async (book: BookSearchResult) => {
    try {
      // If the book doesn't have an ID, save it to get one
      let bookWithId = book;
      if (!book.id) {
        // Save book to database and get ID back
        const savedBook = await createBookRecord(book);
        if (savedBook) {
          bookWithId = { ...book, id: savedBook.id };
        }
      }
      
      setSelectedBook(bookWithId);
      setFormData(prev => ({ 
        ...prev, 
        mode: 'title',
        bookId: bookWithId.id 
      }));
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

    // Validate based on mode
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
      const input = {
        book_id: formData.bookId || null,
        manual_book_title: formData.mode === 'manual' 
          ? sanitizeNullable(formData.manualTitle) 
          : null,
        duration_minutes: formData.durationMinutes,
        memo: sanitizeNullable(formData.memo),
        studied_at: formData.studiedAt.toISOString(),
        free_mode: formData.mode === 'none',
      };

      const newLog = await createStudyLog(user.uid, input);
      if (newLog) {
        setShowCreateModal(false);
        
        // Reload all data to ensure consistency
        await loadData();
        
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


  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <LottieView
          source={require('@assets/lotties/file-loading1.json')}
          autoPlay
          loop
          style={{ width: 120, height: 120 }}
        />
        <Text className="mt-6 text-cyan-400 font-mono text-lg tracking-wider">
          システム初期化中...
        </Text>
        <View className="mt-2 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <View className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#22d3ee"
            colors={['#22d3ee']}
          />
        }
      >
        {/* Futuristic Header with Safe Area */}
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#334155']}
          style={{ paddingTop: insets.top + 20 }}
          className="pb-8 px-6 border-b border-cyan-500/20"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold text-cyan-100 font-mono tracking-wide left-4">
                学習記録
              </Text>
              <Text className="text-cyan-400/80 text-sm font-mono tracking-wider mt-1 left-3">
                Learning Analytics Dashboard
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setShowHistoryModal(true);
              }}
              className="bg-cyan-500/20 border border-cyan-400/30 px-2 py-0.5 mx-1 rounded-xl"
              activeOpacity={0.9}
            >
              <Image
                source={require('@assets/images/history.png')}
                style={{
                  width: 80,
                  height: 24,
                  contentFit: 'cover',
                }}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        {/* Futuristic Weekly Chart */}
        <FuturisticWeeklyChart
          data={weeklyData}
          weekOffset={weekOffset}
          onWeekChange={handleWeekChange}
          loading={loading}
        />


        {/* Empty state or call-to-action when no data */}
        {studyLogs.length === 0 && (
          <View className="px-4 pb-20">
            <Card className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-800 dark:to-neutral-700">
              <View className="items-center">
                <LinearGradient
                  colors={['#3b82f6', '#8b5cf6']}
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                >
                  <MaterialIcons name="menu-book" size={32} color="white" />
                </LinearGradient>
                <Text className="text-gray-700 dark:text-gray-300 font-semibold text-lg mb-2">
                  学習記録を始めましょう！
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-center text-sm leading-5">
                  右下の「+」ボタンから{'\n'}最初の学習記録を追加してみてください
                </Text>
              </View>
            </Card>
          </View>
        )}
        
        {/* Add bottom padding for FAB */}
        <View className="pb-20" />
      </ScrollView>

      {/* Create Record FAB with custom image and animation */}
      <TouchableOpacity
        onPress={handleCreateRecord}
        className="absolute bottom-6 right-6"
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            animatedFabStyle,
            {
              shadowColor: '#00ffff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }
          ]}
        >
          <Image
            source={require('../../../assets/images/plus-button.png')}
            style={{
              width: 64,
              height: 64,
              contentFit: 'contain',
            }}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Create Record Modal - Redesigned */}
      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          contentContainerStyle={{ 
            backgroundColor: 'white', 
            marginHorizontal: 20,
            marginVertical: 60,
            borderRadius: 20,
            height: '75%',
          }}
        >
            {/* Header */}
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              style={{ padding: 20 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-xl font-bold">
                  📚 学習記録を追加
                </Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Content */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
            
              {/* Mode Selection */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#374151' }}>
                  記録方法
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { key: 'none', label: '書籍なし' },
                    { key: 'isbn', label: 'バーコード' },
                    { key: 'title', label: 'タイトル検索' },
                    { key: 'manual', label: '手動入力' }
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
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{
                        color: formData.mode === mode.key ? 'white' : '#374151',
                        fontWeight: '600',
                        fontSize: 15,
                      }}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            {/* Book Selection Based on Mode */}
            {formData.mode === 'isbn' && (
              <View className="mb-4">
                <Button 
                  mode="outlined" 
                  onPress={() => setShowBarcodeScanner(true)}
                  icon="qr-code-scanner"
                >
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
                <View className="flex-row space-x-2 items-center">
                  <TextInput
                    mode="outlined"
                    placeholder="書籍名を入力"
                    value={bookSearchQuery}
                    onChangeText={setBookSearchQuery}
                    style={{ flex: 1 }}
                    onSubmitEditing={handleBookSearch}
                  />
                  <TouchableOpacity onPress={handleBookSearch} disabled={searchLoading}>
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      className="rounded-lg h-12 w-20 items-center justify-center"
                    >
                      <MaterialIcons name="search" size={24} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                
                {searchLoading ? (
                  <View className="items-center justify-center h-48">
                    <LottieView
                      source={require('../../../assets/lotties/sandy-loading.json')}
                      autoPlay
                      loop
                      style={{ width: 120, height: 120 }}
                    />
                  </View>
                ) : bookSearchResults.length > 0 && (
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
                          left={() => (
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
                          )}
                        />
                      ))}
                    </ScrollView>
                  </View>
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
                <TextInput
                  mode="outlined"
                  label="書籍名"
                  value={formData.manualTitle || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, manualTitle: text }))}
                />
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
                      weekday: 'long'
                    })}
                  </Text>
                </Card>
              </TouchableOpacity>
            </View>

            {/* Memo Input */}
            <View className="mb-4">
              <TextInput
                mode="outlined"
                label="メモ（任意）"
                value={formData.memo || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, memo: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            </ScrollView>
            
            {/* Bottom Buttons */}
            <View style={{ 
              borderTopWidth: 1, 
              borderTopColor: '#e5e7eb', 
              padding: 20, 
              backgroundColor: '#f9fafb' 
            }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  onPress={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#6b7280',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                    キャンセル
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    backgroundColor: submitting ? '#9ca3af' : '#3b82f6',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {submitting && (
                      <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    )}
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                      {submitting ? '保存中...' : '保存'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
        </Modal>
      </Portal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.studiedAt}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFormData(prev => ({ ...prev, studiedAt: selectedDate }));
            }
          }}
        />
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanComplete={handleBarcodeScanned}
      />
      
      {/* Study History Modal */}
      <StudyHistoryModal
        visible={showHistoryModal}
        onDismiss={() => setShowHistoryModal(false)}
        studyLogs={studyLogs}
        loading={loading}
      />
    </View>
  );
}