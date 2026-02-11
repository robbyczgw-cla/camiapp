/**
 * Global Search Modal - Search across all sessions
 * 
 * Features:
 * - Fetch all session histories
 * - Search across all messages
 * - Group results by session
 * - Navigate to specific message in specific session
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Keyboard,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import { EmptySearch } from './EmptyState';
import type { UIMessage, SessionMeta, SearchResult } from '../types';
import type { GatewayClient } from 'expo-openclaw-chat';

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  sessions: SessionMeta[];
  client: GatewayClient | null;
  currentSessionKey: string;
  onNavigateToMessage: (sessionKey: string, messageIndex: number) => void;
}

// Extract text from message content
function extractTextFromContent(content: UIMessage['content']): string {
  return content
    .map((block) => {
      if (block.type === 'text') {
        return (block as { type: 'text'; text: string }).text;
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

// Highlight matching text
function highlightMatch(
  text: string,
  query: string,
): { before: string; match: string; after: string } | null {
  if (!query.trim()) return null;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) return null;

  const contextBefore = 30;
  const contextAfter = 50;

  let start = Math.max(0, matchIndex - contextBefore);
  let end = Math.min(text.length, matchIndex + query.length + contextAfter);

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = text.indexOf(' ', start);
    if (spaceIndex !== -1 && spaceIndex < matchIndex) {
      start = spaceIndex + 1;
    }
  }

  if (end < text.length) {
    const spaceIndex = text.lastIndexOf(' ', end);
    if (spaceIndex > matchIndex + query.length) {
      end = spaceIndex;
    }
  }

  const before = (start > 0 ? '...' : '') + text.slice(start, matchIndex);
  const match = text.slice(matchIndex, matchIndex + query.length);
  const after = text.slice(matchIndex + query.length, end) + (end < text.length ? '...' : '');

  return { before, match, after };
}

interface SearchResultWithSession extends SearchResult {
  sessionLabel: string;
}

interface SearchSection {
  sessionKey: string;
  sessionTitle: string;
  data: SearchResultWithSession[];
}

export function GlobalSearchModal({
  visible,
  onClose,
  sessions,
  client,
  currentSessionKey,
  onNavigateToMessage,
}: GlobalSearchModalProps) {
  const { theme, textStyle } = useSettings();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchSection[]>([]);
  const [searchedSessions, setSearchedSessions] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  
  // Cache for session histories
  const historyCacheRef = useRef<Map<string, UIMessage[]>>(new Map());
  
  // Focus input when opened
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setSearchedSessions(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Abort any ongoing search when closing
      searchAbortRef.current?.abort();
    }
  }, [visible]);
  
  // Perform search across all sessions
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !client || !client.isConnected) {
      setResults([]);
      return;
    }
    
    // Abort previous search
    searchAbortRef.current?.abort();
    const abortController = new AbortController();
    searchAbortRef.current = abortController;
    
    setIsSearching(true);
    setSearchedSessions(0);
    setTotalSessions(sessions.length);
    
    const normalizedQuery = searchQuery.toLowerCase();
    const sectionsMap = new Map<string, SearchResultWithSession[]>();
    
    try {
      // Search through each session
      for (let i = 0; i < sessions.length; i++) {
        if (abortController.signal.aborted) break;
        
        const session = sessions[i];
        setSearchedSessions(i + 1);
        
        // Try to get from cache first
        let messages = historyCacheRef.current.get(session.key);
        
        if (!messages) {
          try {
            const history = await client.chatHistory(session.key, { limit: 200 });
            messages = (history.messages || []) as UIMessage[];
            historyCacheRef.current.set(session.key, messages);
          } catch {
            // Skip sessions we can't fetch
            continue;
          }
        }
        
        // Search through messages
        for (let msgIndex = 0; msgIndex < messages.length; msgIndex++) {
          const message = messages[msgIndex];
          const text = extractTextFromContent(message.content);
          if (!text) continue;
          
          const lowerText = text.toLowerCase();
          const matchIndex = lowerText.indexOf(normalizedQuery);
          
          if (matchIndex !== -1) {
            const sessionTitle = session.label || session.title || session.derivedTitle || session.friendlyId;
            
            const result: SearchResultWithSession = {
              sessionKey: session.key,
              friendlyId: session.friendlyId,
              sessionTitle,
              sessionLabel: sessionTitle,
              messageIndex: msgIndex,
              messageRole: message.role,
              messageText: text,
              matchStart: matchIndex,
              matchEnd: matchIndex + searchQuery.length,
              timestamp: message.timestamp,
            };
            
            if (!sectionsMap.has(session.key)) {
              sectionsMap.set(session.key, []);
            }
            sectionsMap.get(session.key)!.push(result);
          }
        }
      }
      
      // Convert to sections array, sorted by relevance (more matches first)
      const sections: SearchSection[] = Array.from(sectionsMap.entries())
        .map(([key, data]) => ({
          sessionKey: key,
          sessionTitle: data[0]?.sessionTitle || key,
          data,
        }))
        .sort((a, b) => b.data.length - a.data.length);
      
      if (!abortController.signal.aborted) {
        setResults(sections);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [client, sessions]);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, performSearch]);
  
  // Handle result select
  const handleSelectResult = useCallback((sessionKey: string, messageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    onNavigateToMessage(sessionKey, messageIndex);
    onClose();
  }, [onNavigateToMessage, onClose]);
  
  // Render section header
  const renderSectionHeader = ({ section }: { section: SearchSection }) => {
    const isCurrent = section.sessionKey === currentSessionKey;
    
    return (
      <View style={[styles.sectionHeader, { backgroundColor: theme.surfaceVariant }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={1}>
          🦎 {section.sessionTitle}
          {isCurrent && <Text style={{ color: theme.primary }}> (current)</Text>}
        </Text>
        <Text style={[styles.resultCount, { color: theme.textMuted }]}>
          {section.data.length} result{section.data.length !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  };
  
  // Render search result
  const renderResult = ({ item }: { item: SearchResultWithSession }) => {
    const highlight = highlightMatch(item.messageText, query);
    const roleLabel = item.messageRole === 'assistant' ? '🦎 Cami' : 'You';
    
    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: theme.surface }]}
        onPress={() => handleSelectResult(item.sessionKey, item.messageIndex)}
        activeOpacity={0.7}
      >
        <View style={styles.resultHeader}>
          <Text style={[
            styles.roleLabel,
            { color: item.messageRole === 'assistant' ? theme.primary : '#007AFF' },
          ]}>
            {roleLabel}
          </Text>
          {item.timestamp && (
            <Text style={[styles.timestamp, { color: theme.textMuted }]}>
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        {highlight && (
          <Text style={[styles.resultText, { color: theme.textSecondary }]}>
            {highlight.before}
            <Text style={[styles.highlight, { backgroundColor: '#FFE082' }]}>
              {highlight.match}
            </Text>
            {highlight.after}
          </Text>
        )}
      </TouchableOpacity>
    );
  };
  
  // Total results count
  const totalResults = results.reduce((sum, section) => sum + section.data.length, 0);
  
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Search All Sessions</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>
        
        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search across all conversations..."
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={[styles.clearButton, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Search Progress */}
        {isSearching && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.progressText, { color: theme.textMuted }]}>
              Searching {searchedSessions}/{totalSessions} sessions...
            </Text>
          </View>
        )}
        
        {/* Results */}
        {!query.trim() ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Search across all your conversations
            </Text>
            <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
              Enter at least 2 characters to search
            </Text>
          </View>
        ) : results.length === 0 && !isSearching ? (
          <EmptySearch query={query} />
        ) : (
          <SectionList
            sections={results}
            renderItem={renderResult}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item, index) => `${item.sessionKey}-${item.messageIndex}-${index}`}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled
          />
        )}
        
        {/* Results count */}
        {totalResults > 0 && !isSearching && (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              {totalResults} result{totalResults !== 1 ? 's' : ''} in {results.length} session{results.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  progressText: {
    fontSize: 13,
  },
  resultsList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  resultCount: {
    fontSize: 12,
  },
  resultItem: {
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
  highlight: {
    color: '#000',
    borderRadius: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
});
