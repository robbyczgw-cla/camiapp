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
