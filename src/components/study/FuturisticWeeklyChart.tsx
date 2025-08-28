// src/components/study/FuturisticWeeklyChart.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

interface DayData {
  day: string;
  date: string;
  minutes: number;
  sessions: number;
}

interface FuturisticWeeklyChartProps {
  data: DayData[];
  weekOffset?: number;
  onWeekChange?: (offset: number) => void;
  maxMinutes?: number;
  loading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64; // More padding for futuristic look
const barWidth = (chartWidth - 72) / 7; // 7 days with more spacing

export default function FuturisticWeeklyChart({
  data,
  weekOffset = 0,
  onWeekChange,
  maxMinutes = 240,
  loading = false,
}: FuturisticWeeklyChartProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation values
  const barHeights = data.map(() => useSharedValue(0));
  const barOpacities = data.map(() => useSharedValue(0));
  const containerScale = useSharedValue(0.95);
  const glowOpacity = useSharedValue(0);

  // Calculate metrics with unique values
  const actualMax = Math.max(maxMinutes, Math.max(...data.map(d => d.minutes)));
  const chartHeight = 160;
  
  // Enhanced metrics calculation
  const weeklyMetrics = React.useMemo(() => {
    const totalMinutes = data.reduce((sum, day) => sum + day.minutes, 0);
    const totalSessions = data.reduce((sum, day) => sum + day.sessions, 0);
    const activeDays = data.filter(d => d.minutes > 0).length;
    const averagePerActiveDay = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;
    const consistency = Math.round((activeDays / 7) * 100);
    const peakDay = data.reduce((max, day) => day.minutes > max.minutes ? day : max, data[0]);
    
    return {
      totalMinutes,
      totalSessions,
      activeDays,
      averagePerActiveDay,
      consistency,
      peakDay: peakDay?.day || '--',
      peakMinutes: peakDay?.minutes || 0,
    };
  }, [data]);

  useEffect(() => {
    // Entry animation
    containerScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    glowOpacity.value = withTiming(1, { duration: 1000 });

    // Animate bars with minimum height for visibility
    data.forEach((dayData, index) => {
      let height = 0;
      if (dayData.minutes > 0) {
        // Ensure bars are visible - use 80% of chart height for scaling
        height = Math.max((dayData.minutes / actualMax) * (chartHeight * 0.8), 20); // Minimum 20px height
      } else {
        height = 4; // Small height for empty days to show baseline
      }
      
      barHeights[index].value = withDelay(
        index * 80,
        withSpring(height, {
          damping: 12,
          stiffness: 100,
        })
      );
      
      barOpacities[index].value = withDelay(
        index * 80,
        withSpring(1, {
          damping: 20,
          stiffness: 150,
        })
      );
    });
  }, [data, actualMax]);

  const handlePreviousWeek = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    onWeekChange?.(weekOffset - 1);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const handleNextWeek = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    onWeekChange?.(weekOffset + 1);
    setTimeout(() => setIsAnimating(false), 600);
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

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (loading) {
    return (
      <View className="mx-4 mb-6 h-80 bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6 items-center justify-center">
        <LottieView
          source={require('@assets/lotties/file-loading1.json')}
          autoPlay
          loop
          style={{ width: 100, height: 100 }}
        />
        <Text className="text-cyan-400 mt-4 font-mono text-sm tracking-wider">
          データ解析中...
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={animatedContainerStyle} className="mx-4 mb-6">
      {/* Outer glow effect */}
      <Animated.View style={animatedGlowStyle} className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-xl" />
      
      {/* Main container */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        className="rounded-3xl border-2 border-cyan-500/40 overflow-hidden shadow-2xl"
      >
        {/* Enhanced animated grid background */}
        <View className="absolute inset-0 opacity-20">
          <View className="flex-1 border-l border-r border-cyan-300/30" style={{ marginLeft: '14.28%', width: '71.44%' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} className="flex-1 border-t border-cyan-300/30" />
            ))}
          </View>
          {/* Horizontal scanning line */}
          <View className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
        </View>

        {/* Header section */}
        <View className="p-6 pb-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={handlePreviousWeek}
              disabled={isAnimating}
              className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 items-center justify-center"
            >
              <MaterialIcons name="chevron-left" size={24} color="#22d3ee" />
            </TouchableOpacity>
            
            <View className="items-center">
              <Text className="text-cyan-100 text-lg font-bold tracking-wide font-mono">
                週間学習分析
              </Text>
              <Text className="text-cyan-400/80 text-sm font-mono tracking-wider mt-1">
                {getWeekRange()}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={handleNextWeek}
              disabled={isAnimating || weekOffset >= 0}
              className={`w-12 h-12 rounded-xl border items-center justify-center ${
                weekOffset >= 0 
                  ? 'bg-slate-800/50 border-slate-700/50' 
                  : 'bg-cyan-500/20 border-cyan-400/30'
              }`}
            >
              <MaterialIcons 
                name="chevron-right" 
                size={24} 
                color={weekOffset >= 0 ? '#475569' : '#22d3ee'} 
              />
            </TouchableOpacity>
          </View>

          {/* Enhanced metrics grid */}
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1 min-w-[45%] bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl p-4 border border-blue-400/20">
              <Text className="text-blue-400 text-xs font-mono tracking-wider mb-1">総学習時間</Text>
              <Text className="text-blue-100 text-xl font-bold font-mono">
                {formatDuration(weeklyMetrics.totalMinutes)}
              </Text>
            </View>
            
            <View className="flex-1 min-w-[45%] bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 rounded-2xl p-4 border border-emerald-400/20">
              <Text className="text-emerald-400 text-xs font-mono tracking-wider mb-1">連続日数</Text>
              <Text className="text-emerald-100 text-xl font-bold font-mono">
                {weeklyMetrics.activeDays}日
              </Text>
            </View>
            
            <View className="flex-1 min-w-[45%] bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-2xl p-4 border border-purple-400/20">
              <Text className="text-purple-400 text-xs font-mono tracking-wider mb-1">最大日</Text>
              <Text className="text-purple-100 text-xl font-bold font-mono">
                {weeklyMetrics.peakDay}
              </Text>
            </View>
            
            <View className="flex-1 min-w-[45%] bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-2xl p-4 border border-amber-400/20">
              <Text className="text-amber-400 text-xs font-mono tracking-wider mb-1">平均時間</Text>
              <Text className="text-amber-100 text-xl font-bold font-mono">
                {formatDuration(weeklyMetrics.averagePerActiveDay)}
              </Text>
            </View>
          </View>
        </View>

        {/* Chart section */}
        <View className="px-6 pb-6">
          <View className="relative" style={{ height: chartHeight + 60 }}>
            {/* Y-axis labels */}
            <View className="absolute left-0 top-0 h-full justify-between py-1">
              {[actualMax, actualMax * 0.75, actualMax * 0.5, actualMax * 0.25, 0].map((value, index) => (
                <Text
                  key={index}
                  className="text-cyan-300/80 text-xs font-mono font-bold"
                  style={{ transform: [{ translateY: -8 }] }}
                >
                  {Math.round(value / 60 * 10) / 10}h
                </Text>
              ))}
            </View>

            {/* Bars container */}
            <View className="ml-10 flex-1">
              <View className="flex-row items-end justify-between h-full relative">
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
                      className="items-center relative"
                      style={{ width: barWidth }}
                    >
                      {/* Bar */}
                      <Animated.View 
                        style={[
                          animatedBarStyle, 
                          { 
                            width: barWidth - 8,
                            backgroundColor: hasData ? 'transparent' : '#2d3748',
                            borderRadius: 4,
                            borderTopLeftRadius: 6,
                            borderTopRightRadius: 6,
                          }
                        ]} 
                        className="relative"
                      >
                        {hasData ? (
                          <LinearGradient
                            colors={
                              isSelected
                                ? ['#00ffff', '#00ccff', '#0080ff'] // Bright cyan-blue for selected
                                : ['#00d4ff', '#00b4d8', '#0096c7'] // Bright cyan for data
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ 
                              flex: 1, 
                              borderRadius: 4,
                              borderTopLeftRadius: 6,
                              borderTopRightRadius: 6,
                            }}
                          >
                            {/* Enhanced glow effect for active bars */}
                            <View className="absolute inset-0 bg-cyan-300/30" style={{ borderRadius: 4, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
                            <View className="absolute -inset-1 bg-cyan-400/10 blur-sm" style={{ borderRadius: 4, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
                            
                            {/* Scanning line animation for selected bar */}
                            {isSelected && (
                              <View className="absolute top-0 left-0 right-0 h-0.5 bg-white animate-pulse" />
                            )}
                          </LinearGradient>
                        ) : null}
                      </Animated.View>

                      {/* Floating data tooltip */}
                      {isSelected && hasData && (
                        <View className="absolute -top-16 bg-slate-900/95 backdrop-blur-sm rounded-xl px-3 py-2 border border-cyan-400/30">
                          <Text className="text-cyan-100 text-sm font-mono font-bold">
                            {formatDuration(dayData.minutes)}
                          </Text>
                          <Text className="text-cyan-400/80 text-xs font-mono">
                            {dayData.sessions} sessions
                          </Text>
                        </View>
                      )}

                      {/* Day labels */}
                      <View className="mt-3 items-center">
                        <Text className={`text-sm font-mono font-bold ${
                          hasData ? 'text-cyan-200' : 'text-slate-400'
                        }`}>
                          {dayData.day}
                        </Text>
                        <Text className={`text-xs font-mono mt-1 ${
                          hasData ? 'text-cyan-300/80' : 'text-slate-500'
                        }`}>
                          {new Date(dayData.date).getDate()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Interactive hint */}
          <View className="mt-4 bg-slate-800/50 rounded-xl p-3 border border-cyan-500/20 flex-row items-center justify-center">
            <Image
              source={require('@assets/images/graph-01.png')}
              style={{ width: 18, height: 18, marginRight: 6 }}
            />
            <Text className="text-cyan-300/80 text-xs font-mono tracking-wider">
              棒グラフをタップして詳細表示 • 矢印で週を移動
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}