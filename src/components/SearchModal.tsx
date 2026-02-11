/**
 * Search modal for searching messages
 * 
 * Features:
 * - Search within current conversation
 * - Highlight matching text
 * - Navigate to matching message
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import { EmptySearch } from './EmptyState';
import type { UIMessage, SearchResult } from '../types';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  messages: UIMessage[];
  onJumpToMessage: (messageIndex: number) => void;
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

  const contextBefore = 40;
  const contextAfter = 60;

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

export function SearchModal({
  visible,
  onClose,
  messages,
  onJumpToMessage,
}: SearchModalProps) {
  const { theme, textStyle } = useSettings();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);
  
  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase();
    const matches: (SearchResult & { index: number })[] = [];
    
    messages.forEach((message, index) => {
      const text = extractTextFromContent(message.content);
      if (!text) return;
      
      const lowerText = text.toLowerCase();
      const matchIndex = lowerText.indexOf(normalizedQuery);
      
      if (matchIndex !== -1) {
        matches.push({
          sessionKey: '',
          friendlyId: '',
          sessionTitle: '',
          messageIndex: index,
          messageRole: message.role,
          messageText: text,
          matchStart: matchIndex,
          matchEnd: matchIndex + query.length,
          timestamp: message.timestamp,
          index,
        });
      }
    });
    
    // Most recent first
    return matches.reverse();
  }, [messages, query]);
  
  // Focus input when opened
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);
  
  // Handle result select
  const handleSelectResult = useCallback((messageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    onJumpToMessage(messageIndex);
    onClose();
  }, [onJumpToMessage, onClose]);
  
  // Render search result
  const renderResult = ({ item, index }: { item: SearchResult & { index: number }; index: number }) => {
    const isSelected = index === selectedIndex;
    const highlight = highlightMatch(item.messageText, query);
    const roleLabel = item.messageRole === 'assistant' ? '🦎 Cami' : 'You';
    
    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          { backgroundColor: isSelected ? theme.surfaceVariant : theme.surface },
        ]}
        onPress={() => handleSelectResult(item.messageIndex)}
        activeOpacity={0.7}
      >
        <View style={styles.resultHeader}>
          <Text style={[
            styles.roleLabel,
            { 
              color: item.messageRole === 'assistant' ? theme.primary : '#007AFF',
            },
          ]}>
            {roleLabel}
          </Text>
          {item.timestamp && (
            <Text style={[styles.timestamp, { color: theme.textMuted }]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Search</Text>
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
            placeholder="Search messages..."
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
        
        {/* Results */}
        {!query.trim() ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Type to search messages in this conversation
            </Text>
          </View>
        ) : results.length === 0 ? (
          <EmptySearch query={query} />
        ) : (
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => `${item.messageIndex}`}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        )}
        
        {/* Results count */}
        {results.length > 0 && (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
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
  resultsList: {
    paddingHorizontal: 12,
  },
  resultItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
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
  },
  emptyText: {
    fontSize: 15,
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
