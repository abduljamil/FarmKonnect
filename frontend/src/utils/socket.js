import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
  }

  connect(token) {
    // If already connected, return existing socket
    if (this.socket?.connected) {
      return this.socket;
    }

    // If currently connecting, wait for that connection
    if (this.isConnecting) {
      return this.socket;
    }

    // If socket exists but disconnected, reconnect it
    if (this.socket) {
      this.socket.connect();
      return this.socket;
    }

    // Create new socket connection
    this.isConnecting = true;
    this.socket = io("http://localhost:3000", {
      auth: {
        token,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      this.isConnecting = false;
    });

    this.socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        // Server initiated disconnect, reconnect manually
        this.socket.connect();
      }
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.isConnecting = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      // Remove all listeners before disconnect
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Join a conversation room
  joinConversation(conversationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("join_conversation", conversationId);
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId) {
    if (this.socket) {
      this.socket.emit("leave_conversation", conversationId);
    }
  }

  // Send a message
  sendMessage(
    conversationId,
    content,
    messageType = "text",
    offerAmount = null
  ) {
    if (this.socket && this.socket.connected) {
      const payload = {
        conversationId,
        content,
        messageType,
        offerAmount,
      };
      this.socket.emit("send_message", payload);
    } else {
      console.error("Socket not connected. Cannot send message.");
    }
  }

  // Send typing indicator
  sendTyping(conversationId) {
    if (this.socket) {
      this.socket.emit("typing", { conversationId });
    }
  }

  // Send stop typing indicator
  sendStopTyping(conversationId) {
    if (this.socket) {
      this.socket.emit("stop_typing", { conversationId });
    }
  }

  // Mark messages as read
  markAsRead(conversationId) {
    if (this.socket) {
      this.socket.emit("mark_read", { conversationId });
    }
  }

  // Update offer status
  updateOffer(messageId, status, conversationId) {
    if (this.socket) {
      this.socket.emit("update_offer", { messageId, status, conversationId });
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (!this.socket) {
      return;
    }

    // Remove existing listener first to prevent duplicates
    this.socket.off("new_message");

    // Attach new listener
    this.socket.on("new_message", (message) => {
      callback(message);
    });
  }

  // Listen for typing indicator
  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on("user_typing", callback);
    }
  }

  // Listen for stop typing indicator
  onUserStopTyping(callback) {
    if (this.socket) {
      this.socket.on("user_stop_typing", callback);
    }
  }

  // Listen for offer updates
  onOfferUpdated(callback) {
    if (this.socket) {
      this.socket.on("offer_updated", callback);
    }
  }

  // Listen for messages read event
  onMessagesRead(callback) {
    if (this.socket) {
      this.socket.on("messages_read", callback);
    }
  }

  // Listen for unread count updates
  onUnreadCountUpdated(callback) {
    if (this.socket) {
      this.socket.on("unread_count_updated", callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
