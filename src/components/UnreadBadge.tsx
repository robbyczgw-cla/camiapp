/**
 * Unread Badge Component - Redesigned
 * 
 * Premium unread badge with:
 * - Smooth scale animation on count change
 * - Consistent styling
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { useSettings } from '../stores/settings';
import { spacing } from '../theme/colors';

interface UnreadBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export function UnreadBadge({ count, size = 'medium' }: UnreadBadgeProps) {
  const { theme } = useSettings();
  const scale = useSharedValue(1);
  
  // Bounce on count change
  useEffect(() => {
    if (count > 0) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
    }
  }, [count, scale]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  if (count === 0) return null;
  
  const displayCount = count > 99 ? '99+' : String(count);
  
  const sizeStyles = {
    small: styles.badgeSmall,
    medium: styles.badgeMedium,
    large: styles.badgeLarge,
  };
  
  const textStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };
  
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        styles.badge,
        sizeStyles[size],
        { backgroundColor: theme.primary },
        animatedStyle,
      ]}
    >
      <Text style={[styles.text, textStyles[size]]}>
        {displayCount}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSmall: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  badgeMedium: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  badgeLarge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 11,
  },
  textLarge: {
    fontSize: 13,
  },
});
