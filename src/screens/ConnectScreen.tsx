import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  theme: Record<string, string>;
  onConnect: (url: string, token: string) => void;
};

export function ConnectScreen({ theme, onConnect }: Props) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');

  const canConnect = url.trim().length > 0 && token.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: theme.text }]}>CamiApp</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Connect to your OpenClaw Gateway
          </Text>
        </View>

        <View style={styles.form}>
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
            placeholder="wss://your-gateway.example.com"
            placeholderTextColor={theme.textMuted}
            value={url}
            onChangeText={setUrl}
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
            placeholder="your-auth-token"
            placeholderTextColor={theme.textMuted}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: canConnect ? theme.primary : theme.border,
              },
            ]}
            onPress={() => canConnect && onConnect(url.trim(), token.trim())}
            disabled={!canConnect}
          >
            <Text style={styles.buttonText}>Connect 🦎</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          Powered by OpenClaw • expo-openclaw-chat
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  form: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
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
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 12,
  },
});
