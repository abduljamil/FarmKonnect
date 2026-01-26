const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const chatService = require("../services/chatService");

// Store active users
const activeUsers = new Map(); // userId -> socketId

// Helper function to parse cookies from cookie string
const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return cookieString
    .split(';')
    .map(cookie => cookie.trim().split('='))
    .reduce((acc, [key, value]) => {
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {});
};

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
      ].filter(Boolean),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token;
      
      // If no token in auth, try to get from cookies
      if (!token) {
        const cookieString = socket.handshake.headers.cookie;
        const cookies = parseCookies(cookieString);
        token = cookies.token;
      }

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key-here"
      );
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    try {
      // Validate socket.user exists
      if (!socket.user || !socket.user._id) {
        console.error("Socket connection without valid user");
        socket.disconnect();
        return;
      }

      // Store active user
      activeUsers.set(socket.user._id.toString(), socket.id);

      // Emit to user that they're connected
      socket.emit("connected", { userId: socket.user._id });

      // Join user to their personal room
      socket.join(`user:${socket.user._id}`);

      // Handle socket errors
      socket.on("error", (error) => {
        console.error("Socket error for user", socket.user?._id, ":", error.message);
      });

    // Join conversation room
    socket.on("join_conversation", (conversationId) => {
      try {
        if (!conversationId) return;
        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        console.error("Error joining conversation:", error.message);
      }
    });

    // Leave conversation room
    socket.on("leave_conversation", (conversationId) => {
      try {
        if (!conversationId) return;
        socket.leave(`conversation:${conversationId}`);
      } catch (error) {
        console.error("Error leaving conversation:", error.message);
      }
    });

    // Send message
    socket.on("send_message", async (data) => {
      try {
        // Validate input data
        if (!data || !data.conversationId || !data.content) {
          socket.emit("error", { message: "Invalid message data" });
          return;
        }

        const { conversationId, content, messageType, offerAmount } = data;

        // Validate user exists
        if (!socket.user || !socket.user._id) {
          socket.emit("error", { message: "User not authenticated" });
          return;
        }

        // Save message to database
        const message = await chatService.sendMessage(
          conversationId,
          socket.user._id,
          content,
          messageType || "text",
          offerAmount
        );

        // Validate message was created
        if (!message) {
          socket.emit("error", { message: "Failed to save message" });
          return;
        }

        // Get all sockets in the conversation room
        const conversationRoom = io.sockets.adapter.rooms.get(
          `conversation:${conversationId}`
        );
        const socketsInConvRoom = conversationRoom
          ? Array.from(conversationRoom)
          : [];

        // Emit to all users in the conversation room
        io.to(`conversation:${conversationId}`).emit("new_message", message);

        // Also emit to participants' personal rooms ONLY if they're NOT in the conversation room
        // This ensures users receive messages even if they haven't joined the conversation room yet
        // Handle case where conversation might not be populated
        if (!message.conversation) {
          socket.emit("message_sent", { success: true, message });
          return;
        }

        const buyerId =
          message.conversation.buyer?._id || message.conversation.buyer;
        const sellerId =
          message.conversation.seller?._id || message.conversation.seller;

        // Only proceed if we have valid buyer/seller IDs
        if (buyerId && sellerId) {
          // Get buyer and seller personal rooms
          const buyerRoom = io.sockets.adapter.rooms.get(`user:${buyerId}`);
          const sellerRoom = io.sockets.adapter.rooms.get(`user:${sellerId}`);

          const buyerSockets = buyerRoom ? Array.from(buyerRoom) : [];
          const sellerSockets = sellerRoom ? Array.from(sellerRoom) : [];

          // Only broadcast to personal room if user is NOT in conversation room
          const buyerNotInConvRoom = buyerSockets.some(
            (socketId) => !socketsInConvRoom.includes(socketId)
          );
          const sellerNotInConvRoom = sellerSockets.some(
            (socketId) => !socketsInConvRoom.includes(socketId)
          );

          if (buyerNotInConvRoom) {
            io.to(`user:${buyerId}`).emit("new_message", message);
          }

          if (sellerNotInConvRoom) {
            io.to(`user:${sellerId}`).emit("new_message", message);
          }
        }

        // Acknowledge to sender
        socket.emit("message_sent", { success: true, message });
      } catch (error) {
        console.error("Error sending message:", error.message, error.stack);
        try {
          socket.emit("error", { message: error.message || "Failed to send message" });
        } catch (emitError) {
          console.error("Failed to emit error to socket:", emitError.message);
        }
      }
    });

    // Typing indicator
    socket.on("typing", (data) => {
      try {
        if (!data || !data.conversationId) return;
        const { conversationId } = data;
        socket.to(`conversation:${conversationId}`).emit("user_typing", {
          userId: socket.user._id,
          userName: socket.user.name,
        });
      } catch (error) {
        console.error("Error in typing handler:", error.message);
      }
    });

    // Stop typing indicator
    socket.on("stop_typing", (data) => {
      try {
        if (!data || !data.conversationId) return;
        const { conversationId } = data;
        socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
          userId: socket.user._id,
        });
      } catch (error) {
        console.error("Error in stop_typing handler:", error.message);
      }
    });

    // Mark messages as read
    socket.on("mark_read", async (data) => {
      try {
        if (!data || !data.conversationId) return;
        const { conversationId } = data;
        await chatService.markMessagesAsRead(conversationId, socket.user._id);

        // Notify other party
        socket.to(`conversation:${conversationId}`).emit("messages_read", {
          conversationId,
          userId: socket.user._id,
        });

        // Emit to the current user to update their unread count
        socket.emit("unread_count_updated", {
          message: "Messages marked as read",
        });
      } catch (error) {
        console.error("Error in mark_read handler:", error.message);
        try {
          socket.emit("error", { message: error.message });
        } catch (e) {
          // Ignore emit errors
        }
      }
    });

    // Update offer status
    socket.on("update_offer", async (data) => {
      try {
        if (!data || !data.messageId || !data.status || !data.conversationId) {
          socket.emit("error", { message: "Invalid offer update data" });
          return;
        }
        const { messageId, status, conversationId } = data;
        const updatedMessage = await chatService.updateOfferStatus(
          messageId,
          status
        );

        // Emit to all users in the conversation
        io.to(`conversation:${conversationId}`).emit(
          "offer_updated",
          updatedMessage
        );
      } catch (error) {
        console.error("Error in update_offer handler:", error.message);
        try {
          socket.emit("error", { message: error.message });
        } catch (e) {
          // Ignore emit errors
        }
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      try {
        if (socket.user && socket.user._id) {
          activeUsers.delete(socket.user._id.toString());
        }
      } catch (error) {
        console.error("Error in disconnect handler:", error.message);
      }
    });

    } catch (error) {
      console.error("Error in socket connection handler:", error.message);
      try {
        socket.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  });

  // Handle io-level errors
  io.on("error", (error) => {
    console.error("Socket.IO error:", error.message);
  });

  return io;
};

module.exports = initializeSocket;
