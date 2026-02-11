/**
 * Session drawer/sidebar for session management
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import { StorageHelpers } from '../stores/storage';
import { UnreadBadge } from './UnreadBadge';
import { getCachedTitle } from '../services/smartTitles';
import type { SessionMeta } from '../types';

interface SessionDrawerProps {
  visible: boolean;
  onClose: () => void;
  sessions: SessionMeta[];
  currentSessionKey: string;
  onSelectSession: (sessionKey: string) => void;
  onNewSession: () => void;
  onRefresh: () => Promise<void>;
  unreadCounts?: Record<string, number>;
}

export function SessionDrawer({
  visible,
  onClose,
  sessions,
  currentSessionKey,
  onSelectSession,
  onNewSession,
  onRefresh,
  unreadCounts = {},
}: SessionDrawerProps) {
  const { theme } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinnedSessions, setPinnedSessions] = useState(() => StorageHelpers.getPinnedSessions());

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.label?.toLowerCase().includes(query) ||
        s.title?.toLowerCase().includes(query) ||
        s.derivedTitle?.toLowerCase().includes(query) ||
        s.friendlyId.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      const aPinned = pinnedSessions.includes(a.key);
      const bPinned = pinnedSessions.includes(b.key);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aTime = a.updatedAt || a.createdAt || 0;
      const bTime = b.updatedAt || b.createdAt || 0;
      return bTime - aTime;
    });
  }, [sessions, searchQuery, pinnedSessions]);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  }, [onRefresh]);

  const handleSelectSession = useCallback((sessionKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectSession(sessionKey);
    onClose();
  }, [onSelectSession, onClose]);

  const handleTogglePin = useCallback((sessionKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = StorageHelpers.togglePinnedSession(sessionKey);
    setPinnedSessions(next);
  }, []);

  const handleNewSession = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNewSession();
    onClose();
  }, [onNewSession, onClose]);

  const getSessionTitle = (session: SessionMeta) => {
    const smartTitle = getCachedTitle(session.key);
    return smartTitle || session.label || session.title || session.derivedTitle || session.friendlyId;
  };

  const getSessionIcon = (session: SessionMeta) => {
    switch (session.kind) {
      case 'channel': return '💬';
      case 'subagent': return '🤖';
      case 'cron': return '⏰';
      default: return '🦎';
    }
  };

  const renderSessionItem = ({ item }: { item: SessionMeta }) => {
    const isSelected = item.key === currentSessionKey;
    const isPinned = pinnedSessions.includes(item.key);
    const unreadCount = unreadCounts[item.key] || 0;

    return (
      <TouchableOpacity
        style={[
          styles.sessionItem,
          { backgroundColor: isSelected ? theme.surfaceVariant : theme.surface },
          isSelected && { borderLeftColor: theme.primary, borderLeftWidth: 3 },
        ]}
        onPress={() => handleSelectSession(item.key)}
        onLongPress={() => handleTogglePin(item.key)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionContent}>
          <Text style={styles.sessionIcon}>{getSessionIcon(item)}</Text>
          <View style={styles.sessionText}>
            <Text style={[styles.sessionTitle, { color: theme.text }]} numberOfLines={1}>
              {getSessionTitle(item)}
            </Text>
            {item.agent && item.agent !== 'main' && (
              <Text style={[styles.sessionSubtitle, { color: theme.textMuted }]}>Agent: {item.agent}</Text>
            )}
          </View>
        </View>
        <View style={styles.sessionRight}>
          {unreadCount > 0 && !isSelected && <UnreadBadge count={unreadCount} size="small" />}
          {isPinned && <Text style={styles.pinIcon}>📌</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}> 
          <Text style={[styles.headerTitle, { color: theme.text }]}>Sessions</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search sessions..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearButton, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.newSessionButton, { backgroundColor: theme.primary }]} onPress={handleNewSession}>
          <Text style={styles.newSessionText}>+ New Chat</Text>
        </TouchableOpacity>

        <FlatList
          data={filteredSessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}> 
                {searchQuery ? 'No sessions found' : 'No sessions yet'}
              </Text>
            </View>
          }
        />

        <View style={[styles.footer, { borderTopColor: theme.border }]}> 
          <Text style={[styles.footerText, { color: theme.textMuted }]}>Long press to pin/unpin sessions</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  closeButton: { padding: 4 },
  closeText: { fontSize: 16, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  clearButton: { padding: 4, fontSize: 16 },
  newSessionButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  newSessionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listContent: { paddingHorizontal: 12 },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sessionContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sessionIcon: { fontSize: 20, marginRight: 10 },
  sessionText: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: '500' },
  sessionSubtitle: { fontSize: 12, marginTop: 2 },
  pinIcon: { fontSize: 14 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  footer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: { fontSize: 12 },
});
