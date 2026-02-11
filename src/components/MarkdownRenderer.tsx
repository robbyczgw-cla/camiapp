/**
 * Markdown renderer component using react-native-marked
 * 
 * Renders markdown content with proper styling for code blocks,
 * links, lists, and other markdown elements.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Linking, useWindowDimensions } from 'react-native';
import Markdown from 'react-native-marked';
import { useSettings } from '../stores/settings';

interface MarkdownRendererProps {
  content: string;
  isUserMessage?: boolean;
}

export function MarkdownRenderer({ content, isUserMessage = false }: MarkdownRendererProps) {
  const { theme, textStyle, isDark } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  
  // Custom styles based on theme and text size
  const styles = useMemo(() => ({
    // Text elements
    text: {
      color: isUserMessage ? '#fff' : theme.text,
      fontSize: textStyle.fontSize,
      lineHeight: textStyle.lineHeight,
    },
    paragraph: {
      marginVertical: 4,
    },
    strong: {
      fontWeight: '600' as const,
      color: isUserMessage ? '#fff' : theme.text,
    },
    em: {
      fontStyle: 'italic' as const,
      color: isUserMessage ? '#fff' : theme.text,
    },
    
    // Code - using compatible styles
    code: {
      fontSize: textStyle.fontSize - 2,
      backgroundColor: isUserMessage 
        ? 'rgba(255,255,255,0.15)' 
        : isDark ? '#1e1e1e' : '#f5f5f5',
      color: isUserMessage ? '#fff' : isDark ? '#d4d4d4' : '#333',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    codespan: {
      fontSize: textStyle.fontSize - 1,
      backgroundColor: isUserMessage 
        ? 'rgba(255,255,255,0.15)' 
        : isDark ? '#2d2d2d' : '#f0f0f0',
      color: isUserMessage ? '#fff' : isDark ? '#ce9178' : '#c7254e',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
    },
    codeBlock: {
      backgroundColor: isDark ? '#1e1e1e' : '#f6f8fa',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    
    // Lists
    list: {
      marginVertical: 4,
    },
    listItem: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      marginVertical: 2,
    },
    listItemBullet: {
      color: isUserMessage ? '#fff' : theme.primary,
      marginRight: 8,
      fontSize: textStyle.fontSize,
    },
    listItemNumber: {
      color: isUserMessage ? '#fff' : theme.primary,
      marginRight: 8,
      fontSize: textStyle.fontSize,
      fontWeight: '500' as const,
    },
    listItemContent: {
      flex: 1,
    },
    
    // Headers
    h1: {
      fontSize: textStyle.fontSize + 6,
      fontWeight: '700' as const,
      color: isUserMessage ? '#fff' : theme.text,
      marginVertical: 8,
    },
    h2: {
      fontSize: textStyle.fontSize + 4,
      fontWeight: '600' as const,
      color: isUserMessage ? '#fff' : theme.text,
      marginVertical: 6,
    },
    h3: {
      fontSize: textStyle.fontSize + 2,
      fontWeight: '600' as const,
      color: isUserMessage ? '#fff' : theme.text,
      marginVertical: 4,
    },
    h4: {
      fontSize: textStyle.fontSize,
      fontWeight: '600' as const,
      color: isUserMessage ? '#fff' : theme.text,
      marginVertical: 4,
    },
    
    // Links
    link: {
      color: isUserMessage ? '#b8e5ff' : theme.primary,
      textDecorationLine: 'underline' as const,
    },
    
    // Blockquote
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: isUserMessage ? 'rgba(255,255,255,0.5)' : theme.primary,
      paddingLeft: 12,
      marginVertical: 8,
      opacity: 0.9,
    },
    
    // Horizontal rule
    hr: {
      backgroundColor: isUserMessage ? 'rgba(255,255,255,0.3)' : theme.border,
      height: 1,
      marginVertical: 12,
    },
    
    // Table
    table: {
      borderWidth: 1,
      borderColor: theme.border,
      marginVertical: 8,
      borderRadius: 4,
      overflow: 'hidden' as const,
    },
    tableRow: {
      flexDirection: 'row' as const,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tableCell: {
      padding: 8,
      flex: 1,
    },
    tableHeader: {
      backgroundColor: isDark ? '#2d2d2d' : '#f5f5f5',
      fontWeight: '600' as const,
    },
    
    // Image
    image: {
      maxWidth: screenWidth - 80,
      borderRadius: 8,
    },
  }), [theme, textStyle, isUserMessage, isDark, screenWidth]);
  
  // Clean up content (remove trailing whitespace issues)
  const cleanContent = useMemo(() => {
    return content.trim();
  }, [content]);
  
  if (!cleanContent) {
    return null;
  }
  
  return (
    <Markdown 
      value={cleanContent} 
      flatListProps={undefined}
      styles={styles as any}
    />
  );
}

// Simple text renderer fallback (for user messages or when markdown is overkill)
export function SimpleTextRenderer({ content, isUserMessage = false }: MarkdownRendererProps) {
  const { theme, textStyle } = useSettings();
  
  return (
    <Text 
      style={{
        color: isUserMessage ? '#fff' : theme.text,
        fontSize: textStyle.fontSize,
        lineHeight: textStyle.lineHeight,
      }}
    >
      {content}
    </Text>
  );
}
