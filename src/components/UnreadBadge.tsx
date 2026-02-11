/**
 * Unread Badge Component
 * 
 * Shows unread message count on sessions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettings } from '../stores/settings';

interface UnreadBadgeProps {
  count: number;
  size?: 'small' | 'medium';
}

export function UnreadBadge({ count, size = 'medium' }: UnreadBadgeProps) {
  const { theme } = useSettings();
  
  if (count === 0) return null;
  
  const displayCount = count > 99 ? '99+' : String(count);
  const isSmall = size === 'small';
  
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.primary },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text style={[styles.text, isSmall && styles.textSmall]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSmall: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 10,
  },
});
