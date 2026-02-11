/**
 * Settings context and hook for app-wide preferences
 * 
 * Features:
 * - Theme mode (light/dark/frost-light/frost-dark/system)
 * - Accent color (green/blue/purple/orange/pink/red/cyan)
 * - Text size (small/medium/large/xlarge)
 * - Connection state
 */

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { StorageHelpers, TEXT_SIZE_MAP, type TextSize } from './storage';
import {
  getTheme,
  type Theme,
  type ThemeMode,
  type AccentColorName,
} from '../theme/colors';

interface SettingsContextValue {
  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: Theme;
  isDark: boolean;
  isFrost: boolean;
  
  // Accent color
  accentColor: AccentColorName;
  setAccentColor: (color: AccentColorName) => void;
  
  // Text size
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  textStyle: { fontSize: number; lineHeight: number };
  
  // Connection
  gatewayUrl: string;
  authToken: string;
  setConnection: (url: string, token: string) => void;
  clearConnection: () => void;
  isConnected: boolean;
  
  // Sound & Notifications
  soundEffectsEnabled: boolean;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  
  // Security
  biometricLockEnabled: boolean;
  setBiometricLockEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const systemColorScheme = useColorScheme();
  
  // Load initial values from storage
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => StorageHelpers.getTheme());
  const [accentColor, setAccentColorState] = useState<AccentColorName>(() => StorageHelpers.getAccentColor());
  const [textSize, setTextSizeState] = useState<TextSize>(() => StorageHelpers.getTextSize());
  const [gatewayUrl, setGatewayUrl] = useState(() => StorageHelpers.getGatewayUrl());
  const [authToken, setAuthToken] = useState(() => StorageHelpers.getAuthToken());
  
  // Sound & Notifications
  const [soundEffectsEnabled, setSoundEffectsEnabledState] = useState(() => StorageHelpers.getSoundEffectsEnabled());
  const [notificationsEnabled, setNotificationsEnabledState] = useState(() => StorageHelpers.getNotificationsEnabled());
  
  // Security
  const [biometricLockEnabled, setBiometricLockEnabledState] = useState(() => StorageHelpers.getBiometricLockEnabled());
  
  // Track system color scheme changes
  const [currentSystemScheme, setCurrentSystemScheme] = useState(systemColorScheme);
  
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setCurrentSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);
  
  // Resolve actual theme based on mode and system preference
  const resolvedThemeName = (() => {
    if (themeMode === 'system') {
      return currentSystemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  })();
  
  // Derive computed values
  const isDark = resolvedThemeName === 'dark' || resolvedThemeName === 'frost-dark';
  const isFrost = resolvedThemeName === 'frost-light' || resolvedThemeName === 'frost-dark';
  const theme = getTheme(resolvedThemeName, accentColor);
  
  // Theme mode setter with persistence
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    StorageHelpers.setTheme(mode);
  }, []);
  
  // Accent color setter with persistence
  const setAccentColor = useCallback((color: AccentColorName) => {
    setAccentColorState(color);
    StorageHelpers.setAccentColor(color);
  }, []);
  
  // Text size setter with persistence
  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    StorageHelpers.setTextSize(size);
  }, []);
  
  // Connection setter with persistence
  const setConnection = useCallback((url: string, token: string) => {
    setGatewayUrl(url);
    setAuthToken(token);
    StorageHelpers.setGatewayUrl(url);
    StorageHelpers.setAuthToken(token);
  }, []);
  
  // Clear connection
  const clearConnection = useCallback(() => {
    setGatewayUrl('');
    setAuthToken('');
    StorageHelpers.clearConnection();
  }, []);
  
  // Sound effects setter with persistence
  const setSoundEffectsEnabled = useCallback((enabled: boolean) => {
    setSoundEffectsEnabledState(enabled);
    StorageHelpers.setSoundEffectsEnabled(enabled);
  }, []);
  
  // Notifications setter with persistence
  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    StorageHelpers.setNotificationsEnabled(enabled);
  }, []);
  
  // Biometric lock setter with persistence
  const setBiometricLockEnabled = useCallback((enabled: boolean) => {
    setBiometricLockEnabledState(enabled);
    StorageHelpers.setBiometricLockEnabled(enabled);
  }, []);
  
  const value: SettingsContextValue = {
    themeMode,
    setThemeMode,
    theme,
    isDark,
    isFrost,
    accentColor,
    setAccentColor,
    textSize,
    setTextSize,
    textStyle: TEXT_SIZE_MAP[textSize],
    gatewayUrl,
    authToken,
    setConnection,
    clearConnection,
    isConnected: Boolean(gatewayUrl),
    soundEffectsEnabled,
    setSoundEffectsEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    biometricLockEnabled,
    setBiometricLockEnabled,
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Re-export types for convenience
export type { TextSize, ThemeMode, AccentColorName };
