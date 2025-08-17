import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';

export default function MascotOverlay({
  visible, emoji, label
}: { visible: boolean; emoji: string; label?: string }) {
  const translate = useRef(new Animated.Value(40)).current;
  const opacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translate, { toValue: 0, useNativeDriver: true }),
        Animated.timing(opacity,   { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, { toValue: 40, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity,   { toValue: 0,  duration: 150, useNativeDriver: true })
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, transform: [{ translateY: translate }] }]}
    >
      <View style={styles.card}>
        <Text style={styles.emoji}>{emoji}</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  wrap: { position:'absolute', left:16, right:16, bottom:110, alignItems:'center' },
  card: { backgroundColor:'white', borderRadius:16, paddingHorizontal:14, paddingVertical:10,
          shadowColor:'#000', shadowOpacity:0.12, shadowRadius:10, shadowOffset:{width:0,height:6}, elevation:3,
          flexDirection:'row', alignItems:'center' },
  emoji:{ fontSize:22, marginRight:8 }, label:{ color:'#111827' }
});
