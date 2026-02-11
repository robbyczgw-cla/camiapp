/**
 * Scroll to bottom button
 * Shows when user has scrolled up in a conversation
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSettings } from '../stores/settings';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onPress: () => void;
  unreadCount?: number;
}

export function ScrollToBottomButton({ visible, onPress, unreadCount = 0 }: ScrollToBottomButtonProps) {
  const { theme } = useSettings();
  
  if (!visible) return null;
  
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.Text style={styles.arrow}>↓</Animated.Text>
      {unreadCount > 0 && (
        <Animated.View style={[styles.badge, { backgroundColor: theme.error }]}>
          <Animated.Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Animated.Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  arrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
