/**
 * Enhanced Chat Screen
 * 
 * The main chat interface with all features:
 * - Markdown rendering
 * - Session management
 * - Image attachments
 * - Search
 * - Typing indicator
 * - Scroll to bottom
 * - Message timestamps
 * - Copy on long press
 * - Pull to refresh
 * - Export conversation
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import { StorageHelpers } from '../stores/storage';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from '../components/MessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { ScrollToBottomButton } from '../components/ScrollToBottomButton';
import { AttachmentPicker, AttachmentPreview } from '../components/AttachmentPicker';
import { SessionDrawer } from '../components/SessionDrawer';
import { SettingsModal } from '../components/SettingsModal';
import { SearchModal } from '../components/SearchModal';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { ConnectionStatusBar } from '../components/ConnectionStatusBar';
import { SwipeableMessage } from '../components/SwipeableMessage';
import { NewMessagesPill } from '../components/NewMessagesPill';
import { MessageListSkeleton, EmptyMessages, VoiceInputButton } from '../components';
import { exportConversation } from '../utils/export';
import { needsTitle, generateAndCacheTitle, getCachedTitle } from '../services/smartTitles';
import { useNotifications, useIsBackground } from '../services/notifications';
import { useSoundEffects, type RecordingResult } from '../services/audio';
import type { UIMessage, PickedImage } from '../types';

interface EnhancedChatScreenProps {
  onDisconnect: () => void;
}

export function EnhancedChatScreen({ onDisconnect }: EnhancedChatScreenProps) {
  const { theme, textStyle, gatewayUrl, authToken, soundEffectsEnabled, notificationsEnabled } = useSettings();
  
  // Notifications and sound effects
  const { sendLocalNotification } = useNotifications();
  const isBackground = useIsBackground();
  const { playSound } = useSoundEffects();
  
  // Chat hook
  const {
    connectionState,
    isConnected,
    isStreaming,
    error,
    messages,
    send,
    abort,
    clear,
    reconnect,
    sessions,
    currentSessionKey,
    switchSession,
    refreshSessions,
    client,
  } = useChat({
    gatewayUrl,
    authToken,
    sessionKey: 'main',
  });
  
  // Local state
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<PickedImage | null>(null);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [smartTitle, setSmartTitle] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const lastMessageCountRef = useRef(0);
  const lastReadMessageIdRef = useRef<string | null>(null);
  
  // Current session info
  const currentSession = useMemo(() => {
    return sessions.find(s => s.key === currentSessionKey);
  }, [sessions, currentSessionKey]);
  
  const sessionTitle = smartTitle || currentSession?.label || currentSession?.title || currentSession?.derivedTitle || currentSessionKey;
  
  // Handle send
  const handleSend = useCallback(async () => {
    const text = input.trim();
    const image = pendingImage;
    
    if (!text && !image) return;
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for the connection to be established.');
      return;
    }
    
    // Clear input immediately
    setInput('');
    setPendingImage(null);
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await send(text, image ? [image] : undefined);
    } catch (err) {
      console.error('Send failed:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore input
      setInput(text);
      if (image) setPendingImage(image);
    }
  }, [input, pendingImage, isConnected, send]);
  
  // Handle abort
  const handleAbort = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await abort();
  }, [abort]);
  
  // Handle refresh (pull to refresh)
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    await refreshSessions();
    setIsRefreshing(false);
  }, [refreshSessions]);
  
  // Handle reply (from swipe or long press)
  const handleReply = useCallback((quoteText: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput(prev => quoteText + prev);
    inputRef.current?.focus();
  }, []);
  
  // Handle scroll with improved logic
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    
    const nearBottom = distanceFromBottom < 150;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(distanceFromBottom > 200);
    
    // Clear new message count if scrolled to bottom
    if (nearBottom && newMessageCount > 0) {
      setNewMessageCount(0);
    }
  }, [newMessageCount]);
  
  // Scroll to bottom with haptic
  const scrollToBottom = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
    setNewMessageCount(0);
  }, []);
  
  // Jump to message (from search)
  const jumpToMessage = useCallback((messageIndex: number) => {
    flatListRef.current?.scrollToIndex({
      index: messageIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, []);
  
  // Handle session switch with haptic
  const handleSwitchSession = useCallback((sessionKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switchSession(sessionKey);
  }, [switchSession]);
  
  // Navigate to message from global search (may need to switch sessions)
  const navigateToMessage = useCallback((sessionKey: string, messageIndex: number) => {
    if (sessionKey === currentSessionKey) {
      // Same session - just scroll
      jumpToMessage(messageIndex);
    } else {
      // Different session - switch first, then scroll after messages load
      handleSwitchSession(sessionKey);
      // Use a timeout to wait for messages to load
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: messageIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 500);
    }
  }, [currentSessionKey, handleSwitchSession, jumpToMessage]);
  
  // Handle export
  const handleExport = useCallback(() => {
    if (messages.length === 0) {
      Alert.alert('No Messages', 'There are no messages to export.');
      return;
    }
    
    Alert.alert(
      'Export Conversation',
      'Choose export format:',
      [
        {
          text: 'Markdown',
          onPress: () => exportConversation(messages, sessionTitle, 'markdown').catch(handleExportError),
        },
        {
          text: 'JSON',
          onPress: () => exportConversation(messages, sessionTitle, 'json').catch(handleExportError),
        },
        {
          text: 'Text',
          onPress: () => exportConversation(messages, sessionTitle, 'text').catch(handleExportError),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [messages, sessionTitle]);
  
  const handleExportError = useCallback((err: Error) => {
    Alert.alert('Export Failed', err.message);
  }, []);
  
  // Handle new session
  const handleNewSession = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newKey = `chat-${Date.now().toString(36)}`;
    switchSession(newKey);
    clear();
  }, [switchSession, clear]);
  
  // Handle image selected
  const handleImageSelected = useCallback((image: PickedImage) => {
    setPendingImage(image);
  }, []);
  
  // Handle image removed
  const handleImageRemoved = useCallback(() => {
    setPendingImage(null);
  }, []);
  
  // Auto-scroll on new messages with smart behavior
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = lastMessageCountRef.current;
    
    // Detect new messages
    if (currentCount > previousCount) {
      const newMsgCount = currentCount - previousCount;
      
      if (isNearBottom) {
        // User is near bottom - auto scroll
        flatListRef.current?.scrollToEnd({ animated: false });
      } else {
        // User is scrolled up - show new message count
        setNewMessageCount(prev => prev + newMsgCount);
      }
    }
    
    lastMessageCountRef.current = currentCount;
  }, [messages.length, isNearBottom]);
  
  // Auto-scroll during streaming if near bottom
  useEffect(() => {
    if (isStreaming && isNearBottom) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages, isStreaming, isNearBottom]);
  
  // Smart titles effect
  useEffect(() => {
    if (needsTitle(currentSessionKey, messages, sessionTitle)) {
      generateAndCacheTitle(currentSessionKey, messages).then(title => {
        setSmartTitle(title);
      });
    } else {
      // Check for cached title
      const cached = getCachedTitle(currentSessionKey);
      if (cached && cached !== smartTitle) {
        setSmartTitle(cached);
      }
    }
  }, [currentSessionKey, messages, sessionTitle, smartTitle]);
  
  // Mark messages as read when viewing session
  useEffect(() => {
    if (messages.length > 0 && isNearBottom) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id !== lastReadMessageIdRef.current) {
        lastReadMessageIdRef.current = lastMsg.id;
        StorageHelpers.setLastReadMessage(currentSessionKey, lastMsg.id);
      }
    }
  }, [messages, currentSessionKey, isNearBottom]);
  
  // Reset smart title when switching sessions
  useEffect(() => {
    setSmartTitle(getCachedTitle(currentSessionKey));
    setNewMessageCount(0);
    lastMessageCountRef.current = 0;
  }, [currentSessionKey]);
  
  // Extract text from message for swipe/reply
  const extractMessageText = useCallback((msg: UIMessage): string => {
    return msg.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map(block => block.text)
      .join(' ');
  }, []);
  
  // Render message item with swipe support
  const renderMessage = useCallback(({ item, index }: { item: UIMessage; index: number }) => {
    const isLastMessage = index === messages.length - 1;
    const isStreamingThis = isStreaming && isLastMessage && item.role === 'assistant';
    const messageText = extractMessageText(item);
    
    return (
      <SwipeableMessage
        messageText={messageText}
        onReply={handleReply}
        enabled={!isStreamingThis}
      >
        <MessageBubble
          message={item}
          isStreaming={isStreamingThis}
          showTimestamp={true}
          gatewayUrl={gatewayUrl}
          onReply={handleReply}
        />
      </SwipeableMessage>
    );
  }, [isStreaming, messages.length, gatewayUrl, handleReply, extractMessageText]);
  
  // Empty state - uses EmptyMessages component
  const renderEmptyState = useCallback(() => (
    <EmptyMessages />
  ), []);
  
  // Loading state with skeleton
  if (connectionState === 'connecting') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Skeleton header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerButton}>
            <Text style={styles.headerButtonIcon}>☰</Text>
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textMuted }]}>Connecting...</Text>
            <View style={styles.connectionIndicator}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.headerButton}>
              <Text style={[styles.headerButtonIcon, { opacity: 0.3 }]}>🔍</Text>
            </View>
            <View style={styles.headerButton}>
              <Text style={[styles.headerButtonIcon, { opacity: 0.3 }]}>⚙️</Text>
            </View>
          </View>
        </View>
        
        {/* Skeleton messages */}
        <MessageListSkeleton />
        
        {/* Skeleton input */}
        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, opacity: 0.5 }]}>
          <View style={styles.inputRow}>
            <View style={[styles.textInput, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]} />
            <View style={[styles.sendButton, { backgroundColor: theme.border }]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  // Error state
  if (error && !isConnected) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={{ fontSize: 48 }}>😵</Text>
          <Text style={[styles.errorTitle, { color: theme.error }]}>Connection Error</Text>
          <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
            {error.message}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={reconnect}
          >
            <Text style={styles.retryText}>Retry Connection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.disconnectLink]}
            onPress={onDisconnect}
          >
            <Text style={[styles.disconnectLinkText, { color: theme.textMuted }]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Connection Status Bar */}
      <ConnectionStatusBar state={connectionState} onRetry={reconnect} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {/* Sessions button */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSessionDrawer(true)}
        >
          <Text style={styles.headerButtonIcon}>☰</Text>
        </TouchableOpacity>
        
        {/* Title */}
        <TouchableOpacity style={styles.headerTitleContainer} onPress={() => setShowSessionDrawer(true)}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {sessionTitle}
          </Text>
          <View style={styles.connectionIndicator}>
            <View style={[styles.connectionDot, { backgroundColor: isConnected ? theme.success : theme.error }]} />
          </View>
        </TouchableOpacity>
        
        {/* Right buttons */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSearch(true)}
            onLongPress={() => setShowGlobalSearch(true)}
          >
            <Text style={styles.headerButtonIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleExport}
          >
            <Text style={styles.headerButtonIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.headerButtonIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={0}
      >
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && styles.emptyList,
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
              />
            }
            ListEmptyComponent={renderEmptyState}
            onContentSizeChange={() => {
              if (!showScrollToBottom) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />
          
          {/* Typing indicator */}
          {isStreaming && (
            <View style={[styles.typingContainer, { backgroundColor: theme.surface }]}>
              <TypingIndicator />
            </View>
          )}
          
          {/* New messages pill */}
          <NewMessagesPill
            count={newMessageCount}
            visible={showScrollToBottom && newMessageCount > 0}
            onPress={scrollToBottom}
          />
          
          {/* Scroll to bottom */}
          <ScrollToBottomButton
            visible={showScrollToBottom}
            onPress={scrollToBottom}
            unreadCount={newMessageCount}
          />
        </View>
        
        {/* Input area */}
        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          {/* Pending image preview */}
          {pendingImage && (
            <View style={styles.attachmentRow}>
              <AttachmentPreview image={pendingImage} onRemove={handleImageRemoved} />
            </View>
          )}
          
          <View style={styles.inputRow}>
            {/* Attachment picker */}
            <AttachmentPicker
              onImageSelected={handleImageSelected}
              disabled={isStreaming}
            />
            
            {/* Text input */}
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.surfaceVariant,
                  color: theme.text,
                  borderColor: theme.border,
                  fontSize: textStyle.fontSize,
                },
              ]}
              placeholder="Message..."
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={4000}
              editable={!isStreaming}
            />
            
            {/* Send/Stop button */}
            {isStreaming ? (
              <TouchableOpacity
                style={[styles.stopButton, { backgroundColor: theme.error }]}
                onPress={handleAbort}
              >
                <Text style={styles.stopIcon}>■</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: (input.trim() || pendingImage) ? theme.primary : theme.border },
                ]}
                onPress={handleSend}
                disabled={!input.trim() && !pendingImage}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Modals */}
      <SessionDrawer
        visible={showSessionDrawer}
        onClose={() => setShowSessionDrawer(false)}
        sessions={sessions}
        currentSessionKey={currentSessionKey}
        onSelectSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onRefresh={refreshSessions}
        unreadCounts={unreadCounts}
      />
      
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onDisconnect={onDisconnect}
        gatewayUrl={gatewayUrl}
        isConnected={isConnected}
      />
      
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        messages={messages}
        onJumpToMessage={jumpToMessage}
      />
      
      <GlobalSearchModal
        visible={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        sessions={sessions}
        client={client}
        currentSessionKey={currentSessionKey}
        onNavigateToMessage={navigateToMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectLink: {
    marginTop: 8,
  },
  disconnectLinkText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonIcon: {
    fontSize: 18,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  connectionIndicator: {
    padding: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messageList: {
    padding: 12,
    paddingBottom: 8,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  attachmentRow: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
