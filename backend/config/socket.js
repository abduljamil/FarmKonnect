const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const chatService = require("../services/chatService");

// Store active users
const activeUsers = new Map(); // userId -> socketId

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

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
    // Store active user
    activeUsers.set(socket.user._id.toString(), socket.id);

    // Emit to user that they're connected
    socket.emit("connected", { userId: socket.user._id });

    // Join user to their personal room
    socket.join(`user:${socket.user._id}`);

    // Join conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send message
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, content, messageType, offerAmount } = data;

        // Save message to database
        const message = await chatService.sendMessage(
          conversationId,
          socket.user._id,
          content,
          messageType,
          offerAmount
        );

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

        // Acknowledge to sender
        socket.emit("message_sent", { success: true, message });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Typing indicator
    socket.on("typing", (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        userId: socket.user._id,
        userName: socket.user.name,
      });
    });

    // Stop typing indicator
    socket.on("stop_typing", (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
        userId: socket.user._id,
      });
    });

    // Mark messages as read
    socket.on("mark_read", async (data) => {
      try {
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
        socket.emit("error", { message: error.message });
      }
    });

    // Update offer status
    socket.on("update_offer", async (data) => {
      try {
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
        socket.emit("error", { message: error.message });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      activeUsers.delete(socket.user._id.toString());
    });
  });

  return io;
};

module.exports = initializeSocket;
