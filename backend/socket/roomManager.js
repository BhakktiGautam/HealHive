// In-memory store for active rooms and users
// For production, use Redis instead

class RoomManager {
  constructor() {
    // Store: roomId -> Set of userIds
    this.rooms = new Map();
    // Store: userId -> { socketId, roomId, userData }
    this.users = new Map();
    // Store: socketId -> userId
    this.socketToUser = new Map();
  }

  // Add user to a room
  addUserToRoom(socketId, userId, roomId, userData = {}) {
    // Add to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(userId);

    // Store user info
    this.users.set(userId, {
      socketId,
      roomId,
      userData,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });

    // Map socket to user
    this.socketToUser.set(socketId, userId);

    console.log(`✅ User ${userId} added to room ${roomId}`);
    return this.users.get(userId);
  }

  // Remove user from room
  removeUserFromRoom(socketId) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return null;

    const userInfo = this.users.get(userId);
    if (userInfo) {
      const { roomId } = userInfo;
      
      // Remove from room
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).delete(userId);
        if (this.rooms.get(roomId).size === 0) {
          this.rooms.delete(roomId);
        }
      }

      // Remove user
      this.users.delete(userId);
      this.socketToUser.delete(socketId);

      console.log(`❌ User ${userId} removed from room ${roomId}`);
      return { userId, roomId };
    }
    return null;
  }

  // Get user info
  getUser(userId) {
    return this.users.get(userId) || null;
  }

  // Get user by socketId
  getUserBySocket(socketId) {
    const userId = this.socketToUser.get(socketId);
    return userId ? this.users.get(userId) : null;
  }

  // Get all users in a room
  getUsersInRoom(roomId) {
    if (!this.rooms.has(roomId)) return [];
    const userIds = Array.from(this.rooms.get(roomId));
    return userIds.map((userId) => ({
      userId,
      ...this.users.get(userId),
    }));
  }

  // Check if user is in a room
  isUserInRoom(userId, roomId) {
    if (!this.rooms.has(roomId)) return false;
    return this.rooms.get(roomId).has(userId);
  }

  // Update user's socket (for reconnection)
  updateUserSocket(userId, newSocketId) {
    const userInfo = this.users.get(userId);
    if (!userInfo) return null;

    // Remove old socket mapping
    this.socketToUser.delete(userInfo.socketId);
    
    // Update socket
    userInfo.socketId = newSocketId;
    userInfo.lastActive = new Date().toISOString();
    
    // Add new socket mapping
    this.socketToUser.set(newSocketId, userId);

    console.log(`🔄 User ${userId} socket updated to ${newSocketId}`);
    return userInfo;
  }

  // Get user's room
  getUserRoom(userId) {
    const userInfo = this.users.get(userId);
    return userInfo ? userInfo.roomId : null;
  }

  // Clean up inactive users (optional)
  cleanupInactiveUsers(maxInactiveTime = 30 * 60 * 1000) { // 30 minutes default
    const now = Date.now();
    const toRemove = [];

    for (const [userId, userInfo] of this.users) {
      const lastActive = new Date(userInfo.lastActive).getTime();
      if (now - lastActive > maxInactiveTime) {
        toRemove.push(userId);
      }
    }

    for (const userId of toRemove) {
      const userInfo = this.users.get(userId);
      if (userInfo) {
        const { socketId, roomId } = userInfo;
        if (this.rooms.has(roomId)) {
          this.rooms.get(roomId).delete(userId);
          if (this.rooms.get(roomId).size === 0) {
            this.rooms.delete(roomId);
          }
        }
        this.users.delete(userId);
        this.socketToUser.delete(socketId);
        console.log(`🧹 Cleaned up inactive user ${userId}`);
      }
    }
  }

  // Get room stats
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalUsers: this.users.size,
      totalSockets: this.socketToUser.size,
      rooms: Array.from(this.rooms.entries()).map(([roomId, users]) => ({
        roomId,
        userCount: users.size,
        users: Array.from(users),
      })),
    };
  }
}

// Singleton instance
const roomManager = new RoomManager();

// Cleanup inactive users every 5 minutes
setInterval(() => {
  roomManager.cleanupInactiveUsers();
}, 5 * 60 * 1000);

module.exports = roomManager;