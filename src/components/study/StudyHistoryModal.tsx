// src/components/study/StudyHistoryModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  Modal,
  Portal,
  Card,
  Chip,
  ActivityIndicator,
  Searchbar,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { StudyLog } from '@/types/StudyLogTypes';

interface StudyHistoryModalProps {
  visible: boolean;
  onDismiss: () => void;
  studyLogs: StudyLog[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

interface MonthlyStats {
  month: string;
  totalMinutes: number;
  totalSessions: number;
  averagePerDay: number;
  streak: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function StudyHistoryModal({
  visible,
  onDismiss,
  studyLogs,
  loading = false,
  onLoadMore,
  hasMore = false,
}: StudyHistoryModalProps) {
  const [selectedView, setSelectedView] = useState<'calendar' | 'list' | 'stats'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<StudyLog[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);

  // Animation values
  const modalScale = useSharedValue(visible ? 1 : 0.9);
  const modalOpacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      modalOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible]);

  useEffect(() => {
    // Filter logs based on search query
    const filtered = studyLogs.filter(log => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (log.book?.title?.toLowerCase().includes(searchLower)) ||
        (log.manual_book_title?.toLowerCase().includes(searchLower)) ||
        (log.memo?.toLowerCase().includes(searchLower))
      );
    });
    setFilteredLogs(filtered);
  }, [studyLogs, searchQuery]);

  useEffect(() => {
    // Calculate monthly stats
    const monthlyData: { [key: string]: MonthlyStats } = {};
    
    studyLogs.forEach(log => {
      const date = new Date(log.studied_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }),
          totalMinutes: 0,
          totalSessions: 0,
          averagePerDay: 0,
          streak: 0,
        };
      }
      
      monthlyData[monthKey].totalMinutes += log.duration_minutes;
      monthlyData[monthKey].totalSessions += 1;
    });

    // Calculate averages
    Object.values(monthlyData).forEach(stats => {
      const daysInMonth = new Date(
        parseInt(Object.keys(monthlyData).find(key => monthlyData[key] === stats)!.split('-')[0]),
        parseInt(Object.keys(monthlyData).find(key => monthlyData[key] === stats)!.split('-')[1]),
        0
      ).getDate();
      stats.averagePerDay = Math.round(stats.totalMinutes / daysInMonth);
    });

    setMonthlyStats(Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month)));
  }, [studyLogs]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    }
    return `${mins}分`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const groupLogsByDate = (logs: StudyLog[]) => {
    const grouped: { [key: string]: StudyLog[] } = {};
    logs.forEach(log => {
      const dateKey = new Date(log.studied_at).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(log);
    });
    return grouped;
  };

  const renderLogItem = ({ item: log }: { item: StudyLog }) => (
    <Card key={log.id} className="mb-2 p-3 bg-white dark:bg-neutral-800">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            {log.book?.title || log.manual_book_title || '自由学習'}
          </Text>
          {log.book?.author && (
            <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {log.book.author}
            </Text>
          )}
          {log.memo && (
            <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              📝 {log.memo}
            </Text>
          )}
        </View>
        <View className="items-end">
          <Chip mode="outlined" compact textStyle={{ fontSize: 10 }}>
            {formatDuration(log.duration_minutes)}
          </Chip>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date(log.studied_at).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderListView = () => {
    const groupedLogs = groupLogsByDate(filteredLogs);
    const sortedDates = Object.keys(groupedLogs).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return (
      <ScrollView className="flex-1">
        <Searchbar
          placeholder="記録を検索..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ marginBottom: 16 }}
        />
        
        {sortedDates.map(dateKey => {
          const logs = groupedLogs[dateKey];
          const totalMinutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
          
          return (
            <View key={dateKey} className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-bold text-gray-800 dark:text-gray-200">
                  {formatDate(dateKey)}
                </Text>
                <View className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                  <Text className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                    {formatDuration(totalMinutes)} • {logs.length}回
                  </Text>
                </View>
              </View>
              {logs.map(log => (
                <View key={log.id}>
                  {renderLogItem({ item: log })}
                </View>
              ))}
            </View>
          );
        })}
        
        {hasMore && (
          <TouchableOpacity
            onPress={onLoadMore}
            className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg items-center mb-4"
          >
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-blue-600 dark:text-blue-400 font-semibold">
                さらに読み込む
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const renderStatsView = () => (
    <ScrollView className="flex-1">
      <Text className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
        📈 月別統計
      </Text>
      
      {monthlyStats.map((stats, index) => (
        <Card key={index} className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-bold text-lg text-gray-800 dark:text-gray-200">
              {stats.month}
            </Text>
            <View className="bg-blue-600 px-3 py-1 rounded-full">
              <Text className="text-white font-semibold text-sm">
                {stats.totalSessions}回
              </Text>
            </View>
          </View>
          
          <View className="flex-row justify-between mb-2">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatDuration(stats.totalMinutes)}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                合計時間
              </Text>
            </View>
            
            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatDuration(stats.averagePerDay)}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                日平均
              </Text>
            </View>
          </View>
          
          {/* Progress bar */}
          <View className="bg-gray-200 dark:bg-neutral-700 h-2 rounded-full mt-2">
            <View
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              style={{
                width: `${Math.min((stats.totalMinutes / 1800) * 100, 100)}%`, // Max 30 hours
              }}
            />
          </View>
        </Card>
      ))}
    </ScrollView>
  );

  if (!visible) return null;

  console.log('StudyHistoryModal rendering:', { 
    visible, 
    studyLogsCount: studyLogs.length,
    filteredLogsCount: filteredLogs.length 
  });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: 'white',
          margin: 20,
          borderRadius: 16,
          height: '80%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <View className="flex-1">
          {/* Header */}
          <LinearGradient
            colors={['#3b82f6', '#1d4ed8']}
            className="p-4 rounded-t-2xl"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">
                📚 学習履歴
              </Text>
              <TouchableOpacity onPress={onDismiss}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* View Tabs */}
          <View className="flex-row bg-gray-100">
            {[
              { key: 'list', label: 'リスト', icon: 'list' },
              { key: 'stats', label: '統計', icon: 'bar-chart' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedView(tab.key as any)}
                className={`flex-1 py-3 items-center ${
                  selectedView === tab.key ? 'bg-white' : 'bg-gray-100'
                }`}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={20}
                  color={selectedView === tab.key ? '#3b82f6' : '#6b7280'}
                />
                <Text
                  className={`text-sm mt-1 ${
                    selectedView === tab.key
                      ? 'text-blue-600 font-semibold'
                      : 'text-gray-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <View className="flex-1 p-4 bg-gray-50 rounded-b-2xl">
            {console.log('Rendering content:', { selectedView, filteredLogsCount: filteredLogs.length })}
            {selectedView === 'list' ? (
              <View className="flex-1">
                <Text className="text-lg font-bold mb-4">学習記録リスト ({filteredLogs.length}件)</Text>
                {filteredLogs.length === 0 ? (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-500 text-center">学習記録がありません</Text>
                  </View>
                ) : (
                  <ScrollView className="flex-1">
                    {filteredLogs.slice(0, 10).map((log) => (
                      <View key={log.id} className="mb-3 p-4 bg-white rounded-lg border border-gray-200">
                        <Text className="font-semibold text-gray-800">
                          {log.book?.title || log.manual_book_title || '自由学習'}
                        </Text>
                        <Text className="text-sm text-gray-600 mt-1">
                          {log.duration_minutes}分 • {new Date(log.studied_at).toLocaleDateString('ja-JP')}
                        </Text>
                        {log.memo && (
                          <Text className="text-sm text-gray-500 mt-1">{log.memo}</Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View className="flex-1">
                <Text className="text-lg font-bold mb-4">統計情報</Text>
                <Text className="text-gray-700">月別統計がここに表示されます</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Portal>
  );
}