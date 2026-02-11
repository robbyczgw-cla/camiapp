/**
 * Connection Status Bar - Redesigned
 * 
 * Premium status bar with:
 * - Smooth slide animations
 * - Pulse animation for connecting state
 * - Touch feedback for retry
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { spacing } from '../theme/colors';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface ConnectionStatusBarProps {
  state: ConnectionState;
  onRetry: () => void;
}

const STATUS_CONFIG = {
  connected: {
    color: '#22c55e',
    text: 'Connected',
    icon: '✓',
    showBar: false,
  },
  connecting: {
    color: '#f59e0b',
    text: 'Connecting...',
    icon: '◐',
    showBar: true,
  },
  reconnecting: {
    color: '#f59e0b',
    text: 'Reconnecting...',
    icon: '↻',
    showBar: true,
  },
  disconnected: {
    color: '#ef4444',
    text: 'Disconnected — Tap to retry',
    icon: '✕',
    showBar: true,
  },
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ConnectionStatusBar({ state, onRetry }: ConnectionStatusBarProps) {
  const config = STATUS_CONFIG[state];
  
  const barHeight = useSharedValue(config.showBar ? 40 : 0);
  const barOpacity = useSharedValue(config.showBar ? 1 : 0);
  const iconRotation = useSharedValue(0);
  const iconPulse = useSharedValue(1);
  const pressScale = useSharedValue(1);
  
  // Animate bar visibility
  useEffect(() => {
    barHeight.value = withSpring(config.showBar ? 40 : 0, { damping: 20 });
    barOpacity.value = withTiming(config.showBar ? 1 : 0, { duration: 200 });
  }, [config.showBar, barHeight, barOpacity]);
  
  // Icon animations for connecting states
  useEffect(() => {
    if (state === 'reconnecting') {
      iconRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else if (state === 'connecting') {
      iconPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      iconRotation.value = withTiming(0, { duration: 200 });
      iconPulse.value = withTiming(1, { duration: 200 });
    }
  }, [state, iconRotation, iconPulse]);
  
  const barAnimatedStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
    opacity: barOpacity.value,
  }));
  
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${iconRotation.value}deg` },
      { scale: iconPulse.value },
    ],
  }));
  
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  
  const handlePress = () => {
    if (state === 'disconnected') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      pressScale.value = withSequence(
        withSpring(0.95, { damping: 15 }),
        withSpring(1, { damping: 12 })
      );
      onRetry();
    }
  };
  
  const handlePressIn = () => {
    if (state === 'disconnected') {
      pressScale.value = withSpring(0.97, { damping: 15 });
    }
  };
  
  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 12 });
  };
  
  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.color },
        barAnimatedStyle,
      ]}
    >
      <AnimatedTouchable
        style={[styles.touchable, pressAnimatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={state !== 'disconnected'}
        activeOpacity={1}
      >
        <Animated.Text style={[styles.icon, iconAnimatedStyle]}>
          {config.icon}
        </Animated.Text>
        <Text style={styles.text}>{config.text}</Text>
      </AnimatedTouchable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  icon: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
