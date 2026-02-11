/**
 * Persistent storage for CamiApp
 * Uses AsyncStorage (Expo Go compatible) with sync cache layer
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AccentColorName, ThemeMode } from '../theme/colors';

// Sync cache interface (same shape as MMKV for compatibility)
interface StorageInterface {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  delete(key: string): void;
}

// Sync cache backed by AsyncStorage
const syncCache: Record<string, string | undefined> = {};
let cacheLoaded = false;

// Load all keys from AsyncStorage into sync cache on startup
AsyncStorage.getAllKeys().then(async (keys) => {
  if (keys.length > 0) {
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) {
      if (value !== null) syncCache[key] = value;
    }
  }
  cacheLoaded = true;
}).catch(() => { cacheLoaded = true; });

function getStorage(): StorageInterface {
  return {
    getString: (key: string) => syncCache[key],
    set: (key: string, value: string | number | boolean) => {
      const strValue = String(value);
      syncCache[key] = strValue;
      AsyncStorage.setItem(key, strValue).catch(() => {});
    },
    delete: (key: string) => {
      delete syncCache[key];
      AsyncStorage.removeItem(key).catch(() => {});
    },
  };
}

// Export storage accessor
export const storage = {
  getString: (key: string) => getStorage().getString(key),
  set: (key: string, value: string | number | boolean) => getStorage().set(key, value),
  delete: (key: string) => getStorage().delete(key),
};

// Storage keys
export const StorageKeys = {
  // Connection settings
  GATEWAY_URL: 'gateway_url',
  AUTH_TOKEN: 'auth_token',
  
  // Appearance preferences
  THEME: 'theme', // ThemeMode: 'light' | 'dark' | 'frost-light' | 'frost-dark' | 'system'
  ACCENT_COLOR: 'accent_color', // AccentColorName: 'green' | 'blue' | 'purple' | etc.
  TEXT_SIZE: 'text_size', // 'small' | 'medium' | 'large' | 'xlarge'
  
  // Onboarding
  ONBOARDING_COMPLETE: 'onboarding_complete',
  
  // Session management
  LAST_SESSION_KEY: 'last_session_key',
  PINNED_SESSIONS: 'pinned_sessions',
  
  // Session cache (JSON)
  SESSIONS_CACHE: 'sessions_cache',
  
  // Unread tracking (JSON object: { sessionKey: lastReadMessageId })
  LAST_READ_MESSAGES: 'last_read_messages',
  
  // Smart titles cache (JSON object: { sessionKey: title })
  SMART_TITLES_CACHE: 'smart_titles_cache',
  
  // Sound & Notifications
  SOUND_EFFECTS_ENABLED: 'sound_effects_enabled',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  
  // Security
  BIOMETRIC_LOCK_ENABLED: 'biometric_lock_enabled',
} as const;

// Valid values
const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'frost-light', 'frost-dark', 'system'];
const VALID_ACCENT_COLORS: AccentColorName[] = ['green', 'blue', 'purple', 'orange', 'pink', 'red', 'cyan'];
const VALID_TEXT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;

export type TextSize = (typeof VALID_TEXT_SIZES)[number];

// Type-safe getters and setters
export const StorageHelpers = {
  // Onboarding
  getOnboardingComplete: () => storage.getString(StorageKeys.ONBOARDING_COMPLETE) === 'true',
  setOnboardingComplete: (complete: boolean) => storage.set(StorageKeys.ONBOARDING_COMPLETE, String(complete)),
  
  // Connection settings
  getGatewayUrl: () => storage.getString(StorageKeys.GATEWAY_URL) ?? '',
  setGatewayUrl: (url: string) => storage.set(StorageKeys.GATEWAY_URL, url),
  
  getAuthToken: () => storage.getString(StorageKeys.AUTH_TOKEN) ?? '',
  setAuthToken: (token: string) => storage.set(StorageKeys.AUTH_TOKEN, token),
  
  clearConnection: () => {
    storage.delete(StorageKeys.GATEWAY_URL);
    storage.delete(StorageKeys.AUTH_TOKEN);
  },
  
  // Appearance preferences
  getTheme: (): ThemeMode => {
    const theme = storage.getString(StorageKeys.THEME);
    if (theme && VALID_THEMES.includes(theme as ThemeMode)) {
      return theme as ThemeMode;
    }
    return 'system';
  },
  setTheme: (theme: ThemeMode) => storage.set(StorageKeys.THEME, theme),
  
  getAccentColor: (): AccentColorName => {
    const color = storage.getString(StorageKeys.ACCENT_COLOR);
    if (color && VALID_ACCENT_COLORS.includes(color as AccentColorName)) {
      return color as AccentColorName;
    }
    return 'green';
  },
  setAccentColor: (color: AccentColorName) => storage.set(StorageKeys.ACCENT_COLOR, color),
  
  getTextSize: (): TextSize => {
    const size = storage.getString(StorageKeys.TEXT_SIZE);
    if (size && VALID_TEXT_SIZES.includes(size as TextSize)) {
      return size as TextSize;
    }
    return 'medium';
  },
  setTextSize: (size: TextSize) => storage.set(StorageKeys.TEXT_SIZE, size),
  
  // Session management
  getLastSessionKey: () => storage.getString(StorageKeys.LAST_SESSION_KEY) ?? 'main',
  setLastSessionKey: (key: string) => storage.set(StorageKeys.LAST_SESSION_KEY, key),
  
  getPinnedSessions: (): string[] => {
    const json = storage.getString(StorageKeys.PINNED_SESSIONS);
    if (!json) return [];
    try {
      return JSON.parse(json) as string[];
    } catch {
      return [];
    }
  },
  setPinnedSessions: (sessions: string[]) => {
    storage.set(StorageKeys.PINNED_SESSIONS, JSON.stringify(sessions));
  },
  togglePinnedSession: (sessionKey: string) => {
    const pinned = StorageHelpers.getPinnedSessions();
    const index = pinned.indexOf(sessionKey);
    if (index >= 0) {
      pinned.splice(index, 1);
    } else {
      pinned.push(sessionKey);
    }
    StorageHelpers.setPinnedSessions(pinned);
    return pinned;
  },
  
  // Sessions cache
  getSessionsCache: () => {
    const json = storage.getString(StorageKeys.SESSIONS_CACHE);
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  },
  setSessionsCache: (sessions: unknown) => {
    storage.set(StorageKeys.SESSIONS_CACHE, JSON.stringify(sessions));
  },
  
  // Unread tracking
  getLastReadMessages: (): Record<string, string> => {
    const json = storage.getString(StorageKeys.LAST_READ_MESSAGES);
    if (!json) return {};
    try {
      return JSON.parse(json) as Record<string, string>;
    } catch {
      return {};
    }
  },
  setLastReadMessage: (sessionKey: string, messageId: string) => {
    const current = StorageHelpers.getLastReadMessages();
    current[sessionKey] = messageId;
    storage.set(StorageKeys.LAST_READ_MESSAGES, JSON.stringify(current));
  },
  getLastReadMessage: (sessionKey: string): string | null => {
    const all = StorageHelpers.getLastReadMessages();
    return all[sessionKey] || null;
  },
  
  // Smart titles cache
  getSmartTitlesCache: (): Record<string, string> => {
    const json = storage.getString(StorageKeys.SMART_TITLES_CACHE);
    if (!json) return {};
    try {
      return JSON.parse(json) as Record<string, string>;
    } catch {
      return {};
    }
  },
  setSmartTitle: (sessionKey: string, title: string) => {
    const current = StorageHelpers.getSmartTitlesCache();
    current[sessionKey] = title;
    storage.set(StorageKeys.SMART_TITLES_CACHE, JSON.stringify(current));
  },
  getSmartTitle: (sessionKey: string): string | null => {
    const all = StorageHelpers.getSmartTitlesCache();
    return all[sessionKey] || null;
  },
  
  // Sound effects
  getSoundEffectsEnabled: (): boolean => {
    const value = storage.getString(StorageKeys.SOUND_EFFECTS_ENABLED);
    // Default to true if not set
    return value !== 'false';
  },
  setSoundEffectsEnabled: (enabled: boolean) => {
    storage.set(StorageKeys.SOUND_EFFECTS_ENABLED, String(enabled));
  },
  
  // Notifications
  getNotificationsEnabled: (): boolean => {
    const value = storage.getString(StorageKeys.NOTIFICATIONS_ENABLED);
    // Default to true if not set
    return value !== 'false';
  },
  setNotificationsEnabled: (enabled: boolean) => {
    storage.set(StorageKeys.NOTIFICATIONS_ENABLED, String(enabled));
  },
  
  // Biometric lock
  getBiometricLockEnabled: (): boolean => {
    const value = storage.getString(StorageKeys.BIOMETRIC_LOCK_ENABLED);
    // Default to false if not set
    return value === 'true';
  },
  setBiometricLockEnabled: (enabled: boolean) => {
    storage.set(StorageKeys.BIOMETRIC_LOCK_ENABLED, String(enabled));
  },
};

// Text size map for styling
export const TEXT_SIZE_MAP = {
  small: { fontSize: 14, lineHeight: 20 },
  medium: { fontSize: 16, lineHeight: 22 },
  large: { fontSize: 18, lineHeight: 26 },
  xlarge: { fontSize: 20, lineHeight: 28 },
} as const;
