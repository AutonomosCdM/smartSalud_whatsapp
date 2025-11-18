import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock @elevenlabs/react
const mockStartSession = jest.fn();
const mockEndSession = jest.fn();
const mockSetVolume = jest.fn();
const mockUseConversation = jest.fn(() => ({
  startSession: mockStartSession,
  endSession: mockEndSession,
  setVolume: mockSetVolume,
}));

jest.mock('@elevenlabs/react', () => ({
  useConversation: jest.fn((...args: unknown[]) => mockUseConversation(...args)),
}));

// Import after mock
import { ConversationBar } from '@/components/ui/conversation-bar';

describe('ConversationBar', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error> | undefined;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log> | undefined;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset all mocks
    jest.clearAllMocks();
    mockStartSession.mockReset();
    mockEndSession.mockReset();
    mockSetVolume.mockReset();
    mockUseConversation.mockReset();

    // Reset useConversation mock to default behavior
    mockUseConversation.mockReturnValue({
      startSession: mockStartSession,
      endSession: mockEndSession,
      setVolume: mockSetVolume,
    });

    // Setup default agent ID
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = 'test-agent-id-123';
    process.env.NODE_ENV = 'test';

    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('renders without errors', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const container = screen.getByRole('region', { name: /voice conversation interface/i });
      expect(container).toBeInTheDocument();
    });

    it('shows disconnected status initially', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const statusText = screen.getByText('disconnected');
      expect(statusText).toBeInTheDocument();
      expect(statusText).toHaveClass('text-gray-300', 'capitalize');
    });

    it('initializes useConversation hook with correct callbacks', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      expect(mockUseConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          onConnect: expect.any(Function),
          onDisconnect: expect.any(Function),
          onMessage: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('shows "Start Call" button when disconnected', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const startButton = screen.getByRole('button', { name: /start conversation/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveTextContent('Start Call');
    });

    it('shows usage info when disconnected', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const usageInfo = screen.getByText(/click "start call" to begin voice conversation/i);
      expect(usageInfo).toBeInTheDocument();
      expect(usageInfo).toHaveClass('text-xs', 'text-gray-400');
    });
  });

  describe('Agent ID Validation', () => {
    it('shows error if NEXT_PUBLIC_ELEVENLABS_AGENT_ID is missing', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

      // Act
      render(<ConversationBar />);

      // Assert
      const errorMessage = screen.getByText('ELEVENLABS_AGENT_ID not configured');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-red-300');
    });

    it('sets status to error when agent ID is missing', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

      // Act
      render(<ConversationBar />);

      // Assert
      const statusText = screen.getByText('error');
      expect(statusText).toBeInTheDocument();

      const statusIndicator = screen.getByRole('status');
      expect(statusIndicator).toHaveClass('bg-red-500');
    });

    it('button is disabled when agent ID is missing', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

      // Act
      render(<ConversationBar />);

      // Assert
      const button = screen.getByRole('button', { name: /start conversation/i });
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('logs error in development mode when agent ID missing', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      process.env.NODE_ENV = 'development';

      // Act
      render(<ConversationBar />);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ConversationBar] Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID'
      );
    });

    it('does not show usage info when error is present', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

      // Act
      render(<ConversationBar />);

      // Assert
      const usageInfo = screen.queryByText(/click "start call" to begin voice conversation/i);
      expect(usageInfo).not.toBeInTheDocument();
    });
  });

  describe('Connection States', () => {
    it('transitions from disconnected to connecting when button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      mockStartSession.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('connecting')).toBeInTheDocument();
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
    });

    it('transitions from connecting to connected when session starts successfully', async () => {
      // Arrange
      const user = userEvent.setup();
      mockStartSession.mockResolvedValue(undefined);

      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act - Click start
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Wait for connecting state
      await waitFor(() => {
        expect(screen.getByText('connecting')).toBeInTheDocument();
      });

      // Simulate successful connection by calling onConnect
      await act(async () => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert - Should be connected now
      await waitFor(() => {
        expect(screen.getByText('connected')).toBeInTheDocument();
      });
    });

    it('shows error state with red indicator', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

      // Act
      render(<ConversationBar />);

      // Assert
      const statusIndicator = screen.getByRole('status');
      expect(statusIndicator).toHaveClass('bg-red-500');
      expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('status indicator pulses when connected', async () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act - Trigger connection by calling onConnect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      await waitFor(() => {
        const statusIndicator = screen.getByRole('status');
        expect(statusIndicator).toHaveClass('animate-pulse');
        expect(statusIndicator).toHaveClass('bg-green-500');
      });
    });
  });

  describe('Button Interactions', () => {
    it('calls conversation.startSession with correct parameters', async () => {
      // Arrange
      const user = userEvent.setup();
      mockStartSession.mockResolvedValue(undefined);
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(mockStartSession).toHaveBeenCalledWith({
          agentId: 'test-agent-id-123',
          connectionType: 'websocket',
        });
      });
    });

    it('calls conversation.endSession when ending call', async () => {
      // Arrange
      const user = userEvent.setup();
      let onConnectCallback: (() => void) | undefined;

      mockStartSession.mockResolvedValue(undefined);
      mockEndSession.mockResolvedValue(undefined);

      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect first by calling onConnect
      await act(async () => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      await waitFor(() => {
        expect(screen.getByText('connected')).toBeInTheDocument();
      });

      // Act - End call
      const endButton = screen.getByRole('button', { name: /end conversation/i });
      await user.click(endButton);

      // Assert
      await waitFor(() => {
        expect(mockEndSession).toHaveBeenCalled();
      });
    });

    it('button is disabled while connecting', async () => {
      // Arrange
      const user = userEvent.setup();
      mockStartSession.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it('button shows different text based on connection state', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Assert - Initially disconnected
      expect(screen.getByRole('button', { name: /start conversation/i })).toHaveTextContent('Start Call');

      // Act - Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert - Connected
      expect(screen.getByRole('button', { name: /end conversation/i })).toHaveTextContent('End Call');
    });
  });

  describe('Mute Toggle', () => {
    it('mute button appears only when connected', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Assert - Not visible when disconnected
      expect(screen.queryByRole('button', { name: /mute microphone/i })).not.toBeInTheDocument();

      // Act - Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert - Visible when connected
      expect(screen.getByRole('button', { name: /mute microphone/i })).toBeInTheDocument();
    });

    it('clicking mute calls setVolume with volume 0', async () => {
      // Arrange
      const user = userEvent.setup();
      let onConnectCallback: (() => void) | undefined;

      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Act - Click mute
      const muteButton = screen.getByRole('button', { name: /mute microphone/i });
      await user.click(muteButton);

      // Assert
      expect(mockSetVolume).toHaveBeenCalledWith({ volume: 0 });
    });

    it('clicking unmute calls setVolume with volume 1', async () => {
      // Arrange
      const user = userEvent.setup();
      let onConnectCallback: (() => void) | undefined;

      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Mute first
      const muteButton = screen.getByRole('button', { name: /mute microphone/i });
      await user.click(muteButton);

      // Act - Unmute
      const unmuteButton = screen.getByRole('button', { name: /unmute microphone/i });
      await user.click(unmuteButton);

      // Assert
      expect(mockSetVolume).toHaveBeenCalledWith({ volume: 1 });
    });

    it('mute button visual state changes when toggled', async () => {
      // Arrange
      const user = userEvent.setup();
      let onConnectCallback: (() => void) | undefined;

      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert - Initially unmuted (blue)
      const muteButton = screen.getByRole('button', { name: /mute microphone/i });
      expect(muteButton).toHaveClass('bg-blue-600');
      expect(muteButton).toHaveAttribute('aria-pressed', 'false');

      // Act - Mute
      await user.click(muteButton);

      // Assert - Muted (gray)
      const unmuteButton = screen.getByRole('button', { name: /unmute microphone/i });
      expect(unmuteButton).toHaveClass('bg-gray-600');
      expect(unmuteButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('mute button has aria-pressed attribute', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      const muteButton = screen.getByRole('button', { name: /mute microphone/i });
      expect(muteButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Waveform Visualization', () => {
    it('waveform does not appear when disconnected', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const waveform = screen.queryByRole('img', { name: /audio waveform visualization/i });
      expect(waveform).not.toBeInTheDocument();
    });

    it('waveform appears when connected', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act - Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      const waveform = screen.getByRole('img', { name: /audio waveform visualization/i });
      expect(waveform).toBeInTheDocument();
    });

    it('waveform has 12 animated bars', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act - Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      const waveform = screen.getByRole('img', { name: /audio waveform visualization/i });
      const bars = waveform.querySelectorAll('.bg-green-500.rounded-full.animate-pulse');
      expect(bars).toHaveLength(12);
    });

    it('applies custom waveformClassName', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar waveformClassName="custom-waveform-class" />);

      // Act - Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      const waveform = screen.getByRole('img', { name: /audio waveform visualization/i });
      expect(waveform).toHaveClass('custom-waveform-class');
    });

    it('waveform has img role and aria-label', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act - Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      const waveform = screen.getByRole('img', { name: /audio waveform visualization/i });
      expect(waveform).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when startSession fails', async () => {
      // Arrange
      const user = userEvent.setup();
      mockStartSession.mockRejectedValue(new Error('Connection failed'));
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('error')).toBeInTheDocument();
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });

    it('shows generic error message for non-Error objects', async () => {
      // Arrange
      const user = userEvent.setup();
      mockStartSession.mockRejectedValue('String error');
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });

    it('onError callback sets error state', () => {
      // Arrange
      let onErrorCallback: ((msg: string) => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onErrorCallback = callbacks?.onError;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act
      act(() => {
        if (onErrorCallback) {
          onErrorCallback('Test error message');
        }
      });

      // Assert
      expect(screen.getByText('error')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('logs errors in development mode', async () => {
      // Arrange
      const user = userEvent.setup();
      process.env.NODE_ENV = 'development';
      const testError = new Error('Test error');
      mockStartSession.mockRejectedValue(testError);
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ConversationBar] Toggle error:',
          testError
        );
      });
    });

    it('error message has red styling', async () => {
      // Arrange
      const user = userEvent.setup();
      mockStartSession.mockRejectedValue(new Error('Connection failed'));
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        const errorMessage = screen.getByText('Connection failed');
        expect(errorMessage).toHaveClass('text-red-300');
        expect(errorMessage.parentElement).toHaveClass('bg-red-900/20', 'border-red-700');
      });
    });
  });

  describe('Accessibility', () => {
    it('component has proper aria-label', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const container = screen.getByRole('region', { name: /voice conversation interface/i });
      expect(container).toBeInTheDocument();
    });

    it('status indicator has role and aria-label', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const statusIndicator = screen.getByRole('status', { name: /connection status: disconnected/i });
      expect(statusIndicator).toBeInTheDocument();
    });

    it('buttons have descriptive aria-labels', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const button = screen.getByRole('button', { name: /start conversation/i });
      expect(button).toBeInTheDocument();
    });

    it('status changes are announced to screen readers', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act - Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      const statusIndicator = screen.getByRole('status', { name: /connection status: connected/i });
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('Props and Customization', () => {
    it('applies custom className to container', () => {
      // Act
      render(<ConversationBar className="custom-class-name" />);

      // Assert
      const container = screen.getByRole('region', { name: /voice conversation interface/i });
      expect(container).toHaveClass('custom-class-name');
    });

    it('className defaults to empty string', () => {
      // Act
      render(<ConversationBar />);

      // Assert
      const container = screen.getByRole('region', { name: /voice conversation interface/i });
      expect(container).not.toHaveClass('undefined');
      expect(container.className).not.toContain('undefined');
    });

    it('waveformClassName defaults to empty string', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect to show waveform
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      const waveform = screen.getByRole('img', { name: /audio waveform visualization/i });
      expect(waveform.className).not.toContain('undefined');
    });
  });

  describe('Callback Logging', () => {
    it('logs connection in development mode', () => {
      // Arrange
      let onConnectCallback: (() => void) | undefined;
      process.env.NODE_ENV = 'development';

      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ConversationBar] Connected to agent:',
        'test-agent-id-123'
      );
    });

    it('logs disconnection in development mode', () => {
      // Arrange
      let onDisconnectCallback: (() => void) | undefined;
      process.env.NODE_ENV = 'development';

      mockUseConversation.mockImplementation((callbacks) => {
        onDisconnectCallback = callbacks?.onDisconnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act
      act(() => {
        if (onDisconnectCallback) {
          onDisconnectCallback();
        }
      });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[ConversationBar] Disconnected');
    });

    it('logs messages in development mode', () => {
      // Arrange
      let onMessageCallback: ((msg: unknown) => void) | undefined;
      process.env.NODE_ENV = 'development';

      mockUseConversation.mockImplementation((callbacks) => {
        onMessageCallback = callbacks?.onMessage;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Act
      const testMessage = { source: 'user' as const, message: 'Hello' };
      act(() => {
        if (onMessageCallback) {
          onMessageCallback(testMessage);
        }
      });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[ConversationBar] Message:', testMessage);
    });

    it('logs mute state in development mode', async () => {
      // Arrange
      const user = userEvent.setup();
      let onConnectCallback: (() => void) | undefined;
      process.env.NODE_ENV = 'development';

      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Act - Mute
      const muteButton = screen.getByRole('button', { name: /mute microphone/i });
      await user.click(muteButton);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[ConversationBar] Mute:', true);
    });
  });

  describe('Edge Cases', () => {
    it('attempting to connect without agent ID shows error', async () => {
      // Arrange
      const user = userEvent.setup();
      delete process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      render(<ConversationBar />);

      // Act
      const button = screen.getByRole('button', { name: /start conversation/i });
      await user.click(button);

      // Assert
      expect(mockStartSession).not.toHaveBeenCalled();
      expect(screen.getByText('Agent ID not configured')).toBeInTheDocument();
    });

    it('resets mute state when disconnected', async () => {
      // Arrange
      const user = userEvent.setup();
      let callbacks: {
        onConnect?: () => void;
        onDisconnect?: () => void;
      } = {};

      mockUseConversation.mockImplementation((cbs) => {
        callbacks = cbs || {};
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: mockSetVolume,
        };
      });

      render(<ConversationBar />);

      // Connect
      act(() => {
        if (callbacks.onConnect) {
          callbacks.onConnect();
        }
      });

      // Mute
      const muteButton = screen.getByRole('button', { name: /mute microphone/i });
      await user.click(muteButton);

      expect(screen.getByRole('button', { name: /unmute microphone/i })).toBeInTheDocument();

      // Act - Disconnect
      act(() => {
        if (callbacks.onDisconnect) {
          callbacks.onDisconnect();
        }
      });

      // Reconnect to verify mute state reset
      act(() => {
        if (callbacks.onConnect) {
          callbacks.onConnect();
        }
      });

      // Assert - Should be unmuted
      const newMuteButton = screen.getByRole('button', { name: /mute microphone/i });
      expect(newMuteButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('handles setVolume being undefined gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      let onConnectCallback: (() => void) | undefined;

      mockUseConversation.mockImplementation((callbacks) => {
        onConnectCallback = callbacks?.onConnect;
        return {
          startSession: mockStartSession,
          endSession: mockEndSession,
          setVolume: undefined, // setVolume not available
        };
      });

      render(<ConversationBar />);

      // Connect
      act(() => {
        if (onConnectCallback) {
          onConnectCallback();
        }
      });

      // Act - Click mute (should not throw error)
      const muteButton = screen.getByRole('button', { name: /mute microphone/i });
      await user.click(muteButton);

      // Assert - No error thrown, button state changes
      expect(screen.getByRole('button', { name: /unmute microphone/i })).toBeInTheDocument();
    });
  });
});
