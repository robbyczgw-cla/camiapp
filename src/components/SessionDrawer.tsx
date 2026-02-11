/**
 * Session Drawer - Redesigned
 * 
 * Premium session management drawer with:
 * - Card-style session items with subtle border
 * - Last message preview (1 line, muted)
 * - Active session: accent color left border
 * - Pinned sessions: star icon, sorted to top
 * - Section headers: "Pinned", "Recent" with small caps
 * - Pull-to-refresh with custom animation
 * - Floating New Chat button
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import { StorageHelpers } from '../stores/storage';
import { UnreadBadge } from './UnreadBadge';
import { EmptySessions, EmptySearch } from './EmptyState';
import { getCachedTitle } from '../services/smartTitles';
import { spacing, radius, shadows } from '../theme/colors';
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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Section item type for FlatList
type SectionItem = 
  | { type: 'header'; title: string; key: string }
  | { type: 'session'; session: SessionMeta; key: string };

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
  const { theme, textStyle } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinnedSessions, setPinnedSessions] = useState(() => StorageHelpers.getPinnedSessions());
  
  // Filter and organize sessions into sections
  const sectionedData = useMemo((): SectionItem[] => {
    let filtered = sessions;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.label?.toLowerCase().includes(query) ||
        s.title?.toLowerCase().includes(query) ||
        s.derivedTitle?.toLowerCase().includes(query) ||
        s.friendlyId.toLowerCase().includes(query)
      );
    }
    
    // Separate pinned and unpinned
    const pinned = filtered.filter(s => pinnedSessions.includes(s.key));
    const unpinned = filtered.filter(s => !pinnedSessions.includes(s.key));
    
    // Sort both by update time (most recent first)
    const sortByTime = (a: SessionMeta, b: SessionMeta) => {
      const aTime = a.updatedAt || a.createdAt || 0;
      const bTime = b.updatedAt || b.createdAt || 0;
      return bTime - aTime;
    };
    
    pinned.sort(sortByTime);
    unpinned.sort(sortByTime);
    
    const items: SectionItem[] = [];
    
    // Add pinned section
    if (pinned.length > 0) {
      items.push({ type: 'header', title: 'PINNED', key: 'header-pinned' });
      pinned.forEach(s => items.push({ type: 'session', session: s, key: s.key }));
    }
    
    // Add recent section
    if (unpinned.length > 0) {
      items.push({ type: 'header', title: 'RECENT', key: 'header-recent' });
      unpinned.forEach(s => items.push({ type: 'session', session: s, key: s.key }));
    }
    
    return items;
  }, [sessions, searchQuery, pinnedSessions]);
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  }, [onRefresh]);
  
  // Handle session select
  const handleSelectSession = useCallback((sessionKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectSession(sessionKey);
    onClose();
  }, [onSelectSession, onClose]);
  
  // Handle pin toggle
  const handleTogglePin = useCallback((sessionKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPinned = StorageHelpers.togglePinnedSession(sessionKey);
    setPinnedSessions(newPinned);
  }, []);
  
  // Handle new session
  const handleNewSession = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNewSession();
    onClose();
  }, [onNewSession, onClose]);
  
  // Get session display title
  const getSessionTitle = (session: SessionMeta) => {
    const smartTitle = getCachedTitle(session.key);
    if (smartTitle) return smartTitle;
    return session.label || session.title || session.derivedTitle || session.friendlyId;
  };
  
  // Get session icon based on kind
  const getSessionIcon = (session: SessionMeta) => {
    switch (session.kind) {
      case 'channel': return '💬';
      case 'subagent': return '🤖';
      case 'cron': return '⏰';
      default: return '🦎';
    }
  };
  
  // Format relative time
  const getRelativeTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  // Render section header
  const renderSectionHeader = ({ title }: { title: string }) => (
    <Animated.View 
      entering={FadeIn.duration(200)}
      style={styles.sectionHeader}
    >
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
        {title}
      </Text>
    </Animated.View>
  );
  
  // Render session item
  const renderSessionItem = ({ item }: { item: SectionItem }) => {
    if (item.type === 'header') {
      return renderSectionHeader({ title: item.title });
    }
    
    const { session } = item;
    const isSelected = session.key === currentSessionKey;
    const isPinned = pinnedSessions.includes(session.key);
    const unreadCount = unreadCounts[session.key] || 0;
    const relativeTime = getRelativeTime(session.updatedAt || session.createdAt);
    
    return (
      <AnimatedTouchable
        entering={FadeInDown.duration(200).delay(50)}
        layout={Layout.springify()}
        style={[
          styles.sessionCard,
          { 
            backgroundColor: theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
            borderLeftColor: isSelected ? theme.primary : theme.border,
            borderLeftWidth: isSelected ? 3 : 1,
          },
          isSelected && shadows.sm,
        ]}
        onPress={() => handleSelectSession(session.key)}
        onLongPress={() => handleTogglePin(session.key)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionContent}>
          {/* Icon */}
          <Text style={styles.sessionIcon}>{getSessionIcon(session)}</Text>
          
          {/* Text content */}
          <View style={styles.sessionText}>
            <View style={styles.sessionTitleRow}>
              <Text
                style={[styles.sessionTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {getSessionTitle(session)}
              </Text>
              {isPinned && <Text style={styles.pinIcon}>⭐</Text>}
            </View>
            
            {/* Preview / Agent info */}
            {session.agent && session.agent !== 'main' ? (
              <Text style={[styles.sessionPreview, { color: theme.textMuted }]} numberOfLines={1}>
                Agent: {session.agent}
              </Text>
            ) : (
              <Text style={[styles.sessionPreview, { color: theme.textMuted }]} numberOfLines={1}>
                {session.kind === 'channel' ? 'Channel session' : 'Chat session'}
              </Text>
            )}
          </View>
          
          {/* Right side: time and badge */}
          <View style={styles.sessionMeta}>
            {relativeTime && (
              <Text style={[styles.timeText, { color: theme.textMuted }]}>
                {relativeTime}
              </Text>
            )}
            {unreadCount > 0 && !isSelected && (
              <UnreadBadge count={unreadCount} size="small" />
            )}
          </View>
        </View>
      </AnimatedTouchable>
    );
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>🦎</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Cami</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>
        
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
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
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Text style={[styles.clearIcon, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Sessions List */}
        <FlatList
          data={sectionedData}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              progressBackgroundColor={theme.surface}
            />
          }
          ListEmptyComponent={
            searchQuery ? (
              <EmptySearch query={searchQuery} />
            ) : (
              <EmptySessions onNewSession={handleNewSession} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
        
        {/* Floating New Chat Button */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary }, shadows.lg]}
            onPress={handleNewSession}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>+</Text>
            <Text style={styles.fabText}>New Chat</Text>
          </TouchableOpacity>
        </View>
        
        {/* Footer hint */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Long press to pin/unpin sessions
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100, // Space for FAB
  },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sessionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  sessionIcon: {
    fontSize: 22,
  },
  sessionText: {
    flex: 1,
    gap: 2,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  pinIcon: {
    fontSize: 12,
  },
  sessionPreview: {
    fontSize: 13,
  },
  sessionMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 70,
    right: spacing.lg,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
