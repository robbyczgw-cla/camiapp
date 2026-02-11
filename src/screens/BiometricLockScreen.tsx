/**
 * Biometric Lock Screen
 * 
 * Shown when biometric lock is enabled and the app is opened.
 * Requires authentication to access the app.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useBiometricAuth, getBiometricLabel, getBiometricIcon } from '../services/biometrics';
import { useSettings } from '../stores/settings';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  const { theme } = useSettings();
  const { biometricInfo, authenticate, isLoading } = useBiometricAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attempt authentication on mount
  useEffect(() => {
    if (!isLoading && biometricInfo.isAvailable) {
      handleAuthenticate();
    }
  }, [isLoading, biometricInfo.isAvailable]);

  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const success = await authenticate('Unlock CamiApp');
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('[BiometricLock] Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, authenticate, onUnlock]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* App icon */}
        <Text style={styles.appIcon}>🦎</Text>
        <Text style={[styles.title, { color: theme.text }]}>CamiApp is Locked</Text>
        
        {/* Biometric icon and label */}
        <View style={[styles.biometricCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.biometricIcon}>
            {getBiometricIcon(biometricInfo.biometricType)}
          </Text>
          <Text style={[styles.biometricLabel, { color: theme.textSecondary }]}>
            Authenticate with {getBiometricLabel(biometricInfo.biometricType)}
          </Text>
        </View>
        
        {/* Error message */}
        {error && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        )}
        
        {/* Unlock button */}
        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: theme.primary }]}
          onPress={handleAuthenticate}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          {isAuthenticating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.unlockButtonText}>
              Unlock
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  appIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
  },
  biometricCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    minWidth: 200,
  },
  biometricIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  biometricLabel: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  unlockButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
