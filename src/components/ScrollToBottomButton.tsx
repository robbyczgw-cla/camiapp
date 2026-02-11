/**
 * Scroll to Bottom Button - Redesigned
 * 
 * Premium floating action button with:
 * - Smooth enter/exit animations
 * - Pulse animation for new messages
 * - Subtle shadow
 * - Haptic feedback
 */

import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSettings } from '../stores/settings';
import { spacing, radius, shadows } from '../theme/colors';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onPress: () => void;
  unreadCount?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ScrollToBottomButton({ 
  visible, 
  onPress, 
  unreadCount = 0 
}: ScrollToBottomButtonProps) {
  const { theme } = useSettings();
  
  const buttonScale = useSharedValue(1);
  const arrowBounce = useSharedValue(0);
  const badgePulse = useSharedValue(1);
  
  // Arrow bounce animation
  useEffect(() => {
    arrowBounce.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 400 })
      ),
      -1,
      true
    );
  }, [arrowBounce]);
  
  // Badge pulse animation when there are unread messages
  useEffect(() => {
    if (unreadCount > 0) {
      badgePulse.value = withRepeat(
        withSequence(
          withSpring(1.15, { damping: 8 }),
          withSpring(1, { damping: 8 })
        ),
        3,
        false
      );
    } else {
      badgePulse.value = 1;
    }
  }, [unreadCount, badgePulse]);
  
  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(arrowBounce.value, [0, 1], [0, 3]) },
    ],
  }));
  
  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));
  
  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9, { damping: 15 });
  };
  
  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 12 });
  };
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  if (!visible) return null;
  
  return (
    <Animated.View 
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.springify().damping(20)}
      style={styles.container}
    >
      <AnimatedTouchable
        style={[
          styles.button, 
          { backgroundColor: theme.primary },
          shadows.lg,
          buttonAnimatedStyle,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.Text style={[styles.arrow, arrowAnimatedStyle]}>↓</Animated.Text>
        
        {unreadCount > 0 && (
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={[
              styles.badge, 
              { backgroundColor: theme.error },
              badgeAnimatedStyle,
            ]}
          >
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </AnimatedTouchable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
