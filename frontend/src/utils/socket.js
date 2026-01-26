import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
    this.token = null;
  }

  connect(token) {
    // Store token for reconnection
    if (token) {
      this.token = token;
    }

    // If already connected, return existing socket
    if (this.socket?.connected) {
      return this.socket;
    }

    // If currently connecting, wait for that connection
    if (this.isConnecting) {
      return this.socket;
    }

    // If socket exists but disconnected, update auth and reconnect
    if (this.socket) {
      this.socket.auth = { token: this.token || "" };
      this.socket.connect();
      return this.socket;
    }

    // Create new socket connection
    this.isConnecting = true;
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
    this.socket = io(SOCKET_URL, {
      auth: {
        token: this.token || token || "",
      },
      withCredentials: true,  // Send cookies for authentication
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      this.isConnecting = false;
      // console.log("Socket: Connected successfully, socket id:", this.socket.id);
    });

    this.socket.on("connected", (data) => {
      // console.log("Socket: Server confirmed connection for user:", data.userId);
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
      console.error("Socket connection error:", error.message);
      console.error("Full error:", error);
      this.isConnecting = false;
    });

    return this.socket;
  }

  // Wait for connection to be established
  waitForConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, timeout);

      const checkConnection = () => {
        if (this.socket?.connected) {
          clearTimeout(timeoutId);
          resolve(true);
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
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
    } else {
      // If not connected, wait for connection then join (max 5 seconds)
      let attempts = 0;
      const maxAttempts = 10;
      const checkAndJoin = () => {
        attempts++;
        if (this.socket?.connected) {
          this.socket.emit("join_conversation", conversationId);
        } else if (attempts < maxAttempts) {
          setTimeout(checkAndJoin, 500);
        }
      };
      checkAndJoin();
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
      return true;
    } else {
      console.error("Socket not connected. Cannot send message.");
      return false;
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
    // Store callback for later use
    this.listeners.set("new_message_chat_callback", callback);

    const attachListener = () => {
      if (!this.socket) {
        return;
      }

      // Remove existing listener first
      const existingWrapper = this.listeners.get("new_message_chat_wrapper");
      if (existingWrapper) {
        this.socket.off("new_message", existingWrapper);
      }

      // Create wrapper and attach
      const wrapper = async (message) => {
        const cb = this.listeners.get("new_message_chat_callback");
        if (cb) {
          try {
            const result = cb(message);
            // Handle async callbacks
            if (result && typeof result.then === 'function') {
              await result;
            }
          } catch (error) {
            console.error("Socket: Error in message callback:", error);
          }
        }
      };
      this.listeners.set("new_message_chat_wrapper", wrapper);
      this.socket.on("new_message", wrapper);
    };

    // If already connected, attach now
    if (this.socket?.connected) {
      attachListener();
    } else if (this.socket) {
      // Socket exists but not connected - wait for connect event
      this.socket.once("connect", attachListener);
    } else {
      // No socket yet - wait for it
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);
          if (this.socket.connected) {
            attachListener();
          } else {
            this.socket.once("connect", attachListener);
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkSocket), 10000);
    }
  }

  // Remove the chat-specific new message listener
  offNewMessage() {
    const wrapper = this.listeners.get("new_message_chat_wrapper");
    if (this.socket && wrapper) {
      this.socket.off("new_message", wrapper);
    }
    this.listeners.delete("new_message_chat_wrapper");
    this.listeners.delete("new_message_chat_callback");
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

  // Order events - using camelCase to match backend
  onNewOrder(callback) {
    this.listeners.set("new_order_callback", callback);

    const attachListener = () => {
      if (!this.socket) return;

      // Remove existing listener first
      const existingWrapper = this.listeners.get("new_order_wrapper");
      if (existingWrapper) {
        this.socket.off("newOrder", existingWrapper);
      }

      // Create wrapper and attach
      const wrapper = (data) => {
        const cb = this.listeners.get("new_order_callback");
        if (cb) {
          try {
            cb(data);
          } catch (error) {
            console.error("Socket: Error in newOrder callback:", error);
          }
        }
      };
      this.listeners.set("new_order_wrapper", wrapper);
      this.socket.on("newOrder", wrapper);
    };

    // If already connected, attach now
    if (this.socket?.connected) {
      attachListener();
    } else if (this.socket) {
      this.socket.once("connect", attachListener);
    } else {
      // No socket yet - wait for it
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);
          if (this.socket.connected) {
            attachListener();
          } else {
            this.socket.once("connect", attachListener);
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkSocket), 10000);
    }
  }

  offNewOrder() {
    const wrapper = this.listeners.get("new_order_wrapper");
    if (this.socket && wrapper) {
      this.socket.off("newOrder", wrapper);
    }
    this.listeners.delete("new_order_wrapper");
    this.listeners.delete("new_order_callback");
  }

  // Order status update events - supports multiple callbacks
  onOrderStatusUpdate(callback, callerId = "default") {
    // Store callback with unique ID to support multiple listeners
    const callbackKey = `order_status_callback_${callerId}`;
    this.listeners.set(callbackKey, callback);
    // console.log(`Socket: Registered order status callback: ${callbackKey}`);

    const attachListener = () => {
      if (!this.socket) return;

      // Only attach the socket listener once (check if wrapper already exists)
      if (this.listeners.has("order_status_wrapper_attached")) {
        return;
      }

      // Create wrapper that calls ALL registered callbacks
      const wrapper = (data) => {
        // console.log("Socket: orderStatusUpdate received, calling callbacks...");
        // Find all order status callbacks and call them
        let callbackCount = 0;
        for (const [key, cb] of this.listeners.entries()) {
          if (key.startsWith("order_status_callback_") && typeof cb === "function") {
            try {
              // console.log(`Socket: Calling callback ${key}`);
              callbackCount++;
              cb(data);
            } catch (error) {
              console.error(`Socket: Error in order status callback (${key}):`, error);
            }
          }
        }
        // console.log(`Socket: Called ${callbackCount} order status callbacks`);
      };

      this.listeners.set("order_status_wrapper", wrapper);
      this.listeners.set("order_status_wrapper_attached", true);
      this.socket.on("orderStatusUpdate", wrapper);
    };

    // If already connected, attach now
    if (this.socket?.connected) {
      attachListener();
    } else if (this.socket) {
      this.socket.once("connect", attachListener);
    } else {
      // No socket yet - wait for it
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);
          if (this.socket.connected) {
            attachListener();
          } else {
            this.socket.once("connect", attachListener);
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkSocket), 10000);
    }
  }

  offOrderStatusUpdate(callerId = "default") {
    const callbackKey = `order_status_callback_${callerId}`;
    // console.log(`Socket: Removing order status callback: ${callbackKey}`);
    this.listeners.delete(callbackKey);

    // If no more callbacks, remove the socket listener
    let hasCallbacks = false;
    for (const key of this.listeners.keys()) {
      if (key.startsWith("order_status_callback_")) {
        hasCallbacks = true;
        break;
      }
    }

    // console.log(`Socket: Remaining order status callbacks: ${hasCallbacks}`);
    if (!hasCallbacks) {
      const wrapper = this.listeners.get("order_status_wrapper");
      if (this.socket && wrapper) {
        this.socket.off("orderStatusUpdate", wrapper);
      }
      this.listeners.delete("order_status_wrapper");
      this.listeners.delete("order_status_wrapper_attached");
    }
  }

  onNewReview(callback) {
    this.listeners.set("new_review_callback", callback);

    const attachListener = () => {
      if (!this.socket) return;

      // Remove existing listener first
      const existingWrapper = this.listeners.get("new_review_wrapper");
      if (existingWrapper) {
        this.socket.off("newReview", existingWrapper);
      }

      // Create wrapper and attach
      const wrapper = (data) => {
        const cb = this.listeners.get("new_review_callback");
        if (cb) {
          try {
            cb(data);
          } catch (error) {
            console.error("Socket: Error in newReview callback:", error);
          }
        }
      };
      this.listeners.set("new_review_wrapper", wrapper);
      this.socket.on("newReview", wrapper);
    };

    // If already connected, attach now
    if (this.socket?.connected) {
      attachListener();
    } else if (this.socket) {
      this.socket.once("connect", attachListener);
    } else {
      // No socket yet - wait for it
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);
          if (this.socket.connected) {
            attachListener();
          } else {
            this.socket.once("connect", attachListener);
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkSocket), 10000);
    }
  }

  offNewReview() {
    const wrapper = this.listeners.get("new_review_wrapper");
    if (this.socket && wrapper) {
      this.socket.off("newReview", wrapper);
    }
    this.listeners.delete("new_review_wrapper");
    this.listeners.delete("new_review_callback");
  }

  // Price alert events - supports multiple callbacks
  onPriceAlertTriggered(callback, callerId = "default") {
    // Store callback with unique ID to support multiple listeners
    const callbackKey = `price_alert_callback_${callerId}`;
    this.listeners.set(callbackKey, callback);

    const attachListener = () => {
      if (!this.socket) {
        return;
      }

      // Only attach the socket listener once (check if wrapper already exists)
      if (this.listeners.has("price_alert_wrapper_attached")) {
        return;
      }

      // Create wrapper that calls ALL registered callbacks
      const wrapper = (data) => {
        // Find all price alert callbacks and call them
        for (const [key, cb] of this.listeners.entries()) {
          if (key.startsWith("price_alert_callback_") && typeof cb === "function") {
            try {
              cb(data);
            } catch (error) {
              console.error(`Socket: Error in price alert callback (${key}):`, error);
            }
          }
        }
      };

      this.listeners.set("price_alert_wrapper", wrapper);
      this.listeners.set("price_alert_wrapper_attached", true);
      this.socket.on("price_alert_triggered", wrapper);
    };

    // If already connected, attach now
    if (this.socket?.connected) {
      attachListener();
    } else if (this.socket) {
      // Socket exists but not connected - wait for connect event
      this.socket.once("connect", attachListener);
    } else {
      // No socket yet - wait for it
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);
          if (this.socket.connected) {
            attachListener();
          } else {
            this.socket.once("connect", attachListener);
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkSocket), 10000);
    }
  }

  offPriceAlertTriggered(callerId = "default") {
    const callbackKey = `price_alert_callback_${callerId}`;
    this.listeners.delete(callbackKey);

    // If no more callbacks, remove the socket listener
    let hasCallbacks = false;
    for (const key of this.listeners.keys()) {
      if (key.startsWith("price_alert_callback_")) {
        hasCallbacks = true;
        break;
      }
    }

    if (!hasCallbacks) {
      const wrapper = this.listeners.get("price_alert_wrapper");
      if (this.socket && wrapper) {
        this.socket.off("price_alert_triggered", wrapper);
      }
      this.listeners.delete("price_alert_wrapper");
      this.listeners.delete("price_alert_wrapper_attached");
    }
  }

  // Support ticket notification events
  onSupportUpdate(callback) {
    this.listeners.set("support_update_callback", callback);

    const attachListener = () => {
      if (!this.socket) return;

      // Remove existing listener first
      const existingWrapper = this.listeners.get("support_update_wrapper");
      if (existingWrapper) {
        this.socket.off("supportUpdate", existingWrapper);
      }

      // Create wrapper and attach
      const wrapper = (data) => {
        const cb = this.listeners.get("support_update_callback");
        if (cb) {
          try {
            cb(data);
          } catch (error) {
            console.error("Socket: Error in supportUpdate callback:", error);
          }
        }
      };
      this.listeners.set("support_update_wrapper", wrapper);
      this.socket.on("supportUpdate", wrapper);
    };

    // If already connected, attach now
    if (this.socket?.connected) {
      attachListener();
    } else if (this.socket) {
      this.socket.once("connect", attachListener);
    } else {
      // No socket yet - wait for it
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);
          if (this.socket.connected) {
            attachListener();
          } else {
            this.socket.once("connect", attachListener);
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkSocket), 10000);
    }
  }

  offSupportUpdate() {
    const wrapper = this.listeners.get("support_update_wrapper");
    if (this.socket && wrapper) {
      this.socket.off("supportUpdate", wrapper);
    }
    this.listeners.delete("support_update_wrapper");
    this.listeners.delete("support_update_callback");
  }

  onAdminNotification(callback) {
    this.listeners.set("admin_notification_callback", callback);

    const attachListener = () => {
      if (!this.socket) return;

      // Remove existing listener first
      const existingWrapper = this.listeners.get("admin_notification_wrapper");
      if (existingWrapper) {
        this.socket.off("adminNotification", existingWrapper);
      }

      // Create wrapper and attach
      const wrapper = (data) => {
        const cb = this.listeners.get("admin_notification_callback");
        if (cb) {
          try {
            cb(data);
          } catch (error) {
            console.error("Socket: Error in adminNotification callback:", error);
          }
        }
      };
      this.listeners.set("admin_notification_wrapper", wrapper);
      this.socket.on("adminNotification", wrapper);
    };

    // If already connected, attach now
    if (this.socket?.connected) {
      attachListener();
    } else if (this.socket) {
      this.socket.once("connect", attachListener);
    } else {
      // No socket yet - wait for it
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);
          if (this.socket.connected) {
            attachListener();
          } else {
            this.socket.once("connect", attachListener);
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkSocket), 10000);
    }
  }

  offAdminNotification() {
    const wrapper = this.listeners.get("admin_notification_wrapper");
    if (this.socket && wrapper) {
      this.socket.off("adminNotification", wrapper);
    }
    this.listeners.delete("admin_notification_wrapper");
    this.listeners.delete("admin_notification_callback");
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
