/**
 * Services index - export all services
 */

export { speakText, stopSpeaking, isSpeaking, TTSManager } from './tts';
export {
  needsTitle,
  generateAndCacheTitle,
  generateFallbackTitle,
  getCachedTitle,
  markAsTitled,
  clearTitledCache,
  useSmartTitle,
} from './smartTitles';
export {
  useVoiceRecorder,
  useSoundEffects,
  formatDuration,
  type RecordingResult,
  type SoundEffect,
} from './audio';
export {
  useNotifications,
  useAppState,
  useIsBackground,
  useNotificationResponses,
  type NotificationPreferences,
  type NotificationResponseData,
} from './notifications';
export {
  useBiometricAuth,
  getBiometricLabel,
  getBiometricIcon,
  type BiometricType,
  type BiometricInfo,
} from './biometrics';
