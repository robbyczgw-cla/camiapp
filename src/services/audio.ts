/**
 * Audio Service
 * 
 * Handles audio recording for voice input and sound effect playback.
 * Uses expo-audio (the new API replacing expo-av).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  useAudioRecorder, 
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

// Sound effect files (base64 encoded or bundled assets)
// For simplicity, we'll use a placeholder approach with local files

export interface RecordingResult {
  uri: string;
  duration: number;
  fileName: string;
  mimeType: string;
  base64?: string;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for audio recording (voice input)
 */
export function useVoiceRecorder(): UseAudioRecorderReturn {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [hasPermission, setHasPermission] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  // Update duration while recording
  useEffect(() => {
    if (recorder.isRecording) {
      durationInterval.current = setInterval(() => {
        const elapsed = (Date.now() - startTime.current) / 1000;
        setRecordingDuration(elapsed);
      }, 100);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [recorder.isRecording]);

  const checkPermission = async () => {
    try {
      const status = await AudioModule.getRecordingPermissionsAsync();
      setHasPermission(status.granted);
    } catch (error) {
      console.error('[Audio] Permission check failed:', error);
      setHasPermission(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);
      return status.granted;
    } catch (error) {
      console.error('[Audio] Permission request failed:', error);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }
    }

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      startTime.current = Date.now();
      setRecordingDuration(0);
      
      await recorder.record();
      console.log('[Audio] Recording started');
    } catch (error) {
      console.error('[Audio] Failed to start recording:', error);
      throw error;
    }
  }, [hasPermission, requestPermission, recorder]);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Stop the recording
      await recorder.stop();
      
      // Get the recording status to retrieve the URI
      const status = await recorder.getStatus();
      const uri = status.url;
      const duration = recordingDuration;
      
      console.log('[Audio] Recording stopped:', { uri, duration });
      
      if (!uri) {
        console.warn('[Audio] No recording URI returned');
        return null;
      }

      // Read file as base64 for sending
      let base64: string | undefined;
      try {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
      } catch (error) {
        console.warn('[Audio] Failed to read recording as base64:', error);
      }

      const fileName = `voice-${Date.now()}.m4a`;
      
      setRecordingDuration(0);

      return {
        uri,
        duration,
        fileName,
        mimeType: 'audio/m4a',
        base64,
      };
    } catch (error) {
      console.error('[Audio] Failed to stop recording:', error);
      return null;
    }
  }, [recorder, recordingDuration]);

  const cancelRecording = useCallback(() => {
    if (recorder.isRecording) {
      recorder.stop();
      setRecordingDuration(0);
    }
  }, [recorder]);

  return {
    isRecording: recorder.isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
  };
}

/**
 * Sound effect types
 */
export type SoundEffect = 'send' | 'receive';

// Pre-generated minimal audio (base64 encoded)
// These are tiny, valid audio files that make subtle sounds
const SOUND_EFFECTS: Record<SoundEffect, string> = {
  // Subtle "whoosh" for send - empty placeholder, will use system sounds instead
  send: '',
  // Subtle "ding" for receive - empty placeholder
  receive: '',
};

/**
 * Hook for playing sound effects
 */
export function useSoundEffects() {
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  
  const playSound = useCallback(async (effect: SoundEffect) => {
    if (!soundsEnabled) return;
    
    try {
      // For now, we'll use haptic feedback as a substitute for sounds
      // since bundling actual audio files requires more setup
      // In a production app, you'd bundle actual audio files
      switch (effect) {
        case 'send':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'receive':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    } catch (error) {
      console.warn('[Audio] Failed to play sound effect:', error);
    }
  }, [soundsEnabled]);

  return {
    soundsEnabled,
    setSoundsEnabled,
    playSound,
  };
}

/**
 * Format duration in mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
