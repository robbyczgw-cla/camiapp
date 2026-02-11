/**
 * Enhanced Connect Screen
 * 
 * Features:
 * - Persistent connection settings (MMKV)
 * - Recent connections
 * - URL validation
 * - Token visibility toggle
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';

interface EnhancedConnectScreenProps {
  onConnect: () => void;
}

// Common gateway URLs for quick access
const QUICK_URLS = [
  { label: 'Tailscale', url: 'wss://openclaw-server.tail8a9ea9.ts.net' },
  { label: 'Localhost', url: 'ws://localhost:18789' },
];

export function EnhancedConnectScreen({ onConnect }: EnhancedConnectScreenProps) {
  const { theme, gatewayUrl, authToken, setConnection } = useSettings();
  
  const [url, setUrl] = useState(gatewayUrl);
  const [token, setToken] = useState(authToken);
  const [showToken, setShowToken] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Update state if settings change
  useEffect(() => {
    setUrl(gatewayUrl);
    setToken(authToken);
  }, [gatewayUrl, authToken]);
  
  // Validate URL
  const validateUrl = useCallback((urlStr: string): boolean => {
    if (!urlStr.trim()) {
      setUrlError('Gateway URL is required');
      return false;
    }
    
    const trimmed = urlStr.trim().toLowerCase();
    
    // Check for valid protocol
    if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
      // Auto-add wss:// if no protocol
      setUrl(`wss://${urlStr.trim()}`);
    }
    
    setUrlError(null);
    return true;
  }, []);
  
  // Handle connect
  const handleConnect = useCallback(() => {
    if (!validateUrl(url)) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('ws://') && !normalizedUrl.startsWith('wss://')) {
      normalizedUrl = `wss://${normalizedUrl}`;
    }
    
    // Save to persistent storage
    setConnection(normalizedUrl, token.trim());
    
    // Navigate to chat
    onConnect();
  }, [url, token, validateUrl, setConnection, onConnect]);
  
  // Handle quick URL selection
  const handleQuickUrl = useCallback((quickUrl: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUrl(quickUrl);
    setUrlError(null);
  }, []);
  
  // Check if can connect
  const canConnect = url.trim().length > 0;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
            />
            <Text style={[styles.title, { color: theme.text }]}>CamiApp</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Your AI assistant in your pocket 🦎
            </Text>
          </View>
          
          {/* Connection Form */}
          <View style={styles.form}>
            {/* Gateway URL */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Gateway URL
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: urlError ? theme.error : theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="wss://your-gateway.example.com"
                placeholderTextColor={theme.textMuted}
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  setUrlError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
              />
              {urlError && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {urlError}
                </Text>
              )}
            </View>
            
            {/* Quick URLs */}
            <View style={styles.quickUrls}>
              {QUICK_URLS.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.quickUrlButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                  onPress={() => handleQuickUrl(item.url)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickUrlText, { color: theme.primary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Auth Token */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Auth Token
              </Text>
              <View style={styles.tokenContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.tokenInput,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="your-auth-token (optional)"
                  placeholderTextColor={theme.textMuted}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showToken}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.visibilityButton, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => setShowToken(!showToken)}
                >
                  <Text>{showToken ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: theme.textMuted }]}>
                Leave empty if your gateway doesn't require authentication
              </Text>
            </View>
            
            {/* Connect Button */}
            <TouchableOpacity
              style={[
                styles.connectButton,
                { backgroundColor: canConnect ? theme.primary : theme.border },
              ]}
              onPress={handleConnect}
              disabled={!canConnect}
              activeOpacity={0.8}
            >
              <Text style={styles.connectButtonText}>Connect 🦎</Text>
            </TouchableOpacity>
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Powered by OpenClaw • expo-openclaw-chat
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://openclaw.ai')}
            >
              <Text style={[styles.footerLink, { color: theme.primary }]}>
                Learn more →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    gap: 16,
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  tokenContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tokenInput: {
    flex: 1,
  },
  visibilityButton: {
    width: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 12,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 4,
  },
  quickUrls: {
    flexDirection: 'row',
    gap: 8,
  },
  quickUrlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickUrlText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '600',
  },
});
