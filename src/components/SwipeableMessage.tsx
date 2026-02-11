/**
 * Swipeable Message Wrapper
 * 
 * Swipe actions on messages:
 * - Swipe left: Reply/Quote
 * - Swipe right: Copy
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';

interface SwipeableMessageProps {
  children: React.ReactNode;
  messageText: string;
  onReply?: (text: string) => void;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 80;

export function SwipeableMessage({ 
  children, 
  messageText, 
  onReply,
  enabled = true 
}: SwipeableMessageProps) {
  const { theme } = useSettings();
  const translateX = useRef(new Animated.Value(0)).current;
  const leftOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const rightOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  
  const handleCopy = useCallback(async () => {
    if (!messageText) return;
    try {
      await Clipboard.setStringAsync(messageText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Failed to copy:', error);
    }
  }, [messageText]);
  
  const handleReply = useCallback(() => {
    if (!messageText || !onReply) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReply(messageText);
  }, [messageText, onReply]);
  
  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Clamp translation
      const clampedX = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, event.translationX));
      translateX.setValue(clampedX);
      
      // Haptic feedback at threshold
      if (Math.abs(clampedX) >= SWIPE_THRESHOLD) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd((event) => {
      const { translationX } = event;
      
      if (translationX > SWIPE_THRESHOLD) {
        // Swiped right - Copy
        runOnJS(handleCopy)();
      } else if (translationX < -SWIPE_THRESHOLD) {
        // Swiped left - Reply
        runOnJS(handleReply)();
      }
      
      // Animate back to center
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    });
  
  if (!enabled) {
    return <>{children}</>;
  }
  
  return (
    <View style={styles.container}>
      {/* Left action (copy) - shown on right swipe */}
      <Animated.View style={[styles.actionLeft, { opacity: leftOpacity }]}>
        <View style={[styles.actionIcon, { backgroundColor: theme.primary }]}>
          <Text style={styles.actionEmoji}>📋</Text>
        </View>
        <Text style={[styles.actionText, { color: theme.textMuted }]}>Copy</Text>
      </Animated.View>
      
      {/* Right action (reply) - shown on left swipe */}
      <Animated.View style={[styles.actionRight, { opacity: rightOpacity }]}>
        <Text style={[styles.actionText, { color: theme.textMuted }]}>Reply</Text>
        <View style={[styles.actionIcon, { backgroundColor: theme.primary }]}>
          <Text style={styles.actionEmoji}>↩️</Text>
        </View>
      </Animated.View>
      
      {/* Message content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  actionLeft: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionRight: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
