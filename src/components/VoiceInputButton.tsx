/**
 * Voice Input Button
 * 
 * A hold-to-record button for voice input.
 * Records audio and returns it as a file for transcription.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useVoiceRecorder, formatDuration, type RecordingResult } from '../services/audio';
import { useSettings } from '../stores/settings';

interface VoiceInputButtonProps {
  onRecordingComplete: (recording: RecordingResult) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onRecordingComplete, disabled }: VoiceInputButtonProps) {
  const { theme } = useSettings();
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
  } = useVoiceRecorder();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showCancelHint, setShowCancelHint] = useState(false);
  
  // Pulse animation while recording
  React.useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);
  
  const handlePressIn = useCallback(async () => {
    if (disabled) return;
    
    // Check permission first
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in Settings to use voice input.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // Start recording
    try {
      Animated.spring(scaleAnim, {
        toValue: 1.15,
        useNativeDriver: true,
      }).start();
      
      await startRecording();
      setShowCancelHint(true);
    } catch (error) {
      console.error('[VoiceInput] Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  }, [disabled, hasPermission, requestPermission, startRecording, scaleAnim]);
  
  const handlePressOut = useCallback(async () => {
    if (!isRecording) return;
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    
    setShowCancelHint(false);
    
    // Stop recording and get result
    const result = await stopRecording();
    if (result && result.duration >= 0.5) {
      onRecordingComplete(result);
    } else if (result) {
      // Recording too short
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [isRecording, stopRecording, onRecordingComplete, scaleAnim]);
  
  const handleLongPress = useCallback(() => {
    // Already handled by pressIn, this just prevents the default behavior
  }, []);
  
  return (
    <View style={styles.container}>
      {/* Recording indicator overlay */}
      {isRecording && (
        <View style={[styles.recordingOverlay, { backgroundColor: theme.error + '20' }]}>
          <Animated.View
            style={[
              styles.recordingDot,
              { 
                backgroundColor: theme.error,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Text style={[styles.recordingTime, { color: theme.text }]}>
            {formatDuration(recordingDuration)}
          </Text>
          {showCancelHint && (
            <Text style={[styles.cancelHint, { color: theme.textMuted }]}>
              Release to send • Slide to cancel
            </Text>
          )}
        </View>
      )}
      
      {/* Microphone button */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={100}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isRecording ? theme.error : (pressed ? theme.surfaceVariant : 'transparent'),
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text style={[styles.icon, { color: isRecording ? '#fff' : theme.text }]}>
            🎤
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  recordingOverlay: {
    position: 'absolute',
    bottom: 50,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    minWidth: 100,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingTime: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cancelHint: {
    fontSize: 11,
    marginLeft: 4,
  },
});
