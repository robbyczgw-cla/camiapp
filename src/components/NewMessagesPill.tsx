/**
 * New Messages Pill
 * 
 * Shows "X new messages" when user is scrolled up
 * Tapping scrolls to bottom
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';

interface NewMessagesPillProps {
  count: number;
  visible: boolean;
  onPress: () => void;
}

export function NewMessagesPill({ count, visible, onPress }: NewMessagesPillProps) {
  const { theme } = useSettings();
  
  if (!visible || count === 0) return null;
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.primary }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.arrow}>↓</Text>
      <Text style={styles.text}>
        {count} new message{count !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  arrow: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
