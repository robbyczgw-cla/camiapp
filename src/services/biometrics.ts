/**
 * Biometric Authentication Service
 * 
 * Handles fingerprint/face authentication for app lock.
 * Uses expo-local-authentication.
 */

import { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricInfo {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
}

export interface UseBiometricAuthReturn {
  biometricInfo: BiometricInfo;
  authenticate: (promptMessage?: string) => Promise<boolean>;
  isLoading: boolean;
}

/**
 * Get the primary biometric type available on the device
 */
async function getBiometricType(): Promise<BiometricType> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
  } catch (error) {
    console.error('[Biometrics] Failed to get biometric types:', error);
  }
  
  return 'none';
}

/**
 * Get a human-readable label for the biometric type
 */
export function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return 'Face ID';
    case 'fingerprint':
      return 'Fingerprint';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometrics';
  }
}

/**
 * Get an emoji icon for the biometric type
 */
export function getBiometricIcon(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return '😊';
    case 'fingerprint':
      return '👆';
    case 'iris':
      return '👁️';
    default:
      return '🔒';
  }
}

/**
 * Hook for biometric authentication
 */
export function useBiometricAuth(): UseBiometricAuthReturn {
  const [biometricInfo, setBiometricInfo] = useState<BiometricInfo>({
    isAvailable: false,
    biometricType: 'none',
    isEnrolled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    setIsLoading(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const biometricType = await getBiometricType();

      setBiometricInfo({
        isAvailable: hasHardware && isEnrolled,
        biometricType,
        isEnrolled,
      });
      
      console.log('[Biometrics] Info:', { hasHardware, isEnrolled, biometricType });
    } catch (error) {
      console.error('[Biometrics] Availability check failed:', error);
      setBiometricInfo({
        isAvailable: false,
        biometricType: 'none',
        isEnrolled: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = useCallback(async (promptMessage?: string): Promise<boolean> => {
    if (!biometricInfo.isAvailable) {
      console.log('[Biometrics] Not available, skipping authentication');
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to access CamiApp',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      console.log('[Biometrics] Authentication result:', result);
      return result.success;
    } catch (error) {
      console.error('[Biometrics] Authentication failed:', error);
      return false;
    }
  }, [biometricInfo.isAvailable]);

  return {
    biometricInfo,
    authenticate,
    isLoading,
  };
}
