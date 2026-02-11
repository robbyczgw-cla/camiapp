/**
 * New Messages Pill - Redesigned
 * 
 * Premium notification pill with:
 * - Smooth slide-in animation
 * - Bounce effect for new messages
 * - Touch feedback
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import { spacing, radius, shadows } from '../theme/colors';

interface NewMessagesPillProps {
  count: number;
  visible: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function NewMessagesPill({ count, visible, onPress }: NewMessagesPillProps) {
  const { theme } = useSettings();
  
  const pillScale = useSharedValue(1);
  const bounceValue = useSharedValue(0);
  
  // Bounce animation when count increases
  useEffect(() => {
    if (count > 0) {
      pillScale.value = withSequence(
        withSpring(1.08, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
    }
  }, [count, pillScale]);
  
  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pillScale.value = withSequence(
      withSpring(0.95, { damping: 15 }),
      withSpring(1, { damping: 12 })
    );
    onPress();
  };
  
  const handlePressIn = () => {
    pillScale.value = withSpring(0.95, { damping: 15 });
  };
  
  const handlePressOut = () => {
    pillScale.value = withSpring(1, { damping: 12 });
  };
  
  if (!visible || count === 0) return null;
  
  return (
    <Animated.View
      entering={SlideInUp.springify().damping(15)}
      exiting={SlideOutUp.springify().damping(20)}
      style={styles.wrapper}
    >
      <AnimatedTouchable
        style={[
          styles.container, 
          { backgroundColor: theme.primary },
          shadows.md,
          pillAnimatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.text}>
          {count} new message{count !== 1 ? 's' : ''}
        </Text>
      </AnimatedTouchable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  arrow: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
