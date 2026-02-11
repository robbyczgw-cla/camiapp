/**
 * Onboarding Screen - First launch experience
 * 
 * Steps:
 * 1. Welcome - Branding and intro
 * 2. Connect - Gateway URL setup with presets
 * 3. Theme - Quick theme picker
 * 4. Ready - Features overview
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings, type ThemeMode } from '../stores/settings';
import { StorageHelpers } from '../stores/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Quick presets for gateway URLs
const GATEWAY_PRESETS = [
  { label: 'Tailscale', url: 'wss://openclaw-server.tail8a9ea9.ts.net', icon: '🌐' },
  { label: 'Localhost', url: 'ws://localhost:18789', icon: '💻' },
];

// Theme options for quick picker
const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string; colors: { bg: string; text: string } }[] = [
  { value: 'light', label: 'Light', icon: '☀️', colors: { bg: '#fafafa', text: '#171717' } },
  { value: 'dark', label: 'Dark', icon: '🌙', colors: { bg: '#0a0a0a', text: '#fafafa' } },
  { value: 'system', label: 'Auto', icon: '📱', colors: { bg: '#525252', text: '#fafafa' } },
];

// Feature highlights
const FEATURES = [
  { icon: '💬', title: 'Chat with AI', description: 'Powerful conversations with streaming' },
  { icon: '🎨', title: 'Beautiful Themes', description: '5 themes including Frost glassmorphism' },
  { icon: '🔍', title: 'Smart Search', description: 'Search messages across all sessions' },
  { icon: '🖼️', title: 'Image Support', description: 'Send images to your AI assistant' },
  { icon: '📤', title: 'Export', description: 'Export conversations in MD/JSON/TXT' },
  { icon: '⚡', title: 'Real-time', description: 'Token-by-token streaming responses' },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme, setThemeMode, themeMode, setConnection } = useSettings();
  const scrollRef = useRef<ScrollView>(null);
  
  // Current step (0-3)
  const [step, setStep] = useState(0);
  
  // Form state
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(themeMode);
  
  // Navigate to next step
  const nextStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    
    if (step < 3) {
      const newStep = step + 1;
      setStep(newStep);
      scrollRef.current?.scrollTo({ x: newStep * SCREEN_WIDTH, animated: true });
    }
  }, [step]);
  
  // Navigate to previous step
  const prevStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step > 0) {
      const newStep = step - 1;
      setStep(newStep);
      scrollRef.current?.scrollTo({ x: newStep * SCREEN_WIDTH, animated: true });
    }
  }, [step]);
  
  // Handle gateway preset selection
  const handlePresetSelect = useCallback((url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGatewayUrl(url);
  }, []);
  
  // Handle theme selection
  const handleThemeSelect = useCallback((mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTheme(mode);
    setThemeMode(mode);
  }, [setThemeMode]);
  
  // Complete onboarding
  const handleComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Save connection if provided
    if (gatewayUrl.trim()) {
      let url = gatewayUrl.trim();
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        url = `wss://${url}`;
      }
      setConnection(url, authToken.trim());
    }
    
    // Mark onboarding as complete
    StorageHelpers.setOnboardingComplete(true);
    
    onComplete();
  }, [gatewayUrl, authToken, setConnection, onComplete]);
  
  // Skip onboarding entirely
  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    StorageHelpers.setOnboardingComplete(true);
    onComplete();
  }, [onComplete]);
  
  // Step indicators
  const renderStepIndicators = () => (
    <View style={styles.stepIndicators}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            {
              backgroundColor: i === step ? theme.primary : theme.border,
              width: i === step ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
  
  // Step 0: Welcome
  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentCenter}>
        <Text style={styles.welcomeEmoji}>🦎</Text>
        <Text style={[styles.welcomeTitle, { color: theme.text }]}>
          Welcome to CamiApp
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
          Your AI assistant in your pocket
        </Text>
        <Text style={[styles.welcomeDescription, { color: theme.textMuted }]}>
          Let's get you set up in just a few steps
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipButtonText, { color: theme.textMuted }]}>
            Skip Setup
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Step 1: Connect to Gateway
  const renderConnect = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollStep}
        contentContainerStyle={styles.scrollStepContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepEmoji}>🔌</Text>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Connect to Gateway
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
            Enter your OpenClaw Gateway URL
          </Text>
        </View>
        
        {/* Quick presets */}
        <View style={styles.presetsContainer}>
          <Text style={[styles.presetsLabel, { color: theme.textMuted }]}>
            Quick presets:
          </Text>
          <View style={styles.presetButtons}>
            {GATEWAY_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor: gatewayUrl === preset.url ? theme.primary : theme.surfaceVariant,
                    borderColor: gatewayUrl === preset.url ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handlePresetSelect(preset.url)}
              >
                <Text style={styles.presetIcon}>{preset.icon}</Text>
                <Text
                  style={[
                    styles.presetLabel,
                    { color: gatewayUrl === preset.url ? '#fff' : theme.text },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* URL input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
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
            value={gatewayUrl}
            onChangeText={setGatewayUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
        
        {/* Token input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Auth Token (optional)
          </Text>
          <View style={styles.tokenRow}>
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
              placeholder="your-auth-token"
              placeholderTextColor={theme.textMuted}
              value={authToken}
              onChangeText={setAuthToken}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showToken}
            />
            <TouchableOpacity
              style={[styles.tokenToggle, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => setShowToken(!showToken)}
            >
              <Text>{showToken ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={prevStep}
          >
            <Text style={[styles.navButtonText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: theme.primary }]}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>
              {gatewayUrl.trim() ? 'Next' : 'Skip for now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
  
  // Step 2: Choose Theme
  const renderTheme = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>🎨</Text>
        <Text style={[styles.stepTitle, { color: theme.text }]}>
          Choose Your Theme
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          You can always change this later in settings
        </Text>
      </View>
      
      <View style={styles.themeGrid}>
        {THEME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.themeOption,
              {
                backgroundColor: option.colors.bg,
                borderColor: selectedTheme === option.value ? theme.primary : theme.border,
                borderWidth: selectedTheme === option.value ? 3 : 1,
              },
            ]}
            onPress={() => handleThemeSelect(option.value)}
          >
            <Text style={styles.themeIcon}>{option.icon}</Text>
            <Text style={[styles.themeLabel, { color: option.colors.text }]}>
              {option.label}
            </Text>
            {selectedTheme === option.value && (
              <View style={[styles.themeCheck, { backgroundColor: theme.primary }]}>
                <Text style={styles.themeCheckIcon}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={[styles.themeHint, { color: theme.textMuted }]}>
        More themes available: Ice ❄️ and Noir 🌑 glassmorphism
      </Text>
      
      <View style={styles.buttonContainer}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={prevStep}
          >
            <Text style={[styles.navButtonText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: theme.primary }]}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  // Step 3: Ready
  const renderReady = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>🚀</Text>
        <Text style={[styles.stepTitle, { color: theme.text }]}>
          You're All Set!
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          Here's what you can do with CamiApp
        </Text>
      </View>
      
      <ScrollView 
        style={styles.featuresScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.featuresContainer}
      >
        {FEATURES.map((feature, index) => (
          <View
            key={index}
            style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                {feature.title}
              </Text>
              <Text style={[styles.featureDescription, { color: theme.textMuted }]}>
                {feature.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, styles.startButton, { backgroundColor: theme.primary }]}
          onPress={handleComplete}
        >
          <Text style={styles.startButtonText}>Start Chatting 🦎</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {renderStepIndicators()}
      
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.stepsScroll}
      >
        {renderWelcome()}
        {renderConnect()}
        {renderTheme()}
        {renderReady()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  stepsScroll: {
    flex: 1,
  },
  stepContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  scrollStep: {
    flex: 1,
  },
  scrollStepContent: {
    paddingBottom: 24,
  },
  contentCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  stepEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingTop: 16,
  },
  primaryButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  navButtonPrimary: {
    flex: 2,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetsContainer: {
    marginBottom: 24,
  },
  presetsLabel: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  presetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetIcon: {
    fontSize: 20,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  tokenRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tokenInput: {
    flex: 1,
  },
  tokenToggle: {
    width: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  themeOption: {
    width: 100,
    height: 140,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  themeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCheckIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  themeHint: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 24,
  },
  featuresScroll: {
    flex: 1,
  },
  featuresContainer: {
    gap: 12,
    paddingBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
  },
  startButton: {
    padding: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
});
