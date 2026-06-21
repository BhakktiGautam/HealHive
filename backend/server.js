import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// Import routes
import userRoutes from "./routes/users.js";
import patientRoutes from "./routes/Patient.js";
import doctorRoutes from "./routes/Doctor.js";
import paymentRoutes from "./routes/payments.js";

// Import room manager
import roomManager from "./socket/roomManager.js";

dotenv.config();

// ============================
// EXPRESS APP SETUP
// ============================
const app = express();
const httpServer = createServer(app);

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://healhive-df7bf.web.app",
  "https://healhive-df7bf.firebaseapp.com",
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

// ============================
// SOCKET.IO SETUP
// ============================
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

// Track active sockets
const activeSockets = new Map();

// ============================
// SOCKET.IO AUTH MIDDLEWARE
// ============================
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    const roomId = socket.handshake.auth.roomId;
    const userName = socket.handshake.auth.userName;

    if (!userId || !roomId) {
      return next(new Error('Authentication failed: Missing userId or roomId'));
    }

    socket.userId = userId;
    socket.roomId = roomId;
    socket.userName = userName;
    socket.reconnectAttempt = socket.handshake.auth.reconnectAttempt || 0;

    next();
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication failed'));
  }
});

// ============================
// MAIN SOCKET CONNECTION HANDLER
// ============================
io.on("connection", (socket) => {
  const { userId, roomId, userName } = socket;
  console.log(`🔌 New connection: ${userId} (Socket: ${socket.id})`);

  // Check for reconnection
  const existingUser = roomManager.getUser(userId);
  
  if (existingUser) {
    // === RECONNECTION FLOW ===
    console.log(`🔄 Reconnection detected for user ${userId}`);
    
    roomManager.updateUserSocket(userId, socket.id);
    activeSockets.set(socket.id, userId);

    socket.emit('reconnection_success', {
      userId,
      roomId,
      message: 'Reconnected successfully',
      state: {
        roomId: existingUser.roomId,
        userData: existingUser.userData,
        joinedAt: existingUser.joinedAt,
      },
    });

    socket.to(roomId).emit('user_reconnected', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });

    socket.join(roomId);
    console.log(`✅ User ${userId} rejoined room ${roomId}`);

    socket.emit('reconnection_complete', {
      roomId,
      timestamp: new Date().toISOString(),
    });
  } else {
    // === NEW CONNECTION FLOW ===
    console.log(`✨ New user ${userId} joined room ${roomId}`);

    roomManager.addUserToRoom(socket.id, userId, roomId, {
      userName,
      joinedAt: new Date().toISOString(),
    });

    activeSockets.set(socket.id, userId);
    socket.join(roomId);

    socket.to(roomId).emit('user_joined', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });

    const roomUsers = roomManager.getUsersInRoom(roomId);
    socket.emit('room_state', {
      roomId,
      users: roomUsers,
    });
  }

  // ============================
  // EVENT HANDLERS
  // ============================

  // 1. Chat Messages
  socket.on("send_message", (data) => {
    const messageData = {
      ...data,
      userId,
      userName,
      timestamp: new Date().toISOString(),
    };
    io.to(roomId).emit("receive_message", messageData);
  });

  // 2. Typing Indicator
  socket.on("typing", (data) => {
    socket.to(roomId).emit("user_typing", {
      userId,
      userName,
      isTyping: data.isTyping,
    });
  });

  // 3. WebRTC Signaling
  socket.on("offer", ({ targetUserId, offer }) => {
    const targetSocket = activeSockets.get(targetUserId);
    if (targetSocket) {
      io.to(targetSocket).emit("offer", {
        from: userId,
        fromName: userName,
        offer,
      });
    } else {
      socket.emit('signal_error', {
        message: 'Target user is offline',
        targetUserId,
      });
    }
  });

  socket.on("answer", ({ targetUserId, answer }) => {
    const targetSocket = activeSockets.get(targetUserId);
    if (targetSocket) {
      io.to(targetSocket).emit("answer", {
        from: userId,
        fromName: userName,
        answer,
      });
    }
  });

  socket.on("ice-candidate", ({ targetUserId, candidate }) => {
    const targetSocket = activeSockets.get(targetUserId);
    if (targetSocket) {
      io.to(targetSocket).emit("ice-candidate", {
        from: userId,
        fromName: userName,
        candidate,
      });
    }
  });

  // 4. Call Status
  socket.on("call_status", ({ status, targetUserId }) => {
    const targetSocket = activeSockets.get(targetUserId);
    if (targetSocket) {
      io.to(targetSocket).emit("call_status_update", {
        status,
        userId,
        userName,
        roomId,
      });
    }
  });

  // 5. Join Room (backward compatibility)
  socket.on("joinRoom", (joinRoomId) => {
    if (!joinRoomId) return;
    socket.join(joinRoomId);
    socket.to(joinRoomId).emit("system", { 
      type: "join", 
      id: socket.id,
      userName,
      userId,
    });
  });

  // 6. Simple Message (backward compatibility)
  socket.on("message", ({ roomId: msgRoomId, message }) => {
    if (!msgRoomId || !message) return;
    socket.to(msgRoomId).emit("message", { 
      from: socket.id,
      userName,
      userId,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================
  // DISCONNECTION HANDLER
  // ============================
  socket.on("disconnect", (reason) => {
    console.log(`📴 User ${userId} disconnected. Reason: ${reason}`);

    if (reason === 'transport close' || reason === 'ping timeout') {
      console.log(`⏳ Waiting for user ${userId} to reconnect...`);
      
      setTimeout(() => {
        const userInfo = roomManager.getUser(userId);
        if (userInfo && userInfo.socketId === socket.id) {
          const removed = roomManager.removeUserFromRoom(socket.id);
          if (removed) {
            activeSockets.delete(socket.id);
            console.log(`🗑️ User ${userId} removed from room ${removed.roomId} after timeout`);
            io.to(removed.roomId).emit('user_left', {
              userId,
              userName,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          console.log(`✅ User ${userId} reconnected successfully`);
        }
      }, 30000);
    } else {
      const removed = roomManager.removeUserFromRoom(socket.id);
      if (removed) {
        activeSockets.delete(socket.id);
        console.log(`🗑️ User ${userId} removed from room ${removed.roomId}`);
        io.to(removed.roomId).emit('user_left', {
          userId,
          userName,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Reconnection events
  socket.on("reconnect_attempt", () => {
    console.log(`🔄 Reconnect attempt for user ${userId}`);
  });

  socket.on("reconnect_error", (error) => {
    console.log(`❌ Reconnection error for user ${userId}:`, error.message);
  });
});

// ============================
// HEARTBEAT MONITORING
// ============================
setInterval(() => {
  console.log(`📊 Active sockets: ${activeSockets.size}`);
  console.log(`📊 Active users: ${roomManager.getStats().totalUsers}`);
  console.log(`📊 Active rooms: ${roomManager.getStats().totalRooms}`);
}, 60000);

// ============================
// MONGODB CONNECTION
// ============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected to HealHive database");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ============================
// ROUTES
// ============================
app.get("/", (req, res) => {
  res.send("🚀 HealHive Backend is running!");
});

app.use("/api/users", userRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/doctor", doctorRoutes);

// ============================
// ERROR HANDLING
// ============================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============================
// START SERVER
// ============================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO server ready`);
});

// Export for testing
export { io, activeSockets };