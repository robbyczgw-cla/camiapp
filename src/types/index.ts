/**
 * Common types for CamiApp
 */

import type { UIMessage, PendingAttachment } from 'expo-openclaw-chat';

// Re-export SDK types
export type { UIMessage, PendingAttachment };

// Session metadata from gateway
export interface SessionMeta {
  key: string;
  friendlyId: string;
  label?: string;
  title?: string;
  derivedTitle?: string;
  kind?: string;
  agent?: string;
  channelId?: string;
  createdAt?: number;
  updatedAt?: number;
  messageCount?: number;
  isPinned?: boolean;
}

// Search result
export interface SearchResult {
  sessionKey: string;
  friendlyId: string;
  sessionTitle: string;
  messageIndex: number;
  messageRole: string;
  messageText: string;
  matchStart: number;
  matchEnd: number;
  timestamp?: number;
}

// Chat message content types from gateway
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    data?: string;
    url?: string;
    media_type?: string;
  };
}

export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
}

export type MessageContent = TextContent | ImageContent | ThinkingContent;

// Extended message type for display
export interface DisplayMessage extends Omit<UIMessage, 'content'> {
  content: MessageContent[];
  displayTimestamp?: string;
  isCollapsed?: boolean;
}

// Export conversation format
export type ExportFormat = 'markdown' | 'json' | 'text';

// Image picker result
export interface PickedImage {
  uri: string;
  base64?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileName?: string;
}
