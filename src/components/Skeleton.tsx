/**
 * Skeleton Loading Components
 * 
 * Shimmer effect skeletons for loading states:
 * - SkeletonMessage: Message bubble placeholder
 * - SkeletonSession: Session list item placeholder
 * - Shimmer: Animated shimmer overlay
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, type DimensionValue } from 'react-native';
import { useSettings } from '../stores/settings';

// Shimmer animation overlay
function Shimmer({ width, height }: { width: DimensionValue; height: number }) {
  const { theme } = useSettings();
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);
  
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });
  
  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width: width as DimensionValue,
          height,
          backgroundColor: theme.surfaceVariant,
          borderRadius: 8,
          overflow: 'hidden' as const,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            backgroundColor: theme.surface,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

// Skeleton message bubble
export function SkeletonMessage({ isUser = false }: { isUser?: boolean }) {
  const { theme } = useSettings();
  
  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble,
        { opacity: 0.6 },
      ]}
    >
      <Shimmer width={isUser ? 120 : 200} height={16} />
      {!isUser && (
        <>
          <View style={{ height: 8 }} />
          <Shimmer width={160} height={16} />
          <View style={{ height: 8 }} />
          <Shimmer width={80} height={16} />
        </>
      )}
    </View>
  );
}

// Skeleton session list item
export function SkeletonSession() {
  const { theme } = useSettings();
  
  return (
    <View style={[styles.sessionItem, { borderBottomColor: theme.border }]}>
      <View style={styles.sessionContent}>
        <Shimmer width={140} height={18} />
        <View style={{ height: 8 }} />
        <Shimmer width={200} height={14} />
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
    <View>
      <SkeletonSession />
      <SkeletonSession />
      <SkeletonSession />
      <SkeletonSession />
      <SkeletonSession />
    </View>
  );
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
    opacity: 0.3,
    transform: [{ skewX: '-20deg' }],
    width: 100,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginLeft: 60,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    marginRight: 60,
  },
  sessionItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sessionContent: {
    gap: 4,
  },
  listContainer: {
    padding: 16,
    gap: 8,
  },
});
