/**
 * Message Bubble Component - Redesigned
 * 
 * Premium message bubbles with:
 * - Smooth fade-in + slide-up animations
 * - Proper 16px rounded corners with subtle shadows
 * - User messages: accent color, right-aligned
 * - AI messages: dark surface, left-aligned, wider max-width
 * - Timestamps: small, muted, below bubble
 * - TTS playback with animated button
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Alert, Share, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MarkdownRenderer, SimpleTextRenderer } from './MarkdownRenderer';
import { TypingDots } from './TypingIndicator';
import { useSettings } from '../stores/settings';
import { speakText, stopSpeaking } from '../services/tts';
import { spacing, radius, shadows } from '../theme/colors';
import type { UIMessage } from '../types';

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
  showTimestamp?: boolean;
  gatewayUrl?: string;
  onReply?: (text: string) => void;
  isNew?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function MessageBubble({ 
  message, 
  isStreaming, 
  showTimestamp = true, 
  gatewayUrl, 
  onReply,
  isNew = false,
}: MessageBubbleProps) {
  const { theme, textStyle, isDark } = useSettings();
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  
  const isUser = message.role === 'user';
  const isError = message.isError;
  
  // Animation values
  const scale = useSharedValue(1);
  const ttsButtonScale = useSharedValue(1);
  
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
    } catch (error) {
      console.warn('Failed to copy:', error);
    }
  }, [textContent]);
  
  // Share message
  const handleShare = useCallback(async () => {
    if (!textContent) return;
    
    try {
      await Share.share({ message: textContent });
    } catch (error) {
      console.warn('Failed to share:', error);
    }
  }, [textContent]);
  
  // TTS playback
  const handleTTS = useCallback(async () => {
    if (!textContent || !gatewayUrl) return;
    
    // Animate button press
    ttsButtonScale.value = withSpring(0.9, { damping: 15 });
    setTimeout(() => {
      ttsButtonScale.value = withSpring(1, { damping: 15 });
    }, 100);
    
    if (ttsPlaying) {
      setTtsPlaying(false);
      await stopSpeaking();
      return;
    }
    
    setTtsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await speakText(textContent, gatewayUrl);
      setTtsPlaying(true);
      setTimeout(() => setTtsPlaying(false), 60000);
    } catch (error) {
      console.warn('TTS failed:', error);
      Alert.alert('TTS Unavailable', 'Text-to-speech is not available.');
    } finally {
      setTtsLoading(false);
    }
  }, [textContent, gatewayUrl, ttsPlaying, ttsButtonScale]);
  
  // Handle reply
  const handleReply = useCallback(async () => {
    if (!textContent || !onReply) return;
    const quote = `> ${textContent.slice(0, 100)}${textContent.length > 100 ? '...' : ''}\n\n`;
    onReply(quote);
  }, [textContent, onReply]);
  
  // Long press handler
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.98, { damping: 15 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15 });
    }, 100);
    
    const options = [
      { text: 'Copy', onPress: handleCopy },
      { text: 'Share', onPress: handleShare },
    ];
    
    if (onReply) {
      options.unshift({ text: 'Reply', onPress: handleReply });
    }
    
    if (!isUser && textContent && gatewayUrl && !isStreaming) {
      options.push({ text: ttsPlaying ? 'Stop Audio' : 'Read Aloud', onPress: handleTTS });
    }
    
    options.push({ text: 'Cancel', style: 'cancel' } as any);
    
    Alert.alert('Message', undefined, options, { cancelable: true });
  }, [handleCopy, handleShare, handleReply, handleTTS, onReply, isUser, textContent, gatewayUrl, isStreaming, ttsPlaying, scale]);
  
  // Press in/out animations
  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: 100 });
  }, [scale]);
  
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20 });
  }, [scale]);
  
  // Animated styles
  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const ttsButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ttsButtonScale.value }],
  }));
  
  const bubbleStyle = useMemo(() => [
    styles.bubble,
    isUser 
      ? [styles.userBubble, { backgroundColor: theme.userBubble }]
      : [styles.assistantBubble, { backgroundColor: theme.aiBubble }],
    isError && [styles.errorBubble, { borderColor: theme.error }],
    shadows.bubble,
  ], [isUser, isError, theme]);
  
  return (
    <AnimatedPressable
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={400}
      style={[styles.container, isUser && styles.userContainer]}
      entering={FadeIn.duration(200).delay(50)}
    >
      <Animated.View style={[bubbleStyle, bubbleAnimatedStyle]}>
        {/* Role label for assistant */}
        {!isUser && (
          <View style={styles.roleContainer}>
            <Text style={[styles.roleLabel, { color: theme.primary }]}>
              🦎 Cami
            </Text>
          </View>
        )}
        
        {/* Images */}
        {images.map((uri, i) => (
          <View key={`img-${i}`} style={styles.imageContainer}>
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ))}
        
        {/* Thinking content */}
        {thinkingContent && (
          <View style={[styles.thinkingContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.thinkingLabel, { color: theme.textMuted }]}>💭 Thinking...</Text>
            <Text style={[styles.thinkingText, { color: theme.textSecondary }]} numberOfLines={3}>
              {thinkingContent}
            </Text>
          </View>
        )}
        
        {/* Text content */}
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
          <Text style={[styles.errorMessage, { color: theme.error }]}>
            {message.errorMessage}
          </Text>
        )}
        
        {/* Footer */}
        <View style={styles.footer}>
          {/* TTS button for assistant messages */}
          {!isUser && textContent && gatewayUrl && !isStreaming && (
            <AnimatedTouchable
              style={[
                styles.ttsButton, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                ttsButtonAnimatedStyle,
              ]}
              onPress={handleTTS}
              disabled={ttsLoading}
              activeOpacity={0.7}
            >
              {ttsLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.ttsIcon}>{ttsPlaying ? '⏹️' : '🔊'}</Text>
              )}
            </AnimatedTouchable>
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
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  userBubble: {
    borderBottomRightRadius: spacing.xs,
  },
  assistantBubble: {
    borderBottomLeftRadius: spacing.xs,
  },
  errorBubble: {
    borderWidth: 1,
  },
  roleContainer: {
    marginBottom: spacing.xs,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  imageContainer: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: 220,
    height: 165,
    borderRadius: radius.md,
  },
  thinkingContainer: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  thinkingLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  thinkingText: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorMessage: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    minHeight: 20,
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
    letterSpacing: 0.2,
  },
});
