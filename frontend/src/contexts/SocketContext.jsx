import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import socketService from "../utils/socket";

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [unreadConversations, setUnreadConversations] = useState(new Set());
  const currentUserRef = useRef(null);
  const unreadConversationsRef = useRef(new Set());
  const processedMessageIds = useRef(new Set()); // Track processed messages to avoid duplicates

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      // console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === "granted";
    }

    setNotificationPermission(Notification.permission);
    return false;
  }, []);

  // Show browser notification
  const showNotification = useCallback((title, options = {}) => {
    if (Notification.permission !== "granted") {
      return null;
    }

    // Don't show notification if window is focused
    if (document.hasFocus()) {
      return null;
    }

    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: options.tag || "farmkonnect-notification",
      renotify: true,
      ...options,
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      if (options.onClick) {
        options.onClick();
      } else if (options.url) {
        window.location.href = options.url;
      }
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    const userData = sessionStorage.getItem("user");
    if (!userData) {
      return;
    }

    const user = JSON.parse(userData);
    currentUserRef.current = user;

    // Request notification permission
    requestNotificationPermission();

    // Connect socket
    socketService.connect(user.token || null);

    // Set up connection status listeners
    if (socketService.socket) {
      socketService.socket.on("connect", () => {
        setIsConnected(true);
      });

      socketService.socket.on("disconnect", () => {
        setIsConnected(false);
      });

      // Listen for new messages globally - use a stored reference to avoid duplicates
      const messageHandler = (message) => {
        // Deduplicate messages (backend may emit to multiple rooms)
        const messageId = String(message._id);
        if (processedMessageIds.current.has(messageId)) {
          return;
        }
        processedMessageIds.current.add(messageId);
        // Clean up old message IDs after 10 seconds to prevent memory growth
        setTimeout(() => processedMessageIds.current.delete(messageId), 10000);

        // Check if message is from someone else - use String() for consistent comparison
        const currentUser = currentUserRef.current;
        const senderId = String(message.sender?._id || message.sender);
        const currentUserId = String(currentUser?.id || "");
        const isOwnMessage = senderId === currentUserId;

        if (!isOwnMessage) {
          // Get conversation ID
          const conversationId = String(
            typeof message.conversation === "object" && message.conversation !== null
              ? message.conversation._id
              : (message.conversation || message.conversationId)
          );

          // Track unread conversation globally
          if (conversationId) {
            unreadConversationsRef.current.add(conversationId);
            setUnreadConversations(prev => {
              const newSet = new Set(prev);
              newSet.add(conversationId);
              return newSet;
            });
          }

          // Show browser notification
          const senderName = message.sender?.name || "Someone";
          const messagePreview = message.content?.substring(0, 50) + (message.content?.length > 50 ? "..." : "");

          showNotification(`New message from ${senderName}`, {
            body: messagePreview,
            tag: `message-${message?.conversation?._id || message?.conversation || message?._id}`,
            url: "/chat",
          });

          // Increment unread count if not on chat page
          if (!window.location.pathname.includes("/chat")) {
            setNewMessageCount((prev) => prev + 1);
          }
        }
      };

      // Store the handler reference and attach listener
      if (socketService.listeners.has("new_message_context")) {
        socketService.socket.off("new_message", socketService.listeners.get("new_message_context"));
      }
      socketService.listeners.set("new_message_context", messageHandler);
      socketService.socket.on("new_message", messageHandler);

      // Listen for new orders
      socketService.socket.on("newOrder", (order) => {
        setNewOrderCount((prev) => prev + 1);

        // Show notification for new order
        showNotification("New Order Received!", {
          body: `You have a new order${order.product?.title ? ` for ${order.product.title}` : ""}`,
          tag: `order-${order?._id}`,
          url: "/transactions",
        });
      });

      // Listen for order status updates
      socketService.socket.on("orderStatusUpdate", (data) => {
        // Show notification for order status update
        showNotification("Order Status Updated", {
          body: `Your order status has been updated to: ${data.status}`,
          tag: `order-update-${data?.orderId || data?._id}`,
          url: "/transactions",
        });
      });
    }
  }, [requestNotificationPermission, showNotification]);

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
  }, []);

  // Reset message count (call this when user opens chat)
  const resetMessageCount = useCallback(() => {
    setNewMessageCount(0);
  }, []);

  // Mark a conversation as read (remove from unread set)
  const markConversationRead = useCallback((conversationId) => {
    const convIdStr = String(conversationId);
    unreadConversationsRef.current.delete(convIdStr);
    setUnreadConversations(prev => {
      const newSet = new Set(prev);
      newSet.delete(convIdStr);
      return newSet;
    });
  }, []);

  // Get unread conversations
  const getUnreadConversations = useCallback(() => {
    return unreadConversations;
  }, [unreadConversations]);

  // Reset order count
  const resetOrderCount = useCallback(() => {
    setNewOrderCount(0);
  }, []);

  // Initialize on mount and when user logs in
  useEffect(() => {
    initializeSocket();

    // Listen for storage changes (login/logout)
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        if (e.newValue) {
          initializeSocket();
        } else {
          disconnectSocket();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [initializeSocket, disconnectSocket]);

  // Re-initialize when user returns to tab (event-driven, no polling)
  useEffect(() => {
    const checkConnection = () => {
      const userData = sessionStorage.getItem("user");
      if (userData && !socketService.isConnected()) {
        initializeSocket();
      }
    };

    // Check connection when tab becomes visible (event-driven instead of polling)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkConnection();
      }
    };

    // Also check on focus (for when user switches windows)
    const handleFocus = () => {
      checkConnection();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [initializeSocket]);

  const value = {
    isConnected,
    newMessageCount,
    newOrderCount,
    notificationPermission,
    unreadConversations,
    resetMessageCount,
    resetOrderCount,
    markConversationRead,
    getUnreadConversations,
    initializeSocket,
    disconnectSocket,
    requestNotificationPermission,
    showNotification,
    socketService,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
