/**
 * Notifications Service
 * 
 * Handles push notifications for incoming messages.
 * Uses expo-notifications for local notifications.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface UseNotificationsReturn {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  sendLocalNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<string | null>;
  clearAllNotifications: () => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
}

export interface NotificationResponseData {
  sessionKey?: string;
  [key: string]: unknown;
}

/**
 * Hook for managing notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('[Notifications] Permission check failed:', error);
      setHasPermission(false);
    }
  };

  // Check permission on mount
  useEffect(() => {
    checkPermissionStatus();
    
    // Listener for notification received while app is foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notifications] Received in foreground:', notification.request.content.title);
    });

    // Listener for notification response (tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notifications] User tapped notification:', response.notification.request.content.data);
      // Handle navigation here if needed
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('[Notifications] Permission check failed:', error);
      setHasPermission(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        // Set up notification channel for Android
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('messages', {
            name: 'Messages',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#22c55e', // Green accent
            sound: 'default',
          });
        }
      }
      
      return granted;
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return false;
    }
  }, []);

  const sendLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<string | null> => {
    if (!hasPermission) {
      console.log('[Notifications] No permission, skipping notification');
      return null;
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // Immediate
      });
      console.log('[Notifications] Sent notification:', id);
      return id;
    } catch (error) {
      console.error('[Notifications] Failed to send notification:', error);
      return null;
    }
  }, [hasPermission]);

  const clearAllNotifications = useCallback(async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('[Notifications] Failed to clear notifications:', error);
    }
  }, []);

  const setBadgeCount = useCallback(async (count: number) => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('[Notifications] Failed to set badge count:', error);
    }
  }, []);

  return {
    hasPermission,
    requestPermission,
    sendLocalNotification,
    clearAllNotifications,
    setBadgeCount,
  };
}

/**
 * Hook to track app background/foreground state
 */
export function useAppState(): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return appState;
}

/**
 * Hook to determine if app is in background
 */
export function useIsBackground(): boolean {
  const appState = useAppState();
  return appState === 'background' || appState === 'inactive';
}

/**
 * Listen for notification tap responses
 */
export function useNotificationResponses(onResponse: (data: NotificationResponseData) => void) {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data || {}) as NotificationResponseData;
      onResponse(data);
    });

    return () => subscription.remove();
  }, [onResponse]);
}
