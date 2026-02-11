/**
 * Enhanced Chat Screen - Redesigned
 * 
 * Premium chat interface with:
 * - Clean header with 🦎 Cami title and connection status dot
 * - Frosted glass input bar with animated send button
 * - Smooth message animations
 * - Pull-to-refresh with custom animation
 * - New messages pill
 * - Scroll to bottom button
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
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
import { spacing, radius, shadows } from '../theme/colors';
import type { UIMessage, PickedImage } from '../types';

interface EnhancedChatScreenProps {
  onDisconnect: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function EnhancedChatScreen({ onDisconnect }: EnhancedChatScreenProps) {
  const { theme, textStyle, gatewayUrl, authToken, isDark, soundEffectsEnabled, notificationsEnabled } = useSettings();
  
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
  
  // Animation values
  const sendButtonScale = useSharedValue(1);
  const sendButtonRotation = useSharedValue(0);
  const inputFocused = useSharedValue(0);
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const lastMessageCountRef = useRef(0);
  const lastReadMessageIdRef = useRef<string | null>(null);
  
  // Current session info
  const currentSession = useMemo(() => {
    return sessions.find(s => s.key === currentSessionKey);
  }, [sessions, currentSessionKey]);
  
  const sessionTitle = smartTitle || currentSession?.label || currentSession?.title || currentSession?.derivedTitle || 'Chat';
  
  // Connection status dot color
  const connectionDotColor = useMemo(() => {
    switch (connectionState) {
      case 'connected': return theme.success;
      case 'connecting': 
      case 'reconnecting': return theme.warning;
      default: return theme.error;
    }
  }, [connectionState, theme]);
  
  // Has content to send
  const canSend = input.trim().length > 0 || pendingImage !== null;
  
  // Handle send with animation
  const handleSend = useCallback(async () => {
    const text = input.trim();
    const image = pendingImage;
    
    if (!text && !image) return;
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for the connection to be established.');
      return;
    }
    
    // Animate send button
    sendButtonScale.value = withSpring(0.85, { damping: 15 });
    sendButtonRotation.value = withSpring(45, { damping: 15 });
    setTimeout(() => {
      sendButtonScale.value = withSpring(1, { damping: 12 });
      sendButtonRotation.value = withSpring(0, { damping: 12 });
    }, 150);
    
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
      setInput(text);
      if (image) setPendingImage(image);
    }
  }, [input, pendingImage, isConnected, send, sendButtonScale, sendButtonRotation]);

  // Handle voice recording complete (audio attachment)
  const handleVoiceRecording = useCallback(async (recording: RecordingResult) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for the connection to be established.');
      return;
    }

    try {
      await send('Please transcribe and respond to this voice message.', [{
        uri: recording.uri,
        base64: recording.base64,
        mimeType: recording.mimeType,
        fileName: recording.fileName,
      }]);
    } catch (err) {
      console.error('Voice send failed:', err);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    }
  }, [isConnected, send]);
  
  // Handle abort
  const handleAbort = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await abort();
  }, [abort]);
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    await refreshSessions();
    setIsRefreshing(false);
  }, [refreshSessions]);
  
  // Handle reply
  const handleReply = useCallback((quoteText: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput(prev => quoteText + prev);
    inputRef.current?.focus();
  }, []);
  
  // Handle scroll
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    
    const nearBottom = distanceFromBottom < 150;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(distanceFromBottom > 200);
    
    if (nearBottom && newMessageCount > 0) {
      setNewMessageCount(0);
    }
  }, [newMessageCount]);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
    setNewMessageCount(0);
  }, []);
  
  // Jump to message
  const jumpToMessage = useCallback((messageIndex: number) => {
    flatListRef.current?.scrollToIndex({
      index: messageIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, []);
  
  // Handle session switch
  const handleSwitchSession = useCallback((sessionKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switchSession(sessionKey);
  }, [switchSession]);
  
  // Navigate to message from global search
  const navigateToMessage = useCallback((sessionKey: string, messageIndex: number) => {
    if (sessionKey === currentSessionKey) {
      jumpToMessage(messageIndex);
    } else {
      handleSwitchSession(sessionKey);
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
        { text: 'Markdown', onPress: () => exportConversation(messages, sessionTitle, 'markdown').catch(handleExportError) },
        { text: 'JSON', onPress: () => exportConversation(messages, sessionTitle, 'json').catch(handleExportError) },
        { text: 'Text', onPress: () => exportConversation(messages, sessionTitle, 'text').catch(handleExportError) },
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
  
  // Input focus handlers
  const handleInputFocus = useCallback(() => {
    inputFocused.value = withTiming(1, { duration: 200 });
  }, [inputFocused]);
  
  const handleInputBlur = useCallback(() => {
    inputFocused.value = withTiming(0, { duration: 200 });
  }, [inputFocused]);
  
  // Auto-scroll on new messages
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = lastMessageCountRef.current;
    
    if (currentCount > previousCount) {
      const newMsgCount = currentCount - previousCount;
      
      if (isNearBottom) {
        flatListRef.current?.scrollToEnd({ animated: false });
      } else {
        setNewMessageCount(prev => prev + newMsgCount);
      }
    }
    
    lastMessageCountRef.current = currentCount;
  }, [messages.length, isNearBottom]);
  
  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && isNearBottom) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages, isStreaming, isNearBottom]);

  // Play receive sound + local notification when new assistant message arrives
  const lastNotifiedMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || isStreaming) return;
    if (lastMsg.id === lastNotifiedMessageIdRef.current) return;

    lastNotifiedMessageIdRef.current = lastMsg.id;

    if (soundEffectsEnabled) {
      playSound('receive');
    }

    if (notificationsEnabled && isBackground) {
      const textContent = lastMsg.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map(block => block.text)
        .join(' ')
        .trim();

      sendLocalNotification(
        sessionTitle,
        textContent ? textContent.slice(0, 120) : 'New message received',
        { sessionKey: currentSessionKey }
      );
    }
  }, [messages, isStreaming, soundEffectsEnabled, notificationsEnabled, isBackground, playSound, sendLocalNotification, sessionTitle, currentSessionKey]);
  
  // Smart titles effect
  useEffect(() => {
    if (needsTitle(currentSessionKey, messages, sessionTitle)) {
      generateAndCacheTitle(currentSessionKey, messages).then(title => {
        setSmartTitle(title);
      });
    } else {
      const cached = getCachedTitle(currentSessionKey);
      if (cached && cached !== smartTitle) {
        setSmartTitle(cached);
      }
    }
  }, [currentSessionKey, messages, sessionTitle, smartTitle]);
  
  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0 && isNearBottom) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id !== lastReadMessageIdRef.current) {
        lastReadMessageIdRef.current = lastMsg.id;
        StorageHelpers.setLastReadMessage(currentSessionKey, lastMsg.id);
      }
    }
  }, [messages, currentSessionKey, isNearBottom]);
  
  // Reset on session switch
  useEffect(() => {
    setSmartTitle(getCachedTitle(currentSessionKey));
    setNewMessageCount(0);
    lastMessageCountRef.current = 0;
  }, [currentSessionKey]);
  
  // Extract message text
  const extractMessageText = useCallback((msg: UIMessage): string => {
    return msg.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map(block => block.text)
      .join(' ');
  }, []);
  
  // Animated styles
  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sendButtonScale.value },
      { rotate: `${sendButtonRotation.value}deg` },
    ],
  }));
  
  const inputContainerAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolate(
      inputFocused.value,
      [0, 1],
      [0, 1]
    ) === 1 ? theme.primary : theme.inputBorder,
  }));
  
  // Render message item
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
  
  // Empty state
  const renderEmptyState = useCallback(() => <EmptyMessages />, []);
  
  // Loading state
  if (connectionState === 'connecting') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.textMuted }]}>Connecting...</Text>
            <ActivityIndicator size="small" color={theme.primary} style={styles.headerLoader} />
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.headerButton, { opacity: 0.3 }]}>
              <Text style={styles.headerButtonIcon}>⚙️</Text>
            </View>
          </View>
        </View>
        <MessageListSkeleton />
        <View style={[styles.inputWrapper, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={[styles.inputRow, { opacity: 0.5 }]}>
            <View style={[styles.textInputContainer, { backgroundColor: theme.inputBackground }]} />
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
          <Text style={styles.errorEmoji}>😵</Text>
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
          <TouchableOpacity style={styles.backLink} onPress={onDisconnect}>
            <Text style={[styles.backLinkText, { color: theme.textMuted }]}>Go back</Text>
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
      <View style={[styles.header, { borderBottomColor: theme.border }, shadows.sm]}>
        {/* Sessions button */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSessionDrawer(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerButtonIcon}>☰</Text>
        </TouchableOpacity>
        
        {/* Title with connection dot */}
        <TouchableOpacity 
          style={styles.headerCenter} 
          onPress={() => setShowSessionDrawer(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerEmoji}>🦎</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {sessionTitle}
          </Text>
          <View style={[styles.connectionDot, { backgroundColor: connectionDotColor }]} />
        </TouchableOpacity>
        
        {/* Right buttons */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSearch(true)}
            onLongPress={() => setShowGlobalSearch(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
            activeOpacity={0.7}
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
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Typing indicator */}
          {isStreaming && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={[styles.typingContainer, { backgroundColor: theme.surface }]}
            >
              <TypingIndicator />
            </Animated.View>
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
        
        {/* Input area - Frosted glass effect */}
        <View style={[styles.inputWrapper, { borderTopColor: theme.border }]}>
          {/* Use BlurView for frosted glass effect on iOS */}
          <View style={[styles.inputBackground, { backgroundColor: isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
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
              <Animated.View style={[
                styles.textInputContainer,
                { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                inputContainerAnimatedStyle,
              ]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.textInput, { color: theme.text, fontSize: textStyle.fontSize }]}
                  placeholder="Message..."
                  placeholderTextColor={theme.textMuted}
                  value={input}
                  onChangeText={setInput}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  multiline
                  maxLength={4000}
                  editable={!isStreaming}
                />
              </Animated.View>
              
              {/* Voice input button (hold to record) */}
              {!isStreaming && !canSend && (
                <VoiceInputButton
                  onRecordingComplete={handleVoiceRecording}
                  disabled={!isConnected}
                />
              )}

              {/* Send/Stop button */}
              {isStreaming ? (
                <TouchableOpacity
                  style={[styles.stopButton, { backgroundColor: theme.error }]}
                  onPress={handleAbort}
                  activeOpacity={0.8}
                >
                  <Text style={styles.stopIcon}>■</Text>
                </TouchableOpacity>
              ) : (
                <AnimatedTouchable
                  style={[
                    styles.sendButton,
                    { backgroundColor: canSend ? theme.primary : theme.border },
                    sendButtonAnimatedStyle,
                  ]}
                  onPress={handleSend}
                  disabled={!canSend}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sendIcon, { opacity: canSend ? 1 : 0.5 }]}>↑</Text>
                </AnimatedTouchable>
              )}
            </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorEmoji: {
    fontSize: 64,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  backLinkText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  headerButtonIcon: {
    fontSize: 20,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerLoader: {
    marginLeft: spacing.xs,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messageList: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.sm,
  },
  emptyList: {
    flex: 1,
  },
  typingContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  inputWrapper: {
    borderTopWidth: 1,
  },
  inputBackground: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  attachmentRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  textInputContainer: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    paddingVertical: 0,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
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
    ...shadows.sm,
  },
  stopIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
