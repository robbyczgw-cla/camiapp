/**
 * Conversation export utilities
 * 
 * Supports exporting conversations as:
 * - Markdown (.md)
 * - JSON (.json)
 * - Plain text (.txt)
 */

import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { UIMessage, ExportFormat } from '../types';

// Extract text from message content
function extractTextFromContent(content: UIMessage['content']): string {
  return content
    .map((block) => {
      if (block.type === 'text') {
        return (block as { type: 'text'; text: string }).text;
      }
      if (block.type === 'thinking') {
        return `[Thinking: ${(block as { type: 'thinking'; thinking: string }).thinking}]`;
      }
      if (block.type === 'image') {
        return '[Image]';
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

// Format timestamp
function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Export as Markdown
function exportAsMarkdown(messages: UIMessage[], sessionTitle: string): string {
  const lines: string[] = [
    `# ${sessionTitle}`,
    '',
    `_Exported from CamiApp on ${new Date().toLocaleString()}_`,
    '',
    '---',
    '',
  ];
  
  for (const message of messages) {
    const role = message.role === 'assistant' ? '🦎 **Cami**' : '**You**';
    const text = extractTextFromContent(message.content);
    const time = message.timestamp ? ` _(${formatTimestamp(message.timestamp)})_` : '';
    
    lines.push(`### ${role}${time}`);
    lines.push('');
    lines.push(text);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  
  return lines.join('\n');
}

// Export as JSON
function exportAsJson(messages: UIMessage[], sessionTitle: string): string {
  const exportData = {
    title: sessionTitle,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: extractTextFromContent(m.content),
      timestamp: m.timestamp,
      isError: m.isError,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Export as plain text
function exportAsText(messages: UIMessage[], sessionTitle: string): string {
  const lines: string[] = [
    sessionTitle,
    '='.repeat(sessionTitle.length),
    '',
    `Exported from CamiApp on ${new Date().toLocaleString()}`,
    '',
    '-'.repeat(40),
    '',
  ];
  
  for (const message of messages) {
    const role = message.role === 'assistant' ? 'Cami' : 'You';
    const text = extractTextFromContent(message.content);
    const time = message.timestamp ? ` (${formatTimestamp(message.timestamp)})` : '';
    
    lines.push(`[${role}${time}]`);
    lines.push(text);
    lines.push('');
    lines.push('-'.repeat(40));
    lines.push('');
  }
  
  return lines.join('\n');
}

// Main export function
export async function exportConversation(
  messages: UIMessage[],
  sessionTitle: string,
  format: ExportFormat = 'markdown',
): Promise<void> {
  if (messages.length === 0) {
    throw new Error('No messages to export');
  }
  
  // Check if sharing is available
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  
  // Generate content based on format
  let content: string;
  let extension: string;
  let mimeType: string;
  
  switch (format) {
    case 'markdown':
      content = exportAsMarkdown(messages, sessionTitle);
      extension = 'md';
      mimeType = 'text/markdown';
      break;
    case 'json':
      content = exportAsJson(messages, sessionTitle);
      extension = 'json';
      mimeType = 'application/json';
      break;
    case 'text':
      content = exportAsText(messages, sessionTitle);
      extension = 'txt';
      mimeType = 'text/plain';
      break;
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
  
  // Create filename
  const sanitizedTitle = sessionTitle
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${sanitizedTitle}_${timestamp}.${extension}`;
  
  // Write to temporary file using new SDK 54 API
  const file = new File(Paths.cache, filename);
  file.write(content);
  
  // Share the file
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: `Export conversation as ${format.toUpperCase()}`,
  });
  
  // Clean up temp file (sync in SDK 54, wrapped in try-catch)
  try {
    file.delete();
  } catch {
    // Ignore cleanup errors
  }
}
