/**
 * Main chat hook for CamiApp
 * Manages gateway connection, chat engine, and message state
 * 
 * FIXED: Race condition where engine was created in both .then() and the session effect
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GatewayClient, ChatEngine, type UIMessage, type PendingAttachment as SDKPendingAttachment } from 'expo-openclaw-chat';
import type { SessionMeta, PickedAttachment } from '../types';
import { StorageHelpers } from '../stores/storage';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface UseChatOptions {
  gatewayUrl: string;
  authToken: string;
  sessionKey?: string;
}

interface UseChatReturn {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  isStreaming: boolean;
  error: Error | null;
  
  // Messages
  messages: UIMessage[];
  
  // Actions
  send: (text: string, attachments?: PickedAttachment[]) => Promise<void>;
  abort: () => Promise<void>;
  clear: () => void;
  reconnect: () => Promise<void>;
  
  // Session management
  sessions: SessionMeta[];
  currentSessionKey: string;
  switchSession: (sessionKey: string) => void;
  refreshSessions: () => Promise<void>;
  
  // Client access (for advanced use)
  client: GatewayClient | null;
}

export function useChat({ gatewayUrl, authToken, sessionKey = 'main' }: UseChatOptions): UseChatReturn {
  // Refs for stable references
  const clientRef = useRef<GatewayClient | null>(null);
  const engineRef = useRef<ChatEngine | null>(null);
  const unsubChatRef = useRef<(() => void) | null>(null);
  
  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [currentSessionKey, setCurrentSessionKey] = useState(sessionKey);
  
  // Fetch sessions from gateway
  const fetchSessions = useCallback(async (client?: GatewayClient) => {
    const c = client || clientRef.current;
    if (!c || !c.isConnected) return;
    
    try {
      const response = await c.sessionsList({ limit: 100, includeGlobal: true });
      const sessionList: SessionMeta[] = (response.sessions || []).map((s: any) => ({
        key: s.key,
        friendlyId: s.friendlyId || s.key,
        label: s.label,
        title: s.title,
        derivedTitle: s.derivedTitle,
        kind: s.kind,
        agent: s.agent,
        channelId: s.channelId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messageCount,
      }));
      
      // Cache sessions
      StorageHelpers.setSessionsCache(sessionList);
      setSessions(sessionList);
    } catch (err) {
      console.warn('[useChat] Failed to fetch sessions:', err);
      // Try to load from cache
      const cached = StorageHelpers.getSessionsCache() as SessionMeta[] | null;
      if (cached) {
        setSessions(cached);
      }
    }
  }, []);

  // Helper to create and set up engine
  const createEngine = useCallback((client: GatewayClient, sessKey: string) => {
    console.log('[useChat] Creating engine for session:', sessKey);
    
    // Clean up existing engine
    if (unsubChatRef.current) {
      unsubChatRef.current();
      unsubChatRef.current = null;
    }
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    
    const engine = new ChatEngine(client, sessKey);
    engineRef.current = engine;
    
    // Reset state for new engine
    setMessages([]);
    setIsStreaming(false);
    
    // Subscribe to engine updates
    const unsubUpdate = engine.on('update', () => {
      console.log('[useChat] Engine update:', {
        messageCount: engine.messages.length,
        isStreaming: engine.isStreaming,
        lastMsg: engine.messages[engine.messages.length - 1]?.content,
      });
      // Create new array to ensure React detects the change
      setMessages([...engine.messages]);
      setIsStreaming(engine.isStreaming);
    });
    
    const unsubError = engine.on('error', (err) => {
      console.error('[useChat] Engine error:', err);
      setError(err);
    });
    
    // Combined cleanup
    unsubChatRef.current = () => {
      unsubUpdate();
      unsubError();
    };
    
    return engine;
  }, []);
  
  // Initialize client and connect
  useEffect(() => {
    if (!gatewayUrl) return;
    
    console.log('[useChat] Initializing connection to:', gatewayUrl);
    
    // Clean up previous
    if (unsubChatRef.current) {
      unsubChatRef.current();
      unsubChatRef.current = null;
    }
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    
    // Create new client
    const client = new GatewayClient(gatewayUrl, {
      token: authToken || undefined,
      autoReconnect: true,
      displayName: 'CamiApp 🦎',
      appVersion: '1.0.0',
      platform: 'react-native',
    });
    
    clientRef.current = client;
    
    // Subscribe to connection state changes
    const unsubState = client.onConnectionStateChange((state) => {
      console.log('[useChat] Connection state:', state);
      setConnectionState(state);
      
      if (state === 'connected') {
        setError(null);
        // Create engine when connected (if not already created)
        if (!engineRef.current && clientRef.current) {
          createEngine(clientRef.current, currentSessionKey);
        }
        // Fetch sessions on connect
        fetchSessions(client);
      } else if (state === 'disconnected') {
        // Engine is invalid when disconnected
        if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
        }
      }
    });
    
    // Connect
    setConnectionState('connecting');
    client.connect()
      .then(() => {
        console.log('[useChat] Connected successfully');
        // Engine creation is handled by onConnectionStateChange callback
      })
      .catch((err) => {
        console.error('[useChat] Connection failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setConnectionState('disconnected');
      });
    
    return () => {
      console.log('[useChat] Cleaning up');
      unsubState();
      if (unsubChatRef.current) {
        unsubChatRef.current();
        unsubChatRef.current = null;
      }
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [gatewayUrl, authToken, createEngine, fetchSessions]); // Note: currentSessionKey NOT in deps
  
  // Handle session changes (only when session changes, not on initial connect)
  useEffect(() => {
    const client = clientRef.current;
    if (!client || connectionState !== 'connected') return;
    
    // Only recreate engine if session actually changed (not on initial mount)
    const currentEngine = engineRef.current;
    if (currentEngine) {
      // Check if we need a new engine (session key changed)
      // The engine stores sessionKey internally, we need to compare
      // Since we can't access it directly, we track it separately
      console.log('[useChat] Session changed to:', currentSessionKey);
      createEngine(client, currentSessionKey);
    }
    
    // Save last session
    StorageHelpers.setLastSessionKey(currentSessionKey);
  }, [currentSessionKey]); // Only run when session changes
  
  // Send message
  const send = useCallback(async (text: string, attachmentsInput?: PickedAttachment[]) => {
    const engine = engineRef.current;
    if (!engine) {
      throw new Error('Not connected');
    }
    
    console.log('[useChat] Sending message:', { text: text.substring(0, 50), hasAttachments: !!attachmentsInput?.length });
    
    // Convert attachments to SDK format (image/file)
    // Note: SDK supports 'image' | 'file' - audio files are sent as 'file'
    const attachments: SDKPendingAttachment[] | undefined = attachmentsInput?.map((att, i) => {
      const mimeType = att.mimeType || 'image/jpeg';
      const isImage = mimeType.startsWith('image/');
      const type: 'image' | 'file' = isImage ? 'image' : 'file';
      const ext = mimeType.startsWith('audio/') ? 'm4a' : (isImage ? 'jpg' : 'bin');
      return {
        id: `att-${Date.now()}-${i}`,
        fileName: att.fileName || `attachment-${i}.${ext}`,
        mimeType,
        content: att.base64 || '',
        type,
      };
    }).filter(a => a.content);
    
    await engine.send(text, attachments);
    
    // Refresh sessions after sending (to update the list with new session)
    setTimeout(() => fetchSessions(), 1000);
  }, [fetchSessions]);
  
  // Abort current generation
  const abort = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    console.log('[useChat] Aborting');
    await engine.abort();
  }, []);
  
  // Clear messages
  const clear = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    console.log('[useChat] Clearing messages');
    engine.clear();
    setMessages([]);
  }, []);
  
  // Reconnect
  const reconnect = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    
    console.log('[useChat] Reconnecting');
    client.disconnect();
    setConnectionState('connecting');
    
    try {
      await client.connect();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setConnectionState('disconnected');
    }
  }, []);
  
  // Switch session
  const switchSession = useCallback((newSessionKey: string) => {
    console.log('[useChat] Switching session to:', newSessionKey);
    setCurrentSessionKey(newSessionKey);
  }, []);
  
  // Refresh sessions
  const refreshSessions = useCallback(async () => {
    await fetchSessions();
  }, [fetchSessions]);
  
  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isStreaming,
    error,
    messages,
    send,
    abort,
    clear,
    reconnect,
    sessions,
    currentSessionKey,
    switchSession,
    refreshSessions,
    client: clientRef.current,
  };
}
