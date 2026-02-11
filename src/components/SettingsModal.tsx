/**
 * Settings Modal/Screen
 * 
 * Full settings interface with:
 * - Theme picker with visual previews
 * - Accent color picker (colored circles)
 * - Text size selector
 * - Connection info
 * - About section
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings, type ThemeMode, type TextSize, type AccentColorName } from '../stores/settings';
import { themeOptions, accentColorOptions, accentColors } from '../theme/colors';
import { useNotifications } from '../services/notifications';
import { useBiometricAuth, getBiometricLabel, getBiometricIcon } from '../services/biometrics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  gatewayUrl: string;
  isConnected: boolean;
}

// Text size options
const TEXT_SIZE_OPTIONS: { value: TextSize; label: string; size: number }[] = [
  { value: 'small', label: 'S', size: 14 },
  { value: 'medium', label: 'M', size: 16 },
  { value: 'large', label: 'L', size: 18 },
  { value: 'xlarge', label: 'XL', size: 20 },
];

/**
 * Theme Preview Card - Shows a mini preview of the theme
 */
function ThemePreviewCard({
  option,
  isSelected,
  accentColor,
  onPress,
}: {
  option: (typeof themeOptions)[number];
  isSelected: boolean;
  accentColor: string;
  onPress: () => void;
}) {
  // Determine preview colors based on theme
  const previewColors = (() => {
    switch (option.value) {
      case 'dark':
        return { bg: '#171717', surface: '#262626', text: '#fafafa', border: '#404040' };
      case 'frost-light':
        return { bg: '#f5f7ff', surface: 'rgba(255,255,255,0.8)', text: '#312e81', border: 'rgba(165,180,252,0.3)' };
      case 'frost-dark':
        return { bg: '#0a0a14', surface: 'rgba(22,22,37,0.8)', text: '#f5f5ff', border: 'rgba(93,93,160,0.3)' };
      case 'system':
        // Split view for system
        return { bg: '#fafafa', surface: '#ffffff', text: '#171717', border: '#e5e5e5', isDual: true };
      default: // light
        return { bg: '#fafafa', surface: '#ffffff', text: '#171717', border: '#e5e5e5' };
    }
  })();

  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        isSelected && { borderColor: accentColor, borderWidth: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Theme preview box */}
      <View
        style={[
          styles.themePreview,
          { backgroundColor: previewColors.bg },
          option.value === 'system' && styles.themePreviewSplit,
        ]}
      >
        {option.value === 'system' ? (
          // Split view for system theme
          <>
            <View style={[styles.themePreviewHalf, { backgroundColor: '#fafafa' }]}>
              <View style={[styles.previewBubble, { backgroundColor: '#ffffff' }]} />
              <View style={[styles.previewAccent, { backgroundColor: accentColor }]} />
            </View>
            <View style={[styles.themePreviewHalf, { backgroundColor: '#171717' }]}>
              <View style={[styles.previewBubble, { backgroundColor: '#262626' }]} />
              <View style={[styles.previewAccent, { backgroundColor: accentColor }]} />
            </View>
          </>
        ) : (
          // Normal theme preview
          <>
            <View style={[styles.previewBubble, { backgroundColor: previewColors.surface }]} />
            <View style={[styles.previewAccent, { backgroundColor: accentColor }]} />
          </>
        )}
      </View>
      
      {/* Theme label */}
      <View style={styles.themeLabelContainer}>
        <Text style={styles.themeIcon}>{option.icon}</Text>
        <Text style={[styles.themeLabel, isSelected && { fontWeight: '700' }]}>
          {option.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Accent Color Circle
 */
function AccentColorCircle({
  color,
  isSelected,
  onPress,
}: {
  color: AccentColorName;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colorValue = accentColors[color].accent;
  
  return (
    <TouchableOpacity
      style={[
        styles.accentCircle,
        { backgroundColor: colorValue },
        isSelected && styles.accentCircleSelected,
        isSelected && { shadowColor: colorValue },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isSelected && <Text style={styles.accentCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

/**
 * Section Header
 */
function SectionHeader({ title, theme }: { title: string; theme: ReturnType<typeof useSettings>['theme'] }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
      {title}
    </Text>
  );
}

/**
 * Settings Card
 */
function SettingsCard({ children, theme }: { children: React.ReactNode; theme: ReturnType<typeof useSettings>['theme'] }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {children}
    </View>
  );
}

/**
 * Toggle Row Component
 */
function ToggleRow({
  label,
  description,
  icon,
  value,
  onValueChange,
  disabled,
  theme,
}: {
  label: string;
  description?: string;
  icon: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  theme: ReturnType<typeof useSettings>['theme'];
}) {
  return (
    <View style={[styles.toggleRow, disabled && { opacity: 0.5 }]}>
      <View style={styles.toggleInfo}>
        <View style={styles.toggleLabelRow}>
          <Text style={styles.toggleIcon}>{icon}</Text>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
        </View>
        {description && (
          <Text style={[styles.toggleDescription, { color: theme.textMuted }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export function SettingsModal({
  visible,
  onClose,
  onDisconnect,
  gatewayUrl,
  isConnected,
}: SettingsModalProps) {
  const {
    theme,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    textSize,
    setTextSize,
    isFrost,
    soundEffectsEnabled,
    setSoundEffectsEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    biometricLockEnabled,
    setBiometricLockEnabled,
  } = useSettings();
  
  // Notifications hook
  const { hasPermission: hasNotificationPermission, requestPermission: requestNotificationPermission } = useNotifications();
  
  // Biometric auth hook
  const { biometricInfo } = useBiometricAuth();
  
  // Handle theme change
  const handleThemeChange = useCallback((mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(mode);
  }, [setThemeMode]);
  
  // Handle accent color change
  const handleAccentChange = useCallback((color: AccentColorName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAccentColor(color);
  }, [setAccentColor]);
  
  // Handle text size change
  const handleTextSizeChange = useCallback((size: TextSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTextSize(size);
  }, [setTextSize]);
  
  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from the gateway?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            onDisconnect();
            onClose();
          },
        },
      ],
      { cancelable: true }
    );
  }, [onDisconnect, onClose]);
  
  // Handle link press
  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);
  
  // Handle sound effects toggle
  const handleSoundEffectsToggle = useCallback((enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSoundEffectsEnabled(enabled);
  }, [setSoundEffectsEnabled]);
  
  // Handle notifications toggle
  const handleNotificationsToggle = useCallback(async (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (enabled && !hasNotificationPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to receive message alerts.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    setNotificationsEnabled(enabled);
  }, [hasNotificationPermission, requestNotificationPermission, setNotificationsEnabled]);
  
  // Handle biometric lock toggle
  const handleBiometricToggle = useCallback((enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!biometricInfo.isAvailable) {
      Alert.alert(
        'Biometrics Not Available',
        'Your device does not have biometric authentication set up.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setBiometricLockEnabled(enabled);
  }, [biometricInfo.isAvailable, setBiometricLockEnabled]);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* APPEARANCE SECTION */}
          <View style={styles.section}>
            <SectionHeader title="APPEARANCE" theme={theme} />
            
            {/* Theme Picker */}
            <SettingsCard theme={theme}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Theme</Text>
              <View style={styles.themeGrid}>
                {themeOptions.map((option) => (
                  <ThemePreviewCard
                    key={option.value}
                    option={option}
                    isSelected={themeMode === option.value}
                    accentColor={theme.primary}
                    onPress={() => handleThemeChange(option.value)}
                  />
                ))}
              </View>
            </SettingsCard>
            
            {/* Accent Color */}
            <SettingsCard theme={theme}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Accent Color</Text>
              <View style={styles.accentGrid}>
                {accentColorOptions.map((option) => (
                  <AccentColorCircle
                    key={option.value}
                    color={option.value}
                    isSelected={accentColor === option.value}
                    onPress={() => handleAccentChange(option.value)}
                  />
                ))}
              </View>
            </SettingsCard>
            
            {/* Text Size */}
            <SettingsCard theme={theme}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Text Size</Text>
              <View style={styles.textSizeControl}>
                {TEXT_SIZE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.textSizeOption,
                      { backgroundColor: theme.surfaceVariant },
                      textSize === option.value && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => handleTextSizeChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.textSizeLabel,
                        {
                          color: textSize === option.value ? '#fff' : theme.text,
                          fontSize: option.size - 2,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.previewText, { color: theme.textSecondary, fontSize: TEXT_SIZE_OPTIONS.find(o => o.value === textSize)?.size ?? 16 }]}>
                Preview text size
              </Text>
            </SettingsCard>
          </View>
          
          {/* SOUNDS & NOTIFICATIONS SECTION */}
          <View style={styles.section}>
            <SectionHeader title="SOUNDS & NOTIFICATIONS" theme={theme} />
            
            <SettingsCard theme={theme}>
              <ToggleRow
                label="Sound Effects"
                description="Play sounds when sending/receiving messages"
                icon="🔊"
                value={soundEffectsEnabled}
                onValueChange={handleSoundEffectsToggle}
                theme={theme}
              />
              
              <View style={[styles.toggleDivider, { backgroundColor: theme.border }]} />
              
              <ToggleRow
                label="Notifications"
                description="Show alerts for new messages"
                icon="🔔"
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                theme={theme}
              />
            </SettingsCard>
          </View>
          
          {/* SECURITY SECTION */}
          <View style={styles.section}>
            <SectionHeader title="SECURITY" theme={theme} />
            
            <SettingsCard theme={theme}>
              <ToggleRow
                label={`Lock with ${getBiometricLabel(biometricInfo.biometricType)}`}
                description="Require authentication to open the app"
                icon={getBiometricIcon(biometricInfo.biometricType)}
                value={biometricLockEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricInfo.isAvailable}
                theme={theme}
              />
              
              {!biometricInfo.isAvailable && (
                <Text style={[styles.disabledHint, { color: theme.textMuted }]}>
                  {biometricInfo.isEnrolled 
                    ? 'Biometric authentication is not available on this device.'
                    : 'Set up biometrics in your device settings to use this feature.'}
                </Text>
              )}
            </SettingsCard>
          </View>
          
          {/* CONNECTION SECTION */}
          <View style={styles.section}>
            <SectionHeader title="CONNECTION" theme={theme} />
            
            <SettingsCard theme={theme}>
              {/* Status */}
              <View style={styles.connectionRow}>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? theme.success : theme.error }]} />
                <Text style={[styles.statusText, { color: theme.text }]}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              
              {/* Gateway URL */}
              <View style={styles.connectionInfo}>
                <Text style={[styles.connectionLabel, { color: theme.textSecondary }]}>
                  Gateway
                </Text>
                <Text style={[styles.connectionValue, { color: theme.textMuted }]} numberOfLines={1}>
                  {gatewayUrl || 'Not configured'}
                </Text>
              </View>
            </SettingsCard>
            
            {/* Disconnect Button */}
            <TouchableOpacity
              style={[styles.disconnectButton, { backgroundColor: theme.error }]}
              onPress={handleDisconnect}
              activeOpacity={0.8}
            >
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
          
          {/* ABOUT SECTION */}
          <View style={styles.section}>
            <SectionHeader title="ABOUT" theme={theme} />
            
            <SettingsCard theme={theme}>
              <View style={styles.aboutRow}>
                <Text style={{ fontSize: 40 }}>🦎</Text>
                <View style={styles.aboutText}>
                  <Text style={[styles.appName, { color: theme.text }]}>CamiApp</Text>
                  <Text style={[styles.appVersion, { color: theme.textMuted }]}>Version 1.0.0</Text>
                </View>
              </View>
              <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
                Your AI assistant in your pocket. A mobile client for OpenClaw Gateway with Frost glassmorphism themes.
              </Text>
              
              {/* Links */}
              <View style={styles.linksRow}>
                <TouchableOpacity
                  style={[styles.linkButton, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => handleLinkPress('https://github.com/robbyczgw-cla/camiapp')}
                >
                  <Text style={[styles.linkText, { color: theme.primary }]}>GitHub</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkButton, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => handleLinkPress('https://docs.openclaw.ai')}
                >
                  <Text style={[styles.linkText, { color: theme.primary }]}>Docs</Text>
                </TouchableOpacity>
              </View>
            </SettingsCard>
          </View>
          
          {/* Bottom padding */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  
  // Theme picker
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '30%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
    overflow: 'hidden',
  },
  themePreview: {
    height: 60,
    padding: 8,
    justifyContent: 'flex-end',
    gap: 4,
  },
  themePreviewSplit: {
    flexDirection: 'row',
    padding: 0,
  },
  themePreviewHalf: {
    flex: 1,
    padding: 6,
    justifyContent: 'flex-end',
    gap: 3,
  },
  previewBubble: {
    height: 14,
    borderRadius: 7,
    width: '80%',
  },
  previewAccent: {
    height: 6,
    borderRadius: 3,
    width: '50%',
  },
  themeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  themeIcon: {
    fontSize: 14,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  
  // Accent colors
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accentCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentCircleSelected: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  accentCheck: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Text size
  textSizeControl: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  textSizeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  textSizeLabel: {
    fontWeight: '600',
  },
  previewText: {
    textAlign: 'center',
  },
  
  // Connection
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  connectionInfo: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  connectionLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  connectionValue: {
    fontSize: 14,
  },
  disconnectButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  disconnectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // About
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  aboutText: {
    marginLeft: 14,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
  },
  appVersion: {
    fontSize: 14,
    marginTop: 2,
  },
  appDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  linkButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleIcon: {
    fontSize: 18,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 13,
    marginTop: 2,
    marginLeft: 26,
  },
  toggleDivider: {
    height: 1,
    marginVertical: 12,
  },
  disabledHint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
