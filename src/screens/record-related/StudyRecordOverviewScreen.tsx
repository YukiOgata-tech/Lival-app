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
    // Button press animation
    fabScale.value = withSpring(0.9, { duration: 100 }, () => {
      fabScale.value = withSpring(1, { duration: 200 });
    });
    fabRotation.value = withTiming(360, { duration: 500 }, () => {
      fabRotation.value = 0;
    });
    
    setShowCreateModal(true);
  };

  // Modal internal handlers moved into CreateStudyRecordModal


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
