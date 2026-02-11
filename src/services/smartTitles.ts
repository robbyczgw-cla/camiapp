/**
 * Smart Titles Service
 * 
 * Generates LLM-powered titles for chat sessions
 * after 2+ messages in a conversation
 */

import type { UIMessage } from '../types';
import { StorageHelpers } from '../stores/storage';

// Cache of sessions that have already been titled (in-memory)
const titledSessions = new Set<string>();

// Extract text from message content
function extractText(content: UIMessage['content']): string {
  return content
    .map(block => {
      if (block.type === 'text') {
        return (block as { type: 'text'; text: string }).text;
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Check if a session needs a title generated
 */
export function needsTitle(
  sessionKey: string,
  messages: UIMessage[],
  existingTitle?: string,
): boolean {
  // Don't regenerate if already titled in this session
  if (titledSessions.has(sessionKey)) return false;
  
  // Check persistent cache
  const cachedTitle = StorageHelpers.getSmartTitle(sessionKey);
  if (cachedTitle) {
    titledSessions.add(sessionKey);
    return false;
  }
  
  // Don't generate if title already exists (and isn't the session key or "New Chat")
  if (existingTitle && 
      existingTitle !== sessionKey && 
      !existingTitle.startsWith('chat-') &&
      existingTitle !== 'New Chat') {
    return false;
  }
  
  // Need at least 2 messages (1 user + 1 assistant)
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => 
    m.role === 'assistant' && extractText(m.content).length > 10
  );
  
  return userMessages.length >= 1 && assistantMessages.length >= 1;
}

/**
 * Generate a title for a session using a simple heuristic
 * (Can be extended to use LLM via gateway)
 */
export function generateFallbackTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'New Chat';
  
  const text = extractText(firstUserMessage.content);
  if (!text) return 'New Chat';
  
  // Clean up the text
  let title = text
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Take first 40 characters, cut at last word
  if (title.length > 40) {
    title = title.slice(0, 40);
    const lastSpace = title.lastIndexOf(' ');
    if (lastSpace > 20) {
      title = title.slice(0, lastSpace);
    }
    title += '...';
  }
  
  return title || 'New Chat';
}

/**
 * Generate and cache a title for a session
 */
export async function generateAndCacheTitle(
  sessionKey: string,
  messages: UIMessage[],
): Promise<string> {
  // Check cache first
  const cached = StorageHelpers.getSmartTitle(sessionKey);
  if (cached) {
    titledSessions.add(sessionKey);
    return cached;
  }
  
  // Generate title
  const title = generateFallbackTitle(messages);
  
  // Cache it
  StorageHelpers.setSmartTitle(sessionKey, title);
  titledSessions.add(sessionKey);
  
  return title;
}

/**
 * Get cached title for a session (or null if not cached)
 */
export function getCachedTitle(sessionKey: string): string | null {
  return StorageHelpers.getSmartTitle(sessionKey);
}

/**
 * Mark a session as having a title (to avoid regeneration)
 */
export function markAsTitled(sessionKey: string): void {
  titledSessions.add(sessionKey);
}

/**
 * Clear the titled cache (for testing)
 */
export function clearTitledCache(): void {
  titledSessions.clear();
}

/**
 * Hook to use smart titles in components
 */
export function useSmartTitle(
  sessionKey: string,
  messages: UIMessage[],
  existingTitle?: string,
): string | null {
  // Check if we should generate a title
  if (!needsTitle(sessionKey, messages, existingTitle)) {
    return getCachedTitle(sessionKey);
  }
  
  // Generate title in background
  generateAndCacheTitle(sessionKey, messages).catch(() => {});
  
  // Return cached or null
  return getCachedTitle(sessionKey);
}
