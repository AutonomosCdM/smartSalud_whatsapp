'use client';

import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ConversationBarProps {
  className?: string;
  waveformClassName?: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

export function ConversationBar({ className = '', waveformClassName = '' }: ConversationBarProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  // Validate agent ID on mount
  useEffect(() => {
    if (!agentId) {
      setStatus('error');
      setErrorMessage('ELEVENLABS_AGENT_ID not configured');
      if (process.env.NODE_ENV === 'development') {
        console.error('[ConversationBar] Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
      }
    }
  }, [agentId]);

  const handleConnect = useCallback(() => {
    setStatus('connected');
    setErrorMessage(null);
    if (process.env.NODE_ENV === 'development') {
      console.log('[ConversationBar] Connected to agent:', agentId);
    }
  }, [agentId]);

  const handleDisconnect = useCallback(() => {
    setStatus('disconnected');
    setIsMuted(false);
    if (process.env.NODE_ENV === 'development') {
      console.log('[ConversationBar] Disconnected');
    }
  }, []);

  const handleMessage = useCallback((message: { source: 'user' | 'ai'; message: string }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ConversationBar] Message:', message);
    }
  }, []);

  const handleError = useCallback((message: string) => {
    setStatus('error');
    setErrorMessage(message);
    if (process.env.NODE_ENV === 'development') {
      console.error('[ConversationBar] Error:', message);
    }
  }, []);

  const conversation = useConversation({
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
    onError: handleError,
  });

  // Cleanup effect: End session on unmount if connected
  useEffect(() => {
    return () => {
      if (status === 'connected') {
        conversation.endSession();
      }
    };
  }, [status, conversation]);

  const toggleConnection = useCallback(async () => {
    if (!agentId) {
      setStatus('error');
      setErrorMessage('Agent ID not configured');
      return;
    }

    try {
      if (status === 'disconnected' || status === 'error') {
        setStatus('connecting');
        await conversation.startSession({ agentId, connectionType: 'websocket' as const });
      } else if (status === 'connected') {
        setStatus('disconnecting');
        await conversation.endSession();
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
      if (process.env.NODE_ENV === 'development') {
        console.error('[ConversationBar] Toggle error:', error);
      }
    }
  }, [status, conversation, agentId]);

  const toggleMute = useCallback(() => {
    if (status !== 'connected') return;

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (conversation.setVolume) {
      conversation.setVolume({ volume: newMutedState ? 0 : 1 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[ConversationBar] Mute:', newMutedState);
    }
  }, [status, isMuted, conversation]);

  // Status indicator colors
  const statusColors: Record<ConnectionStatus, string> = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-blue-500',
    connected: 'bg-green-500',
    disconnecting: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  // Button states
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isDisconnecting = status === 'disconnecting';
  const isDisabled = isConnecting || isDisconnecting || !agentId;

  return (
    <div
      className={`flex flex-col items-center gap-4 p-6 rounded-lg border border-gray-700 bg-gray-800 ${className}`}
      role="region"
      aria-label="Voice conversation interface"
    >
      {/* Status Indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${statusColors[status]} ${
            isConnected ? 'animate-pulse' : ''
          }`}
          role="status"
          aria-label={`Connection status: ${status}`}
        />
        <span className="text-sm font-medium text-gray-300 capitalize">
          {status}
        </span>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full p-3 rounded bg-red-900/20 border border-red-700 text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Waveform Visualization */}
      {isConnected && (
        <div
          className={`w-full h-24 rounded bg-gray-900 flex items-center justify-center ${waveformClassName}`}
          role="img"
          aria-label="Audio waveform visualization"
        >
          <div className="flex items-center gap-1 h-full">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.8 + Math.random() * 0.4}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3">
        {/* Main Connection Button */}
        <button
          onClick={toggleConnection}
          disabled={isDisabled}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200
            flex items-center gap-2
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              isConnected
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
            }
          `}
          aria-label={isConnected ? 'End conversation' : 'Start conversation'}
        >
          {isConnecting || isDisconnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isConnecting ? 'Connecting...' : 'Disconnecting...'}
            </>
          ) : isConnected ? (
            <>
              <MicOff className="w-5 h-5" />
              End Call
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Call
            </>
          )}
        </button>

        {/* Mute Toggle (only when connected) */}
        {isConnected && (
          <button
            onClick={toggleMute}
            className={`
              px-4 py-3 rounded-lg font-medium transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
              ${
                isMuted
                  ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }
              text-white
            `}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={isMuted}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Usage Info (when disconnected) */}
      {status === 'disconnected' && !errorMessage && (
        <p className="text-xs text-gray-400 text-center max-w-md">
          Click &quot;Start Call&quot; to begin voice conversation with the AI assistant
        </p>
      )}
    </div>
  );
}
