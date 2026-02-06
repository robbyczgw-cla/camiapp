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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GatewayClient, ChatEngine } from 'expo-openclaw-chat';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

type Props = {
  gatewayUrl: string;
  token: string;
  theme: Record<string, string>;
  onDisconnect: () => void;
};

export function ChatScreen({ gatewayUrl, token, theme, onDisconnect }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const engineRef = useRef<ChatEngine | null>(null);
  const clientRef = useRef<GatewayClient | null>(null);

  useEffect(() => {
    const client = new GatewayClient(gatewayUrl, { token });
    clientRef.current = client;

    client.connect()
      .then(() => {
        setIsConnected(true);
        setIsLoading(false);
        const engine = new ChatEngine(client, 'camiapp-main');
        engineRef.current = engine;

        engine.on('update', () => {
          const msgs: Message[] = engine.messages.map((m: any, i: number) => ({
            id: `${i}-${m.role}`,
            role: m.role,
            text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            timestamp: Date.now(),
          }));
          setMessages(msgs);
          setIsSending(false);
        });
      })
      .catch((err: Error) => {
        console.error('Connection failed:', err);
        setIsLoading(false);
      });

    return () => {
      client.disconnect?.();
    };
  }, [gatewayUrl, token]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !engineRef.current) return;
    const text = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistic local message
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text,
        timestamp: Date.now(),
      },
    ]);

    try {
      await engineRef.current.send(text);
    } catch (err) {
      console.error('Send failed:', err);
      setIsSending(false);
    }
  }, [input]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
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
          <Text style={[styles.roleLabel, { color: theme.primary }]}>
            🦎 Cami
          </Text>
        )}
        <Text style={[styles.messageText, { color: theme.text }]}>
          {item.text}
        </Text>
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
        <View style={styles.connectionDot}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isConnected ? theme.success : theme.error },
            ]}
          />
        </View>
      </View>

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
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: input.trim() ? theme.primary : theme.border,
              },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>↑</Text>
            )}
          </TouchableOpacity>
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
  connectionDot: {
    padding: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
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
