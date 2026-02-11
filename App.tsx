/**
 * CamiApp - Your AI assistant in your pocket 🦎
 * 
 * A full-featured mobile client for OpenClaw Gateway
 * Built with Expo and React Native
 */

import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';

// Providers
import { SettingsProvider, useSettings } from './src/stores/settings';
import { StorageHelpers } from './src/stores/storage';

// Screens
import { EnhancedConnectScreen } from './src/screens/EnhancedConnectScreen';
import { EnhancedChatScreen } from './src/screens/EnhancedChatScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

// Keep splash screen visible while we check onboarding status
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors - splash screen may have already been hidden
});

// App content with access to settings
function AppContent() {
  const { isConnected, clearConnection, isDark, gatewayUrl, theme } = useSettings();
  const [showChat, setShowChat] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Check onboarding status on mount
  useEffect(() => {
    async function prepare() {
      try {
        // Small delay to ensure storage is loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if onboarding is complete
        const onboardingComplete = StorageHelpers.getOnboardingComplete();
        setShowOnboarding(!onboardingComplete);
        
        // If already connected, go to chat
        if (onboardingComplete && gatewayUrl) {
          setShowChat(true);
        }
      } catch (e) {
        console.warn('Error checking onboarding status:', e);
        setShowOnboarding(false);
      } finally {
        setAppIsReady(true);
      }
    }
    
    prepare();
  }, [gatewayUrl]);
  
  // Hide splash screen when ready
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors
      });
    }
  }, [appIsReady]);
  
  // Handle connect
  const handleConnect = useCallback(() => {
    setShowChat(true);
  }, []);
  
  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    clearConnection();
    setShowChat(false);
  }, [clearConnection]);
  
  // Handle onboarding complete
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    // If gateway was configured during onboarding, go to chat
    if (StorageHelpers.getGatewayUrl()) {
      setShowChat(true);
    }
  }, []);
  
  // Don't render until we've checked onboarding status
  if (!appIsReady || showOnboarding === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]} />
    );
  }
  
  return (
    <>
      {showOnboarding ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : showChat && gatewayUrl ? (
        <EnhancedChatScreen onDisconnect={handleDisconnect} />
      ) : (
        <EnhancedConnectScreen onConnect={handleConnect} />
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

// Main App component
export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
