// src/components/study/WeeklyTimeChart.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface DayData {
  day: string;
  date: string;
  minutes: number;
  sessions: number;
}

interface WeeklyTimeChartProps {
  data: DayData[];
  weekOffset?: number;
  onWeekChange?: (offset: number) => void;
  maxMinutes?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 80;
const barWidth = (chartWidth - 60) / 7; // 7 days with spacing

export default function WeeklyTimeChart({
  data,
  weekOffset = 0,
  onWeekChange,
  maxMinutes = 240, // 4 hours default max
}: WeeklyTimeChartProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation values for bars
  const barHeights = data.map(() => useSharedValue(0));
  const barOpacities = data.map(() => useSharedValue(0));

  // Calculate actual max for better scaling
  const actualMax = Math.max(maxMinutes, Math.max(...data.map(d => d.minutes)));
  const chartHeight = 200;

  useEffect(() => {
    // Animate bars on data change
    data.forEach((dayData, index) => {
      const height = (dayData.minutes / actualMax) * chartHeight;
      
      barHeights[index].value = withDelay(
        index * 100,
        withSpring(height, {
          damping: 15,
          stiffness: 150,
        })
      );
      
      barOpacities[index].value = withDelay(
        index * 100,
        withSpring(1, {
          damping: 20,
          stiffness: 200,
        })
      );
    });
  }, [data, actualMax]);

  const handlePreviousWeek = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    onWeekChange?.(weekOffset - 1);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const handleNextWeek = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    onWeekChange?.(weekOffset + 1);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const getWeekRange = () => {
    if (data.length === 0) return '';
    const firstDay = data[0].date;
    const lastDay = data[data.length - 1].date;
    return `${new Date(firstDay).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} - ${new Date(lastDay).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`;
  };

  const getTotalWeeklyTime = () => {
    return data.reduce((total, day) => total + day.minutes, 0);
  };

  const getAverageDaily = () => {
    const total = getTotalWeeklyTime();
    return Math.round(total / 7);
  };

  return (
    <Card className="mx-4 mb-4 bg-white dark:bg-neutral-800">
      <View className="p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={handlePreviousWeek}
          disabled={isAnimating}
          className="p-2 rounded-full bg-gray-100 dark:bg-neutral-700"
        >
          <MaterialIcons name="chevron-left" size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <View className="items-center">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-200">
            週間学習時間
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {getWeekRange()}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleNextWeek}
          disabled={isAnimating || weekOffset >= 0}
          className={`p-2 rounded-full ${weekOffset >= 0 ? 'bg-gray-50 dark:bg-neutral-800' : 'bg-gray-100 dark:bg-neutral-700'}`}
        >
          <MaterialIcons 
            name="chevron-right" 
            size={24} 
            color={weekOffset >= 0 ? '#d1d5db' : '#6b7280'} 
          />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View className="flex-row justify-around mb-6 bg-gray-50 dark:bg-neutral-700 rounded-lg p-3">
        <View className="items-center">
          <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatDuration(getTotalWeeklyTime())}
          </Text>
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            合計時間
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatDuration(getAverageDaily())}
          </Text>
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            平均/日
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.filter(d => d.minutes > 0).length}
          </Text>
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            学習日数
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View className="items-center">
        <View 
          style={{ 
            width: chartWidth, 
            height: chartHeight + 40, 
            position: 'relative' 
          }}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <View
              key={index}
              className="absolute w-full border-t border-gray-200 dark:border-neutral-600"
              style={{
                top: chartHeight * (1 - ratio),
                opacity: 0.3,
              }}
            />
          ))}

          {/* Bars */}
          {data.map((dayData, index) => {
            const animatedBarStyle = useAnimatedStyle(() => ({
              height: barHeights[index].value,
              opacity: barOpacities[index].value,
            }));

            const isSelected = selectedDay === index;
            const hasData = dayData.minutes > 0;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDay(isSelected ? null : index)}
                style={{
                  position: 'absolute',
                  left: index * (barWidth + 8) + 4,
                  bottom: 30,
                  width: barWidth,
                  alignItems: 'center',
                }}
              >
                {/* Bar */}
                <Animated.View style={[animatedBarStyle, { width: barWidth - 4 }]}>
                  <LinearGradient
                    colors={
                      hasData 
                        ? isSelected
                          ? ['#3b82f6', '#1d4ed8']
                          : ['#60a5fa', '#3b82f6']
                        : ['#e5e7eb', '#d1d5db']
                    }
                    style={{
                      flex: 1,
                      width: '100%',
                      borderRadius: 4,
                      minHeight: 4, // Minimum visible height
                    }}
                  />
                </Animated.View>

                {/* Selected day info */}
                {isSelected && hasData && (
                  <View className="absolute -top-12 bg-gray-800 dark:bg-white rounded-lg px-2 py-1 shadow-lg">
                    <Text className="text-xs text-white dark:text-gray-800 font-semibold">
                      {formatDuration(dayData.minutes)}
                    </Text>
                    <Text className="text-xs text-gray-300 dark:text-gray-600">
                      {dayData.sessions}回
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* X-axis labels */}
          {data.map((dayData, index) => (
            <View
              key={`label-${index}`}
              style={{
                position: 'absolute',
                left: index * (barWidth + 8) + 4,
                bottom: 0,
                width: barWidth,
                alignItems: 'center',
              }}
            >
              <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {dayData.day}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(dayData.date).getDate()}
              </Text>
            </View>
          ))}
        </View>

        {/* Y-axis labels */}
        <View className="absolute left-0 top-0 h-full justify-between py-2">
          {[actualMax, actualMax * 0.75, actualMax * 0.5, actualMax * 0.25, 0].map((value, index) => (
            <Text
              key={index}
              className="text-xs text-gray-500 dark:text-gray-400"
              style={{ transform: [{ translateY: -6 }] }}
            >
              {Math.round(value / 60 * 10) / 10}h
            </Text>
          ))}
        </View>
      </View>

      {/* Footer tip */}
      <View className="mt-4 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Text className="text-xs text-blue-700 dark:text-blue-300 text-center">
          📊 棒グラフをタップすると詳細が表示されます
        </Text>
      </View>
      </View>
    </Card>
  );
}