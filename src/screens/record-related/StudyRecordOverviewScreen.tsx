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
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { getStudyLogs, getStudyStats } from '@/lib/studyLogApi';
import CreateStudyRecordModal from '@/components/study/CreateStudyRecordModal';
import FuturisticWeeklyChart from '@/components/study/FuturisticWeeklyChart';
import StudyHistoryModal from '@/components/study/StudyHistoryModal';
import LottieView from 'lottie-react-native';
import type { StudyLog, StudyStats } from '@/types/StudyLogTypes';

export default function StudyRecordScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Animation values for FAB
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);
  
  // Chart states
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  
  // Create-record form states moved into CreateStudyRecordModal component
  // memoDraftRef removed; handled inside CreateStudyRecordModal

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
    // Simple button press animation
    fabScale.value = withSpring(0.95, { damping: 15, stiffness: 300 }, () => {
      fabScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });
    
    setShowCreateModal(true);
  };

  // Modal internal handlers moved into CreateStudyRecordModal


  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <LottieView
          source={require('@assets/lotties/file-loading1.json')}
          autoPlay
          loop
          style={{ width: 120, height: 120 }}
        />
        <Text className="mt-6 text-gray-700 font-semibold text-lg tracking-wider">
          システム初期化中...
        </Text>
        <View className="mt-2 w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <Animated.View 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            style={animatedFabStyle}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {/* Modern Header with Safe Area */}
        <View
          style={{ paddingTop: insets.top + 20 }}
          className="pb-8 px-6 bg-white border-b border-gray-100"
        >
          <View className="flex-row items-center justify-between">
            <Animated.View style={animatedFabStyle}>
              <Text className="text-3xl font-bold text-gray-800 tracking-wide">
                学習記録
              </Text>
              <Text className="text-gray-500 text-sm tracking-wider mt-1">
                Learning Analytics Dashboard
              </Text>
            </Animated.View>
            <TouchableOpacity 
              onPress={() => {
                setShowHistoryModal(true);
              }}
              className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl shadow-sm"
              activeOpacity={0.8}
            >
              <Image
                source={require('@assets/images/history.png')}
                style={{
                  width: 80,
                  height: 24,
                }}
                contentFit="cover"
              />
            </TouchableOpacity>
          </View>
        </View>
        
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
            <Card className="bg-white border border-gray-200 shadow-sm">
              <View className="p-8">
                <View className="items-center">
                <Animated.View 
                  style={[
                    animatedFabStyle,
                    {
                      shadowColor: '#3b82f6',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 4,
                    }
                  ]}
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl items-center justify-center mb-4"
                >
                  <MaterialIcons name="menu-book" size={32} color="white" />
                </Animated.View>
                <Text className="text-gray-800 font-bold text-lg mb-2">
                  学習記録を始めましょう！
                </Text>
                <Text className="text-gray-600 text-center text-sm leading-5">
                  右下の「+」ボタンから{'\n'}最初の学習記録を追加してみてください
                </Text>
                </View>
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
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 24,
              elevation: 16,
            }
          ]}
          className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-3xl border-2 border-white/20"
        >
          {/* Inner shadow for depth */}
          <View className="absolute inset-1 bg-gradient-to-t from-black/10 to-transparent rounded-2xl" />
          
          {/* Glow effect */}
          <View 
            style={{
              position: 'absolute',
              inset: -4,
              backgroundColor: 'transparent',
              borderRadius: 24,
              shadowColor: '#60a5fa',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 20,
              elevation: 20,
            }}
          />
          
          <Image
            source={require('@assets/images/add-button-normal.png')}
            style={{
              width: 96,
              height: 64,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
            contentFit="contain"
          />
          
          {/* Highlight effect */}
          <View 
            className="absolute top-2 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Create Study Record Modal (extracted) */}
      <CreateStudyRecordModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onCreated={async () => { await loadData(); }}
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

// (IMEセーフ入力や内部状態は CreateStudyRecordModal に移行済み)
