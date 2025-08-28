// src/screens/record-related/StudyRecordOverviewScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  Alert,
  TouchableOpacity,
  Image
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { 
  Card, 
  Chip,
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
              <Text className="text-3xl font-bold text-cyan-100 font-mono tracking-wide">
                学習記録
              </Text>
              <Text className="text-cyan-400/80 text-sm font-mono tracking-wider mt-1">
                Learning Analytics Dashboard
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                console.log('履歴ボタンが押されました');
                setShowHistoryModal(true);
              }}
              className="bg-cyan-500/20 border border-cyan-400/30 px-4 py-2 rounded-xl"
            >
              <Text className="text-cyan-300 font-mono text-sm tracking-wider">
                履歴
              </Text>
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
              resizeMode: 'contain',
            }}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Create Record Modal */}
      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          contentContainerStyle={{ 
            backgroundColor: 'white', 
            margin: 20, 
            borderRadius: 16,
            height: '80%',
            flexDirection: 'column'
          }}
        >
          <View className="flex-1">
            <ScrollView className="flex-1 p-6">
            <Text className="text-lg font-bold mb-4">学習記録を追加</Text>
            
            {/* Mode Selection */}
            <Text className="font-semibold mb-2">記録方法</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <Chip 
                mode={formData.mode === 'none' ? 'flat' : 'outlined'}
                onPress={() => handleModeChange('none')}
              >
                書籍なし
              </Chip>
              <Chip 
                mode={formData.mode === 'isbn' ? 'flat' : 'outlined'}
                onPress={() => handleModeChange('isbn')}
              >
                バーコード
              </Chip>
              <Chip 
                mode={formData.mode === 'title' ? 'flat' : 'outlined'}
                onPress={() => handleModeChange('title')}
              >
                タイトル検索
              </Chip>
              <Chip 
                mode={formData.mode === 'manual' ? 'flat' : 'outlined'}
                onPress={() => handleModeChange('manual')}
              >
                手動入力
              </Chip>
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
                <View className="flex-row space-x-2">
                  <TextInput
                    mode="outlined"
                    placeholder="書籍名を入力"
                    value={bookSearchQuery}
                    onChangeText={setBookSearchQuery}
                    style={{ flex: 1 }}
                  />
                  <Button 
                    mode="contained" 
                    onPress={handleBookSearch}
                    loading={searchLoading}
                  >
                    検索
                  </Button>
                </View>
                
                {bookSearchResults.length > 0 && (
                  <View className="mt-2 max-h-48">
                    <ScrollView>
                      {bookSearchResults.map((book, index) => (
                        <List.Item
                          key={index}
                          title={book.title}
                          description={`${book.author} - ${book.company}`}
                          onPress={() => handleBookSelect(book)}
                          left={props => <List.Icon {...props} icon="book" />}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {selectedBook && (
                  <Card className="mt-2 p-3">
                    <Text className="font-semibold">{selectedBook.title}</Text>
                    <Text className="text-sm text-gray-600">{selectedBook.author}</Text>
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
            
            {/* Fixed Bottom Buttons */}
            <View className="p-6 border-t border-gray-200 bg-white">
              <View className="flex-row space-x-3">
                <Button 
                  mode="outlined" 
                  onPress={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                >
                  キャンセル
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSubmit}
                  loading={submitting}
                  style={{ flex: 1 }}
                >
                  保存
                </Button>
              </View>
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