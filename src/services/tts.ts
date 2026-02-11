/**
 * Text-to-Speech Service
 * 
 * Uses OpenClaw gateway TTS endpoint with expo-av for playback
 */

import { Audio } from 'expo-av';

// TTS endpoint configuration
// The gateway URL base is stored in settings, we append /api/tts
function getTtsUrl(gatewayUrl: string): string {
  // Convert WebSocket URL to HTTP
  let baseUrl = gatewayUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  // Remove trailing slash if present
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  return `${baseUrl}/api/tts`;
}

interface TTSOptions {
  voice?: string;
  provider?: 'auto' | 'elevenlabs' | 'openai' | 'edge';
}

interface TTSState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
}

let currentSound: Audio.Sound | null = null;

/**
 * Speak text using the TTS endpoint
 */
export async function speakText(
  text: string,
  gatewayUrl: string,
  options: TTSOptions = {},
): Promise<void> {
  // Stop any currently playing audio
  await stopSpeaking();
  
  const ttsUrl = getTtsUrl(gatewayUrl);
  
  // Request TTS audio
  const response = await fetch(ttsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.slice(0, 5000), // Limit text length
      voice: options.voice,
      provider: options.provider || 'auto',
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'TTS request failed' }));
    throw new Error((errorData as { error?: string }).error || `TTS error: ${response.status}`);
  }
  
  // Get audio blob and create a URI
  const audioBlob = await response.blob();
  const audioUri = URL.createObjectURL(audioBlob);
  
  // Configure audio mode for playback
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
  
  // Create and play sound
  const { sound } = await Audio.Sound.createAsync(
    { uri: audioUri },
    { shouldPlay: true },
  );
  
  currentSound = sound;
  
  // Clean up when finished
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && 'didJustFinish' in status && status.didJustFinish) {
      sound.unloadAsync().catch(() => {});
      currentSound = null;
      // Clean up blob URL
      URL.revokeObjectURL(audioUri);
    }
  });
}

/**
 * Stop current playback
 */
export async function stopSpeaking(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // Ignore errors during cleanup
    }
    currentSound = null;
  }
}

/**
 * Check if TTS is currently playing
 */
export function isSpeaking(): boolean {
  return currentSound !== null;
}

/**
 * Hook-compatible TTS manager
 */
export class TTSManager {
  private gatewayUrl: string;
  private listeners = new Set<(state: TTSState) => void>();
  private state: TTSState = {
    isLoading: false,
    isPlaying: false,
    error: null,
  };

  constructor(gatewayUrl: string) {
    this.gatewayUrl = gatewayUrl;
  }

  private setState(updates: Partial<TTSState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(cb => cb(this.state));
  }

  subscribe(callback: (state: TTSState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      await speakText(text, this.gatewayUrl, options);
      this.setState({ isLoading: false, isPlaying: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS failed';
      this.setState({ isLoading: false, isPlaying: false, error: message });
      throw err;
    }
  }

  async stop(): Promise<void> {
    await stopSpeaking();
    this.setState({ isPlaying: false });
  }

  getState(): TTSState {
    return this.state;
  }
}
