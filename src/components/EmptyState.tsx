/**
 * Empty State Components - Redesigned
 * 
 * Premium empty state displays with:
 * - Animated icons
 * - Helpful illustrations
 * - Clear typography hierarchy
 * - Action buttons
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { useSettings } from '../stores/settings';
import { spacing, radius, shadows } from '../theme/colors';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon = '📭', title, subtitle, action }: EmptyStateProps) {
  const { theme } = useSettings();
  
  const iconScale = useSharedValue(1);
  const iconRotation = useSharedValue(0);
  
  useEffect(() => {
    // Subtle breathing animation
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Subtle wiggle
    iconRotation.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 200 }),
          withTiming(3, { duration: 200 }),
          withTiming(-3, { duration: 200 }),
          withTiming(0, { duration: 200 }),
          withDelay(3000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );
  }, [iconScale, iconRotation]);
  
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));
  
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={styles.container}
    >
      <Animated.Text style={[styles.icon, iconAnimatedStyle]}>
        {icon}
      </Animated.Text>
      
      <Animated.Text 
        entering={FadeInUp.delay(100).duration(300)}
        style={[styles.title, { color: theme.text }]}
      >
        {title}
      </Animated.Text>
      
      {subtitle && (
        <Animated.Text 
          entering={FadeInUp.delay(200).duration(300)}
          style={[styles.subtitle, { color: theme.textMuted }]}
        >
          {subtitle}
        </Animated.Text>
      )}
      
      {action && (
        <Animated.View entering={FadeInUp.delay(300).duration(300)}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }, shadows.md]}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// Pre-configured empty states
export function EmptyMessages({ onStartChat }: { onStartChat?: () => void }) {
  const { theme } = useSettings();
  
  const iconScale = useSharedValue(1);
  
  useEffect(() => {
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [iconScale]);
  
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  
  return (
    <Animated.View 
      entering={FadeIn.duration(400)}
      style={styles.container}
    >
      <Animated.Text style={[styles.largeIcon, iconAnimatedStyle]}>
        🦎
      </Animated.Text>
      
      <Animated.Text 
        entering={FadeInUp.delay(150).duration(300)}
        style={[styles.welcomeTitle, { color: theme.text }]}
      >
        Welcome to Cami
      </Animated.Text>
      
      <Animated.Text 
        entering={FadeInUp.delay(250).duration(300)}
        style={[styles.welcomeSubtitle, { color: theme.textMuted }]}
      >
        Your AI assistant is ready to help.{'\n'}Start a conversation below!
      </Animated.Text>
      
      {/* Feature hints */}
      <Animated.View 
        entering={FadeInUp.delay(350).duration(300)}
        style={styles.hintsContainer}
      >
        <View style={[styles.hintItem, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={styles.hintIcon}>💬</Text>
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>Chat naturally</Text>
        </View>
        <View style={[styles.hintItem, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={styles.hintIcon}>📷</Text>
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>Share images</Text>
        </View>
        <View style={[styles.hintItem, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={styles.hintIcon}>🔊</Text>
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>Listen to responses</Text>
        </View>
      </Animated.View>
      
      {onStartChat && (
        <Animated.View entering={FadeInUp.delay(450).duration(300)}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }, shadows.md]}
            onPress={onStartChat}
            activeOpacity={0.85}
          >
            <Text style={styles.actionText}>Say Hello 👋</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export function EmptySessions({ onNewSession }: { onNewSession?: () => void }) {
  const { theme } = useSettings();
  
  return (
    <EmptyState
      icon="💬"
      title="No sessions yet"
      subtitle="Create a new chat to get started"
      action={onNewSession ? { label: 'Start New Chat', onPress: onNewSession } : undefined}
    />
  );
}

export function EmptySearch({ query }: { query?: string }) {
  const { theme } = useSettings();
  
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={styles.searchEmptyContainer}
    >
      <Text style={styles.searchEmptyIcon}>🔍</Text>
      <Text style={[styles.searchEmptyTitle, { color: theme.text }]}>
        No results found
      </Text>
      <Text style={[styles.searchEmptySubtitle, { color: theme.textMuted }]}>
        {query 
          ? `No matches for "${query.length > 30 ? query.slice(0, 30) + '...' : query}"`
          : 'Try a different search term'
        }
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  largeIcon: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  hintsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  hintIcon: {
    fontSize: 14,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchEmptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchEmptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchEmptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
  },
});
