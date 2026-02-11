import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GatewayClient, ChatEngine, type UIMessage, type ChatMessageContent } from 'expo-openclaw-chat';

type Props = {
  gatewayUrl: string;
  token: string;
  theme: Record<string, string>;
  onDisconnect: () => void;
};

// Helper to extract text from content blocks
function extractTextFromContent(content: ChatMessageContent[]): string {
  if (!content || !Array.isArray(content)) return '';
  
  return content
    .filter((block): block is ChatMessageContent & { type: 'text'; text: string } => 
      block.type === 'text' && typeof (block as any).text === 'string'
    )
    .map((block) => block.text)
    .join('\n');
}

// Streaming indicator component
function StreamingIndicator({ color }: { color: string }) {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '●');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Text style={[styles.streamingDots, { color }]}>
      {dots || '●'}
    </Text>
  );
}

export function ChatScreen({ gatewayUrl, token, theme, onDisconnect }: Props) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const engineRef = useRef<ChatEngine | null>(null);
  const clientRef = useRef<GatewayClient | null>(null);

  useEffect(() => {
    const client = new GatewayClient(gatewayUrl, { 
      token,
      autoReconnect: true,
      displayName: 'CamiApp 🦎',
      appVersion: '1.0.0',
      platform: 'react-native',
    });
    clientRef.current = client;

    // Track connection state
    const unsubState = client.onConnectionStateChange((state) => {
      setIsConnected(state === 'connected');
      if (state === 'disconnected') {
        setError('Disconnected from server');
      } else if (state === 'reconnecting') {
        setError('Reconnecting...');
      } else if (state === 'connected') {
        setError(null);
      }
    });

    client.connect()
      .then(() => {
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        
        const engine = new ChatEngine(client, 'main');
        engineRef.current = engine;

        // Subscribe to engine updates - this is the key fix!
        engine.on('update', () => {
          // Get messages directly from engine
          const engineMessages = engine.messages;
          const engineIsStreaming = engine.isStreaming;
          
          console.log('[ChatScreen] Engine update:', {
            messageCount: engineMessages.length,
            isStreaming: engineIsStreaming,
            lastMessage: engineMessages[engineMessages.length - 1],
          });
          
          // Update state with fresh copies
          setMessages([...engineMessages]);
          setIsStreaming(engineIsStreaming);
        });

        engine.on('error', (err) => {
          console.error('[ChatScreen] Engine error:', err);
          setError(err.message);
          setIsStreaming(false);
        });
      })
      .catch((err: Error) => {
        console.error('[ChatScreen] Connection failed:', err);
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      unsubState();
      engineRef.current?.destroy();
      client.disconnect?.();
    };
  }, [gatewayUrl, token]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !engineRef.current) return;
    
    setInput('');
    setError(null);

    try {
      console.log('[ChatScreen] Sending message:', text);
      await engineRef.current.send(text);
      console.log('[ChatScreen] Message sent successfully');
    } catch (err) {
      console.error('[ChatScreen] Send failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [input]);

  const handleAbort = useCallback(async () => {
    try {
      await engineRef.current?.abort();
    } catch (err) {
      console.error('[ChatScreen] Abort failed:', err);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Engine manages messages internally, just trigger a re-render
    if (engineRef.current) {
      setMessages([...engineRef.current.messages]);
    }
    setIsRefreshing(false);
  }, []);

  const renderMessage = ({ item }: { item: UIMessage }) => {
    const isUser = item.role === 'user';
    const text = extractTextFromContent(item.content);
    const showStreaming = item.isStreaming && !text;
    
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          {
            backgroundColor: isUser ? theme.userBubble : theme.aiBubble,
            borderColor: isUser ? theme.primary : theme.border,
          },
        ]}
      >
        {!isUser && (
          <View style={styles.roleHeader}>
            <Text style={[styles.roleLabel, { color: theme.primary }]}>
              🦎 Cami
            </Text>
            {item.isStreaming && (
              <View style={[styles.streamingBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.streamingBadgeText, { color: theme.primary }]}>
                  streaming
                </Text>
              </View>
            )}
          </View>
        )}
        
        {showStreaming ? (
          <StreamingIndicator color={theme.primary} />
        ) : item.isError ? (
          <Text style={[styles.messageText, styles.errorText]}>
            ⚠️ {item.errorMessage || 'An error occurred'}
          </Text>
        ) : (
          <Text style={[styles.messageText, { color: theme.text }]}>
            {text || (item.isStreaming ? '' : '(empty response)')}
          </Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Connecting to Gateway...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onDisconnect} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>CamiApp 🦎</Text>
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isConnected ? theme.success : theme.error },
            ]}
          />
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '20' }]}>
          <Text style={[styles.errorBannerText, { color: theme.error }]}>
            {error}
          </Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={[styles.errorDismiss, { color: theme.error }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48 }}>🦎</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Start a conversation!
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.surfaceVariant,
                color: theme.text,
                borderColor: theme.border,
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
          {isStreaming ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.error }]}
              onPress={handleAbort}
            >
              <Text style={styles.sendButtonText}>■</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: input.trim() ? theme.primary : theme.border,
                },
              ]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  connectionStatus: {
    padding: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    fontSize: 16,
    paddingLeft: 12,
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    gap: 8,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '85%',
    borderWidth: 1,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  streamingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  streamingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  streamingDots: {
    fontSize: 16,
    letterSpacing: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  errorText: {
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
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
  sendButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
