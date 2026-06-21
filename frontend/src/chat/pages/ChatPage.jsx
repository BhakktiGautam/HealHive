import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import ChatHeader from '../Auth/components/ChatHeader';
import ChatMessages from '../Auth/components/ChatMessages';
import ChatInput from '../Auth/components/ChatInput';
import ReconnectionStatus from '../components/ReconnectionStatus';
import useSocket from '../hooks/useSocket';
import { dummyMessages } from '../data/dummyMessages';

// Doctor data - can be extended with more doctors
const doctorData = {
  doc1: {
    id: 'doc1',
    name: 'Dr. Sarah Mitchell',
    speciality: 'Cardiologist',
    avatar: '👨‍⚕️',
  },
  doc2: {
    id: 'doc2',
    name: 'Dr. John Smith',
    speciality: 'General Practitioner',
    avatar: '👨‍⚕️',
  },
  doc3: {
    id: 'doc3',
    name: 'Dr. Emily Johnson',
    speciality: 'Dermatologist',
    avatar: '👩‍⚕️',
  },
};

const generateTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const generateDoctorResponse = (patientMessage) => {
  const responses = [
    'I understand. Can you tell me more about that?',
    "That's helpful information. How long have you been experiencing this?",
    'I see. Have you taken any medications for this?',
    'Thank you for sharing. Do you have any other symptoms?',
    'Let me know if the pain is constant or intermittent.',
    "That's important to know. We'll need to monitor this closely.",
    'I recommend keeping a symptom diary. How are you feeling now?',
    "This is valuable information. Let's discuss your treatment options.",
    'Have you experienced this before? When did it start?',
    'Good observation. Let's schedule some tests to get more clarity.',
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

const ChatPage = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'doctor' or 'patient'
  const [otherParty, setOtherParty] = useState({ 
    name: 'User', 
    avatar: '👤',
    specialty: '',
  });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  const messageQueueRef = useRef([]);

  // Get user info
  const userId = user?.uid || 'anonymous';
  const userName = user?.displayName || user?.email || 'User';

  // ============================
  // USE SOCKET HOOK
  // ============================
  const {
    socket,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    lastError,
    reconnect,
    emit,
    checkConnection,
  } = useSocket(userId, consultationId, userName);

  // ============================
  // DETECT USER ROLE
  // ============================
  useEffect(() => {
    const detectRole = async () => {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        
        // Check if user is doctor
        const docRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/doctor/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (docRes.ok) {
          setUserRole('doctor');
          // Fetch consultation details
          const statusRes = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/payments/status/${consultationId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (statusRes.ok) {
            const status = await statusRes.json();
            setOtherParty({
              name: status.patient?.name || 'Patient',
              avatar: '👤',
              specialty: '',
            });
          }
        } else {
          setUserRole('patient');
          // Fetch consultation status for doctor info
          const statusRes = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/payments/status/${consultationId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (statusRes.ok) {
            const status = await statusRes.json();
            if (status.doctor) {
              setOtherParty({
                name: status.doctor.name || 'Doctor',
                specialty: status.doctor.specialty || '',
                avatar: '👨‍⚕️',
              });
            }
          }
        }
      } catch (e) {
        console.warn('Role detection failed', e);
        setUserRole('patient'); // default
      }
    };
    detectRole();
  }, [user, consultationId]);

  // ============================
  // SCROLL TO BOTTOM
  // ============================
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ============================
  // SOCKET EVENT LISTENERS
  // ============================
  useEffect(() => {
    if (!socket || !userRole) return;

    // Handle incoming messages
    const handleReceiveMessage = (data) => {
      const isOwnMessage = data.userId === userId;
      
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: isOwnMessage ? (userRole === 'doctor' ? 'doctor' : 'patient') : 'other',
          senderName: isOwnMessage ? 'You' : data.userName || otherParty.name,
          senderRole: isOwnMessage ? userRole : otherParty.specialty,
          avatar: isOwnMessage ? (userRole === 'doctor' ? '👨‍⚕️' : '👤') : otherParty.avatar,
          message: data.text || data.message,
          timestamp: data.timestamp || generateTimestamp(),
          read: true,
        },
      ]);
    };

    // Handle user joined
    const handleUserJoined = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'system',
          senderName: 'System',
          message: `${data.userName} joined the chat`,
          timestamp: data.timestamp || generateTimestamp(),
          read: true,
          isSystem: true,
        },
      ]);
    };

    // Handle user left
    const handleUserLeft = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'system',
          senderName: 'System',
          message: `${data.userName} left the chat`,
          timestamp: data.timestamp || generateTimestamp(),
          read: true,
          isSystem: true,
        },
      ]);
    };

    // Handle user reconnected
    const handleUserReconnected = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'system',
          senderName: 'System',
          message: `${data.userName} reconnected`,
          timestamp: data.timestamp || generateTimestamp(),
          read: true,
          isSystem: true,
        },
      ]);
    };

    // Handle reconnection success
    const handleReconnectionSuccess = (data) => {
      setConnectionStatus('connected');
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'system',
          senderName: 'System',
          message: '🔄 Connection restored!',
          timestamp: new Date().toISOString(),
          read: true,
          isSystem: true,
        },
      ]);
    };

    // Handle reconnection complete
    const handleReconnectionComplete = (data) => {
      setConnectionStatus('connected');
    };

    // Handle room state
    const handleRoomState = (data) => {
      console.log('Room state received:', data);
      if (data.users) {
        const userList = data.users.map(u => u.userName).join(', ');
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            sender: 'system',
            senderName: 'System',
            message: `👥 Users in chat: ${userList}`,
            timestamp: new Date().toISOString(),
            read: true,
            isSystem: true,
          },
        ]);
      }
    };

    // Register event listeners
    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_reconnected', handleUserReconnected);
    socket.on('reconnection_success', handleReconnectionSuccess);
    socket.on('reconnection_complete', handleReconnectionComplete);
    socket.on('room_state', handleRoomState);

    // Cleanup
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_reconnected', handleUserReconnected);
      socket.off('reconnection_success', handleReconnectionSuccess);
      socket.off('reconnection_complete', handleReconnectionComplete);
      socket.off('room_state', handleRoomState);
    };
  }, [socket, userRole, userId, otherParty]);

  // ============================
  // SEND MESSAGE
  // ============================
  const handleSendMessage = useCallback(
    (messageText) => {
      if (!messageText.trim()) return;

      // Add own message
      const ownMessage = {
        id: messages.length + 1,
        sender: userRole === 'doctor' ? 'doctor' : 'patient',
        senderName: 'You',
        avatar: userRole === 'doctor' ? '👨‍⚕️' : '👤',
        message: messageText.trim(),
        timestamp: generateTimestamp(),
        read: true,
      };

      setMessages((prev) => [...prev, ownMessage]);
      setIsLoading(true);

      // Send via socket if connected
      if (isConnected && socket) {
        const messageData = {
          text: messageText.trim(),
          userId,
          userName,
          roomId: consultationId,
          senderRole: userRole,
        };
        
        emit('send_message', messageData);
        setIsLoading(false);
      } else {
        // Message queued for when connection restores
        console.warn('Socket not connected, message queued');
        messageQueueRef.current.push({
          text: messageText.trim(),
          userId,
          userName,
          roomId: consultationId,
        });
        setIsLoading(false);
      }

      // Simulate doctor response (if patient and doctor not responding)
      if (userRole === 'patient') {
        setTimeout(() => {
          const doctorResponse = generateDoctorResponse(messageText);
          const responseMessage = {
            id: messages.length + 2,
            sender: 'doctor',
            senderName: otherParty.name || 'Doctor',
            senderRole: otherParty.specialty || '',
            avatar: otherParty.avatar || '👨‍⚕️',
            message: doctorResponse,
            timestamp: generateTimestamp(),
            read: true,
          };
          setMessages((prev) => [...prev, responseMessage]);
        }, 1000 + Math.random() * 2000);
      }
    },
    [messages, socket, isConnected, consultationId, userRole, userId, userName, emit, otherParty]
  );

  // ============================
  // HANDLE BACK
  // ============================
  const handleBack = () => {
    if (socket) {
      socket.disconnect();
    }
    navigate(-1);
  };

  // ============================
  // HANDLE RECONNECT
  // ============================
  const handleReconnect = () => {
    reconnect();
    setConnectionStatus('reconnecting');
  };

  // ============================
  // RENDER
  // ============================
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50">
      {/* Header with Connection Status */}
      <div className="border-b border-emerald-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <ChatHeader doctor={otherParty} onBack={handleBack} />
          
          {/* Reconnection Status */}
          <ReconnectionStatus
            isConnected={isConnected}
            isReconnecting={isReconnecting}
            reconnectAttempts={reconnectAttempts}
            lastError={lastError}
            onReconnect={handleReconnect}
          />
        </div>
      </div>

      {/* Messages */}
      <ChatMessages 
        messages={messages} 
        messagesEndRef={messagesEndRef}
      />

      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading}
        isConnected={isConnected}
      />
    </div>
  );
};

export default ChatPage;