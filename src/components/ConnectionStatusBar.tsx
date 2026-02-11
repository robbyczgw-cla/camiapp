/**
 * Connection Status Bar
 * 
 * Shows connection status at the top of the screen:
 * - Green: Connected
 * - Yellow: Connecting/Reconnecting
 * - Red: Disconnected (tap to retry)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface ConnectionStatusBarProps {
  state: ConnectionState;
  onRetry: () => void;
}

const STATUS_CONFIG = {
  connected: {
    color: '#34C759',
    text: 'Connected',
    icon: '✓',
    showBar: false, // Hide when connected
  },
  connecting: {
    color: '#FF9500',
    text: 'Connecting...',
    icon: '◐',
    showBar: true,
  },
  reconnecting: {
    color: '#FF9500',
    text: 'Reconnecting...',
    icon: '↻',
    showBar: true,
  },
  disconnected: {
    color: '#FF3B30',
    text: 'Disconnected — Tap to retry',
    icon: '✕',
    showBar: true,
  },
};

export function ConnectionStatusBar({ state, onRetry }: ConnectionStatusBarProps) {
  const config = STATUS_CONFIG[state];
  const heightAnim = useRef(new Animated.Value(config.showBar ? 36 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(config.showBar ? 1 : 0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: config.showBar ? 36 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: config.showBar ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [config.showBar, heightAnim, opacityAnim]);
  
  const handlePress = () => {
    if (state === 'disconnected') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRetry();
    }
  };
  
  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.color, height: heightAnim, opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        disabled={state !== 'disconnected'}
        activeOpacity={state === 'disconnected' ? 0.7 : 1}
      >
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={styles.text}>{config.text}</Text>
      </TouchableOpacity>
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
    gap: 6,
    paddingHorizontal: 12,
  },
  icon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
