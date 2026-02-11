/**
 * Typing indicator component
 * Shows animated dots while the assistant is generating a response
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSettings } from '../stores/settings';

interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label = 'Generating...' }: TypingIndicatorProps) {
  const { theme, textStyle } = useSettings();
  
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    
    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 200);
    const anim3 = createAnimation(dot3, 400);
    
    anim1.start();
    anim2.start();
    anim3.start();
    
    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);
  
  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { backgroundColor: theme.primary }, dotStyle(dot1)]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.primary }, dotStyle(dot2)]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.primary }, dotStyle(dot3)]} />
      </View>
      {label && (
        <Text style={[styles.label, { color: theme.textMuted, fontSize: textStyle.fontSize - 2 }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

// Inline typing dots for use inside message bubbles
export function TypingDots() {
  const { theme } = useSettings();
  
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    
    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 150);
    const anim3 = createAnimation(dot3, 300);
    
    anim1.start();
    anim2.start();
    anim3.start();
    
    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);
  
  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        }),
      },
    ],
  });
  
  return (
    <View style={styles.inlineDotsContainer}>
      <Animated.Text style={[styles.inlineDot, { color: theme.textMuted }, dotStyle(dot1)]}>●</Animated.Text>
      <Animated.Text style={[styles.inlineDot, { color: theme.textMuted }, dotStyle(dot2)]}>●</Animated.Text>
      <Animated.Text style={[styles.inlineDot, { color: theme.textMuted }, dotStyle(dot3)]}>●</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    marginLeft: 4,
  },
  inlineDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inlineDot: {
    fontSize: 10,
  },
});
