/**
 * Empty State Components
 * 
 * Consistent empty state displays:
 * - EmptyMessages: "No messages yet"
 * - EmptySessions: "No sessions"
 * - EmptySearch: "No results found"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSettings } from '../stores/settings';

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
  
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      )}
      {action && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={action.onPress}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Pre-configured empty states
export function EmptyMessages({ onStartChat }: { onStartChat?: () => void }) {
  return (
    <EmptyState
      icon="🦎"
      title="No messages yet"
      subtitle="Start a conversation with Cami"
      action={onStartChat ? { label: 'Say Hello', onPress: onStartChat } : undefined}
    />
  );
}

export function EmptySessions({ onNewSession }: { onNewSession?: () => void }) {
  return (
    <EmptyState
      icon="💬"
      title="No sessions"
      subtitle="Create a new chat to get started"
      action={onNewSession ? { label: 'New Chat', onPress: onNewSession } : undefined}
    />
  );
}

export function EmptySearch({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      subtitle={query ? `No matches for "${query}"` : 'Try a different search term'}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  icon: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
