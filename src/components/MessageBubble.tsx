/**
 * Message bubble component with markdown support
 * 
 * Features:
 * - Markdown rendering for assistant messages
 * - Image display
 * - Timestamps
 * - Long press to copy
 * - Streaming indicator
 * - TTS playback
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Alert, Share, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MarkdownRenderer, SimpleTextRenderer } from './MarkdownRenderer';
import { TypingDots } from './TypingIndicator';
import { useSettings } from '../stores/settings';
import { speakText, stopSpeaking, isSpeaking } from '../services/tts';
import type { UIMessage } from '../types';

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
  showTimestamp?: boolean;
  gatewayUrl?: string;
  onReply?: (text: string) => void;
}

export function MessageBubble({ message, isStreaming, showTimestamp = true, gatewayUrl, onReply }: MessageBubbleProps) {
  const { theme, textStyle, isDark } = useSettings();
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  
  const isUser = message.role === 'user';
  const isError = message.isError;
  
  // Extract text and images from content blocks
  const { textContent, images, thinkingContent } = useMemo(() => {
    let text = '';
    const imgs: string[] = [];
    let thinking = '';
    
    for (const block of message.content) {
      if (block.type === 'text') {
        text += (block as { type: 'text'; text: string }).text;
      } else if (block.type === 'image') {
        const imgBlock = block as {
          type: 'image';
          source?: { type: string; data?: string; media_type?: string; url?: string };
        };
        if (imgBlock.source?.type === 'base64' && imgBlock.source.data) {
          imgs.push(`data:${imgBlock.source.media_type};base64,${imgBlock.source.data}`);
        } else if (imgBlock.source?.type === 'url' && imgBlock.source.url) {
          imgs.push(imgBlock.source.url);
        }
      } else if (block.type === 'thinking') {
        thinking += (block as { type: 'thinking'; thinking: string }).thinking;
      }
    }
    
    return { textContent: text, images: imgs, thinkingContent: thinking };
  }, [message.content]);
  
  // Format timestamp
  const formattedTime = useMemo(() => {
    if (!message.timestamp) return null;
    const date = new Date(message.timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.timestamp]);
  
  // Copy message text
  const handleCopy = useCallback(async () => {
    if (!textContent) return;
    
    try {
      await Clipboard.setStringAsync(textContent);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Show brief feedback
    } catch (error) {
      console.warn('Failed to copy:', error);
    }
  }, [textContent]);
  
  // Share message
  const handleShare = useCallback(async () => {
    if (!textContent) return;
    
    try {
      await Share.share({
        message: textContent,
      });
    } catch (error) {
      console.warn('Failed to share:', error);
    }
  }, [textContent]);
  
  // TTS playback
  const handleTTS = useCallback(async () => {
    if (!textContent || !gatewayUrl) return;
    
    if (ttsPlaying) {
      // Stop current playback
      setTtsPlaying(false);
      await stopSpeaking();
      return;
    }
    
    setTtsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await speakText(textContent, gatewayUrl);
      setTtsPlaying(true);
      // Auto-reset when done (the sound callback handles this, but let's add a safety timeout)
      setTimeout(() => setTtsPlaying(false), 60000);
    } catch (error) {
      console.warn('TTS failed:', error);
      Alert.alert('TTS Unavailable', 'Text-to-speech is not available. Please check your gateway configuration.');
    } finally {
      setTtsLoading(false);
    }
  }, [textContent, gatewayUrl, ttsPlaying]);
  
  // Handle reply
  const handleReply = useCallback(async () => {
    if (!textContent || !onReply) return;
    // Create a quote format
    const quote = `> ${textContent.slice(0, 100)}${textContent.length > 100 ? '...' : ''}\n\n`;
    onReply(quote);
  }, [textContent, onReply]);
  
  // Long press handler with extended menu
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const options = [
      { text: 'Copy', onPress: handleCopy },
      { text: 'Share', onPress: handleShare },
    ];
    
    // Only show Reply if handler is provided
    if (onReply) {
      options.unshift({ text: 'Reply', onPress: handleReply });
    }
    
    // Add TTS option for assistant messages
    if (!isUser && textContent && gatewayUrl && !isStreaming) {
      options.push({ text: ttsPlaying ? 'Stop Audio' : 'Read Aloud', onPress: handleTTS });
    }
    
    options.push({ text: 'Cancel', style: 'cancel' } as any);
    
    Alert.alert(
      'Message',
      undefined,
      options,
      { cancelable: true }
    );
  }, [handleCopy, handleShare, handleReply, handleTTS, onReply, isUser, textContent, gatewayUrl, isStreaming, ttsPlaying]);
  
  const bubbleStyle = useMemo(() => [
    styles.bubble,
    isUser ? [styles.userBubble, { backgroundColor: theme.primary }] : [styles.assistantBubble, { backgroundColor: theme.aiBubble }],
    isError && styles.errorBubble,
  ], [isUser, isError, theme]);
  
  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={[styles.container, isUser && styles.userContainer]}
    >
      <View style={bubbleStyle}>
        {/* Role label for assistant */}
        {!isUser && (
          <Text style={[styles.roleLabel, { color: theme.primary }]}>
            🦎 Cami
          </Text>
        )}
        
        {/* Images */}
        {images.map((uri, i) => (
          <Image
            key={`img-${i}`}
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
          />
        ))}
        
        {/* Thinking content (collapsible) */}
        {thinkingContent && (
          <View style={[styles.thinkingContainer, { backgroundColor: isDark ? '#2d2d2d' : '#f5f5f5' }]}>
            <Text style={[styles.thinkingLabel, { color: theme.textMuted }]}>💭 Thinking...</Text>
            <Text style={[styles.thinkingText, { color: theme.textSecondary }]} numberOfLines={3}>
              {thinkingContent}
            </Text>
          </View>
        )}
        
        {/* Text content with markdown */}
        {textContent ? (
          isUser ? (
            <SimpleTextRenderer content={textContent} isUserMessage />
          ) : (
            <MarkdownRenderer content={textContent} />
          )
        ) : null}
        
        {/* Streaming indicator */}
        {isStreaming && !textContent && <TypingDots />}
        
        {/* Error message */}
        {isError && message.errorMessage && (
          <Text style={styles.errorMessage}>{message.errorMessage}</Text>
        )}
        
        {/* Footer: Timestamp and TTS button */}
        <View style={styles.footer}>
          {/* TTS button for assistant messages */}
          {!isUser && textContent && gatewayUrl && !isStreaming && (
            <TouchableOpacity
              style={[styles.ttsButton, { backgroundColor: theme.surfaceVariant }]}
              onPress={handleTTS}
              disabled={ttsLoading}
            >
              {ttsLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.ttsIcon}>{ttsPlaying ? '⏹️' : '🔊'}</Text>
              )}
            </TouchableOpacity>
          )}
          
          {/* Timestamp */}
          {showTimestamp && formattedTime && (
            <Text style={[
              styles.timestamp, 
              { color: isUser ? 'rgba(255,255,255,0.6)' : theme.textMuted }
            ]}>
              {formattedTime}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  thinkingContainer: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  thinkingLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  thinkingText: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorMessage: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ttsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ttsIcon: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 10,
    textAlign: 'right',
    flex: 1,
  },
});
