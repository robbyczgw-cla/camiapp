import { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createChat, type ChatInstance } from 'expo-openclaw-chat';
import { lightTheme, darkTheme } from './src/theme/colors';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [gatewayUrl, setGatewayUrl] = useState('');
  const [token, setToken] = useState('');
  const [chatInstance, setChatInstance] = useState<ChatInstance | null>(null);

  const handleConfigure = useCallback(() => {
    const trimmedGatewayUrl = gatewayUrl.trim();
    const trimmedToken = token.trim();
    if (!trimmedGatewayUrl) return;

    const instance = createChat({
      gatewayUrl: trimmedGatewayUrl,
      token: trimmedToken ? trimmedToken : undefined,
      title: 'CamiApp 🦎',
      placeholder: 'Message...',
    });
    setChatInstance(instance);
  }, [gatewayUrl, token]);

  const handleOpenChat = useCallback(() => {
    chatInstance?.open();
  }, [chatInstance]);

  const handleReset = useCallback(() => {
    setChatInstance(null);
    setGatewayUrl('');
    setToken('');
  }, []);

  const content = (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: theme.text }]}>CamiApp</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your AI assistant in your pocket 🦎
          </Text>
        </View>

        <View style={styles.mainContent}>
          {!chatInstance ? (
            <View style={styles.configSection}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Gateway URL
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={gatewayUrl}
                onChangeText={setGatewayUrl}
                placeholder="wss://your-gateway.example.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Auth Token
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={token}
                onChangeText={setToken}
                placeholder="your-auth-token"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />

              <Pressable
                style={[
                  styles.button,
                  {
                    backgroundColor: gatewayUrl.trim()
                      ? theme.primary
                      : theme.border,
                  },
                ]}
                onPress={handleConfigure}
                disabled={!gatewayUrl.trim()}
              >
                <Text style={styles.buttonText}>Connect 🦎</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.configuredSection}>
              <View style={[styles.statusBadge, { backgroundColor: theme.surfaceVariant }]}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.connectedText, { color: theme.text }]}>
                  Gateway configured
                </Text>
              </View>
              <Text
                style={[styles.urlText, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {gatewayUrl}
              </Text>

              <Pressable
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleOpenChat}
              >
                <Text style={styles.buttonText}>Open Chat 💬</Text>
              </Pressable>

              <Pressable
                style={[styles.resetButton, { borderColor: theme.border }]}
                onPress={handleReset}
              >
                <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>
                  Disconnect
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          Powered by OpenClaw • expo-openclaw-chat
        </Text>
      </KeyboardAvoidingView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );

  // Wrap with ChatProvider if configured
  const ChatProvider = chatInstance?.ChatProvider;
  if (ChatProvider) {
    return (
      <SafeAreaProvider>
        <ChatProvider>{content}</ChatProvider>
      </SafeAreaProvider>
    );
  }

  return <SafeAreaProvider>{content}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  mainContent: {
    gap: 8,
  },
  configSection: {
    gap: 8,
  },
  configuredSection: {
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  urlText: {
    fontSize: 14,
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '100%',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 12,
  },
});
