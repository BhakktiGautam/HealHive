
import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (userId, roomId, userName) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!userId || !roomId) return null;

    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket with reconnection options
    const socket = io(SOCKET_URL, {
      auth: {
        userId,
        roomId,
        userName,
        reconnectAttempt: reconnectAttempts,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    socketRef.current = socket;
    return socket;
  }, [userId, roomId, userName, reconnectAttempts]);

  // Connect socket
  useEffect(() => {
    if (!userId || !roomId) return;

    const socket = initializeSocket();
    if (!socket) return;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      setLastError(null);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setLastError(error.message);
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log(`📴 Socket disconnected: ${reason}`);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, attempt to reconnect
        socket.connect();
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnect attempt ${attemptNumber}`);
      setIsReconnecting(true);
      setReconnectAttempts(attemptNumber);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      setIsReconnecting(false);
      setLastError('Unable to reconnect to server');
    });

    socket.on('reconnect_success', (data) => {
      console.log('✅ Reconnection successful:', data);
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
    });

    // Room rejoin events
    socket.on('reconnection_complete', (data) => {
      console.log('✅ Reconnection complete:', data);
      // Re-fetch room state if needed
    });

    socket.on('room_state', (data) => {
      console.log('📊 Received room state:', data);
      // Update UI with room state
    });

    socket.on('user_reconnected', (data) => {
      console.log(`🔄 User ${data.userName} reconnected`);
      // Show reconnection notification
    });

    socket.on('user_left', (data) => {
      console.log(`👋 User ${data.userName} left the room`);
      // Update UI
    });

    // Error handling
    socket.on('signal_error', (data) => {
      console.error('⚠️ Signal error:', data);
      setLastError(data.message);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket');
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId, roomId, initializeSocket]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  // Send message with retry
  const emit = useCallback((event, data) => {
    if (!socketRef.current) {
      console.warn('Socket not initialized');
      return false;
    }

    if (!isConnected) {
      // Queue message if not connected
      console.warn('Socket not connected, message queued');
      // Implement message queueing here if needed
      return false;
    }

    socketRef.current.emit(event, data);
    return true;
  }, [isConnected]);

  // Check connection status
  const checkConnection = useCallback(() => {
    if (!socketRef.current) return false;
    return socketRef.current.connected;
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    lastError,
    reconnect,
    emit,
    checkConnection,
  };
};

export default useSocket;