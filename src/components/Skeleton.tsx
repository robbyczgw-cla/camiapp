/**
 * Skeleton Loading Components - Redesigned
 * 
 * Premium shimmer effect skeletons with:
 * - Smooth gradient shimmer animation
 * - Proper sizing matching actual content
 * - Multiple variants for different use cases
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../stores/settings';
import { spacing, radius } from '../theme/colors';

// Shimmer animation overlay with gradient
function Shimmer({ 
  width, 
  height,
  borderRadius = radius.sm,
}: { 
  width: DimensionValue; 
  height: number;
  borderRadius?: number;
}) {
  const { theme, isDark } = useSettings();
  const shimmerPosition = useSharedValue(0);
  
  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { 
        duration: 1500, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      false
    );
  }, [shimmerPosition]);
  
  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { 
        translateX: interpolate(
          shimmerPosition.value,
          [0, 1],
          [-200, 200]
        ) 
      },
    ],
  }));
  
  const baseColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  
  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width: width as DimensionValue,
          height,
          backgroundColor: baseColor,
          borderRadius,
        },
      ]}
    >
      <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]}>
        <LinearGradient
          colors={['transparent', shimmerColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}

// Skeleton message bubble
export function SkeletonMessage({ isUser = false }: { isUser?: boolean }) {
  const { theme, isDark } = useSettings();
  const baseColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
  
  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble,
        { backgroundColor: baseColor },
      ]}
    >
      {!isUser && (
        <View style={styles.roleRow}>
          <Shimmer width={60} height={14} borderRadius={radius.sm} />
        </View>
      )}
      <Shimmer width={isUser ? 140 : 220} height={16} />
      {!isUser && (
        <>
          <View style={{ height: spacing.sm }} />
          <Shimmer width={180} height={16} />
          <View style={{ height: spacing.sm }} />
          <Shimmer width={100} height={16} />
        </>
      )}
      <View style={{ height: spacing.sm }} />
      <View style={styles.timestampRow}>
        <Shimmer width={40} height={10} borderRadius={4} />
      </View>
    </View>
  );
}

// Skeleton session list item
export function SkeletonSession() {
  const { theme, isDark } = useSettings();
  const baseColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
  
  return (
    <View style={[styles.sessionItem, { backgroundColor: baseColor, borderColor: theme.border }]}>
      <View style={styles.sessionIconPlaceholder}>
        <Shimmer width={28} height={28} borderRadius={14} />
      </View>
      <View style={styles.sessionContent}>
        <Shimmer width={160} height={16} />
        <View style={{ height: spacing.xs }} />
        <Shimmer width={120} height={14} />
      </View>
      <View style={styles.sessionMeta}>
        <Shimmer width={30} height={10} borderRadius={4} />
      </View>
    </View>
  );
}

// Loading skeleton for messages list
export function MessageListSkeleton() {
  return (
    <View style={styles.listContainer}>
      <SkeletonMessage isUser={false} />
      <SkeletonMessage isUser={true} />
      <SkeletonMessage isUser={false} />
      <SkeletonMessage isUser={true} />
      <SkeletonMessage isUser={false} />
    </View>
  );
}

// Loading skeleton for sessions list
export function SessionListSkeleton() {
  return (
    <View style={styles.sessionsContainer}>
      <SkeletonSession />
      <SkeletonSession />
      <SkeletonSession />
      <SkeletonSession />
      <SkeletonSession />
    </View>
  );
}

// Generic skeleton line
export function SkeletonLine({ 
  width = '100%', 
  height = 14,
  borderRadius = radius.sm,
}: { 
  width?: DimensionValue; 
  height?: number;
  borderRadius?: number;
}) {
  return <Shimmer width={width} height={height} borderRadius={borderRadius} />;
}

// Skeleton paragraph (multiple lines)
export function SkeletonParagraph({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.paragraphContainer}>
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={styles.paragraphLine}>
          <Shimmer 
            width={i === lines - 1 ? '60%' : '100%'} 
            height={14} 
          />
        </View>
      ))}
    </View>
  );
}

// Skeleton avatar
export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Shimmer width={size} height={size} borderRadius={size / 2} />;
}

const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 200,
    height: '100%',
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginVertical: spacing.xs,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginLeft: 60,
    borderBottomRightRadius: spacing.xs,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    marginRight: 60,
    borderBottomLeftRadius: spacing.xs,
  },
  roleRow: {
    marginBottom: spacing.sm,
  },
  timestampRow: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  sessionIconPlaceholder: {
    width: 28,
    height: 28,
  },
  sessionContent: {
    flex: 1,
  },
  sessionMeta: {
    alignItems: 'flex-end',
  },
  listContainer: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sessionsContainer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  paragraphContainer: {
    gap: spacing.sm,
  },
  paragraphLine: {
    marginBottom: spacing.xs,
  },
});
