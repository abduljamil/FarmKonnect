import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import ConversationItem from "../components/ConversationItem";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import TypingIndicator from "../components/TypingIndicator";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import ConfirmModal from "../components/ConfirmModal";
import socketService from "../utils/socket";
import chatAPI from "../utils/chatApi";
import useUserSync from "../hooks/useUserSync";
import { useSocket } from "../contexts/SocketContext";

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetMessageCount, initializeSocket, unreadConversations: globalUnread, markConversationRead } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);

  // Auto-sync user data (role updates)
  useUserSync(user, setUser, navigate);

  // Reset message count when entering chat
  useEffect(() => {
    resetMessageCount();
  }, [resetMessageCount]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  // Initialize with global unread state from SocketContext
  const [unreadConversations, setUnreadConversations] = useState(() => new Set(globalUnread));
  const [unreadCount, setUnreadCount] = useState(0);
  const [deleteModal, setDeleteModal] = useState({ open: false, conversationId: null, userName: "" });
  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const hasAttemptedReloadRef = useRef(false);
  const currentUserRef = useRef(null);
  const unreadConversationsRef = useRef(new Set());

  // Keep refs in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Keep unreadConversationsRef in sync with state
  useEffect(() => {
    unreadConversationsRef.current = unreadConversations;
  }, [unreadConversations]);

  // Sync with global unread state from SocketContext
  useEffect(() => {
    if (globalUnread && globalUnread.size > 0) {
      setUnreadConversations(prev => {
        const newSet = new Set(prev);
        globalUnread.forEach(id => newSet.add(id));
        return newSet;
      });
      // Also update the ref
      globalUnread.forEach(id => unreadConversationsRef.current.add(id));
    }
  }, [globalUnread]);

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const userData = sessionStorage.getItem("user");

    if (!userData) {
      // Set loading to false before navigating to prevent white screen
      setLoading(false);
      navigate("/signin");
      return;
    }

    // Set current user
    const user = JSON.parse(userData);
    setCurrentUser(user);

    // Ensure socket is connected (global SocketContext handles this, but ensure it's initialized)
    if (!socketService.isConnected()) {
      initializeSocket();
    }

    // Load conversations and unread count
    const initializeData = async () => {
      try {
        // Load conversations first (required)
        await loadConversations();
        // Load unread count (optional, don't fail if this errors)
        try {
          await loadUnreadCount();
        } catch (unreadError) {
          console.error("Failed to load unread count:", unreadError);
          // Continue anyway, just set count to 0
          setUnreadCount(0);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };
    initializeData();

    // Socket event listeners - attach directly to socket like SocketContext does

    const messageHandler = async (message) => {
      try {

        // Handle null conversation gracefully
        if (!message.conversation && !message.conversationId) {
          return;
        }

        const currentConvId = selectedConversationRef.current?._id;
        // Handle both string and object conversation IDs - ALWAYS convert to string
        const messageConvId = String(
          typeof message.conversation === "object" && message.conversation !== null
            ? message.conversation._id
            : (message.conversation || message.conversationId)
        );
        const isCurrentConversation = currentConvId ? String(currentConvId) === messageConvId : false;

        // Use ref for current user to avoid stale closure
        const currentUserId = String(currentUserRef.current?.id || user.id);
        const senderId = String(message.sender?._id || message.sender);
        const isOwnMessage = senderId === currentUserId;


        // Add message to messages list if it matches current conversation
        setMessages((prevMessages) => {
          if (isCurrentConversation) {
            // Check if message already exists to prevent duplicates
            const messageExists = prevMessages.some((m) => String(m._id) === String(message._id));
            if (!messageExists) {
              return [...prevMessages, message];
            }
          }
          return prevMessages;
        });

        // Update or check if conversation exists
        setConversations((prev) => {
          const existingConv = prev.find((conv) => String(conv._id) === messageConvId);

          if (existingConv) {
            // Update existing conversation
            return prev.map((conv) =>
              String(conv._id) === messageConvId
                ? {
                  ...conv,
                  lastMessage: message.content,
                  lastMessageAt: message.createdAt,
                }
                : conv
            );
          } else {
            // Reload conversations immediately when conversation not found
            (async () => {
              try {
                const response = await chatAPI.getUserConversations();
                setConversations(response.data);

                // Join all conversation rooms including the new one
                response.data.forEach((conversation) => {
                  socketService.joinConversation(conversation._id);
                });

                // Also mark this new conversation as unread if message is from someone else
                if (!isOwnMessage) {
                  unreadConversationsRef.current.add(messageConvId);
                  setUnreadConversations((prevUnread) => {
                    const newSet = new Set(prevUnread);
                    newSet.add(messageConvId);
                    return newSet;
                  });
                }
              } catch (error) {
                console.error("Error loading new conversation:", error);
              }
            })();

            return prev;
          }
        });

        // Handle unread notifications for messages from others
        if (!isOwnMessage && !isCurrentConversation) {
          // Update both ref and state to ensure consistency
          unreadConversationsRef.current.add(messageConvId);
          setUnreadConversations((prev) => {
            const newSet = new Set(prev);
            newSet.add(messageConvId);
            return newSet;
          });
          // Increment unread count
          setUnreadCount((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Chat.jsx: ERROR in messageHandler:", error);
        console.error("Chat.jsx: Error stack:", error.stack);
      }
    };

    // Attach listener directly to socket for more reliable handling
    const attachListener = () => {
      if (!socketService.socket) {
        return false;
      }

      // Remove any existing listener with this exact handler
      socketService.socket.off("new_message", messageHandler);

      // Attach the listener
      socketService.socket.on("new_message", messageHandler);
      return true;
    };

    // Store interval ID for cleanup
    let checkIntervalId = null;
    let timeoutId = null;

    // Try to attach immediately
    if (!attachListener()) {
      // If socket not ready, wait for it
      checkIntervalId = setInterval(() => {
        if (attachListener()) {
          clearInterval(checkIntervalId);
          checkIntervalId = null;
        }
      }, 100);
      // Cleanup timeout after 10 seconds
      timeoutId = setTimeout(() => {
        if (checkIntervalId) {
          clearInterval(checkIntervalId);
          checkIntervalId = null;
        }
      }, 10000);
    }

    // Store handler reference for cleanup
    const handlerRef = messageHandler;

    socketService.onUserTyping(({ userName }) => {
      setTypingUsers((prev) => new Set(prev).add(userName));
    });

    socketService.onUserStopTyping(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        // Remove by userName (we'd need to map userId to userName)
        return newSet;
      });
    });

    socketService.onOfferUpdated((message) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === message._id ? message : msg))
      );
    });

    // Listen for unread count updates (when messages are marked as read)
    socketService.onUnreadCountUpdated(async () => {
      await loadUnreadCount();
    });

    // Message sent handler for cleanup
    const messageSentHandler = (data) => {
      // Also add the message to UI immediately after sending
      if (
        data.message &&
        data.message.conversation === selectedConversationRef.current?._id
      ) {
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some((m) => m._id === data.message._id);
          if (!exists) {
            return [...prev, data.message];
          }
          return prev;
        });
      }
    };

    // Listen for message sent confirmation
    if (socketService.socket) {
      socketService.socket.on("message_sent", messageSentHandler);
    }

    return () => {
      // Clean up intervals and timeouts
      if (checkIntervalId) {
        clearInterval(checkIntervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Remove the listener directly from socket
      if (socketService.socket) {
        socketService.socket.off("new_message", handlerRef);
        socketService.socket.off("message_sent", messageSentHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Cleanup socket on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      socketService.disconnect();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Reset reload flag when conversationId changes
  useEffect(() => {
    hasAttemptedReloadRef.current = false;
  }, [location.state?.conversationId]);

  // Auto-select conversation from navigation state (e.g., when coming from "Contact Seller")
  useEffect(() => {
    if (
      location.state?.conversationId &&
      conversations.length > 0 &&
      !selectedConversation
    ) {
      const targetConversation = conversations.find(
        (conv) => conv._id === location.state.conversationId
      );
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        // Clear the state to avoid re-selecting on subsequent renders
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        // If conversation not found, fetch it directly
        const fetchConversation = async () => {
          try {
            const response = await chatAPI.getUserConversations();
            const updatedConversations = response.data;
            setConversations(updatedConversations);

            // Join all conversation rooms
            updatedConversations.forEach((conversation) => {
              socketService.joinConversation(conversation._id);
            });

            const targetConv = updatedConversations.find(
              (conv) => conv._id === location.state.conversationId
            );
            if (targetConv) {
              setSelectedConversation(targetConv);
              navigate(location.pathname, { replace: true, state: {} });
            }
          } catch (error) {
            console.error("Error fetching conversation:", error);
          }
        };
        fetchConversation();
      }
    } else if (
      location.state?.conversationId &&
      conversations.length === 0 &&
      !loading &&
      !hasAttemptedReloadRef.current
    ) {
      hasAttemptedReloadRef.current = true;

      // If we have a target conversation but no conversations loaded, reload once
      const reloadConversations = async () => {
        try {
          const response = await chatAPI.getUserConversations();

          if (response.data.length === 0) {
            // Clear the navigation state since we can't find the conversation
            navigate(location.pathname, { replace: true, state: {} });
            return;
          }

          setConversations(response.data);

          // Join all conversation rooms
          response.data.forEach((conversation) => {
            socketService.joinConversation(conversation._id);
          });
        } catch (error) {
          console.error("Error reloading conversations:", error);
          hasAttemptedReloadRef.current = false; // Reset on error
        }
      };
      reloadConversations();
    }
  }, [
    conversations,
    location.state,
    selectedConversation,
    navigate,
    location.pathname,
    loading,
  ]);

  // Handle conversation selection
  useEffect(() => {
    if (selectedConversation) {
      // Check if conversation was unread - use String() for consistent comparison
      const convIdStr = String(selectedConversation._id);
      const wasUnread = unreadConversationsRef.current.has(convIdStr);

      // Remove from unread when opening conversation - update both ref, state, and global
      unreadConversationsRef.current.delete(convIdStr);
      setUnreadConversations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(convIdStr);
        return newSet;
      });
      // Also mark as read in global context
      markConversationRead(convIdStr);

      // Decrement unread count if conversation was unread
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // Join new conversation
      socketService.joinConversation(selectedConversation._id);

      // Load messages
      loadMessages(selectedConversation._id);

      // Mark as read
      socketService.markAsRead(selectedConversation._id);
    }

    // Cleanup: leave conversation when component unmounts or conversation changes
    return () => {
      if (selectedConversation) {
        socketService.leaveConversation(selectedConversation._id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?._id]); // Only depend on conversation ID, not unreadConversations

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getUserConversations();

      // Validate response has data
      if (response && Array.isArray(response.data)) {
        setConversations(response.data);

        // Join all conversation rooms to receive new messages
        response.data.forEach((conversation) => {
          socketService.joinConversation(conversation._id);
        });
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, []);

  // Refresh conversations when tab becomes visible (only if hidden for a while)
  useEffect(() => {
    let lastRefreshTime = Date.now();
    const MIN_REFRESH_INTERVAL = 60000; // At least 60 seconds between refreshes

    // Only refresh when tab becomes visible again after being hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !loading) {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        // Only refresh if it's been more than 60 seconds since last refresh
        if (timeSinceLastRefresh > MIN_REFRESH_INTERVAL) {
          lastRefreshTime = Date.now();
          loadConversations();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading, loadConversations]);

  // Sort conversations: unread first, then by last message time
  const sortedConversations = useMemo(() => {
    return [...conversations]
      .filter((conv) => conv && conv.seller && conv.buyer && conv.product)
      .sort((a, b) => {
        // Use String() for consistent ID comparison
        const aUnread = unreadConversations.has(String(a._id));
        const bUnread = unreadConversations.has(String(b._id));

        // Unread conversations come first
        if (aUnread && !bUnread) return -1;
        if (!aUnread && bUnread) return 1;

        // Then sort by last message time (most recent first)
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      });
  }, [conversations, unreadConversations]);

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response.data);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]); // Clear messages on error
    }
  }, []);

  const handleSendMessage = async (content) => {
    if (!selectedConversation) {
      console.error("No conversation selected");
      return;
    }

    if (!socketService.isConnected()) {
      const userData = sessionStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.token) {
          socketService.connect(user.token);
          try {
            await socketService.waitForConnection(3000);
          } catch (error) {
            console.error("Failed to connect socket:", error);
            alert("Connection failed. Please refresh the page and try again.");
            setSending(false);
            return;
          }
        }
      }
    }

    setSending(true);
    try {
      const sent = socketService.sendMessage(selectedConversation._id, content, "text");
      if (!sent) {
        alert("Failed to send message. Please refresh the page and try again.");
        return;
      }
      socketService.sendStopTyping(selectedConversation._id);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  const handleSendOffer = async (amount) => {
    if (!selectedConversation) return;

    setSending(true);
    try {
      const content = `Offer: Rs. ${amount.toLocaleString()}`;
      socketService.sendMessage(
        selectedConversation._id,
        content,
        "offer",
        amount
      );
    } catch (error) {
      console.error("Error sending offer:", error);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptOffer = async (messageId) => {
    try {
      socketService.updateOffer(
        messageId,
        "accepted",
        selectedConversation._id
      );
    } catch (error) {
      console.error("Error accepting offer:", error);
    }
  };

  const handleRejectOffer = async (messageId) => {
    try {
      socketService.updateOffer(
        messageId,
        "rejected",
        selectedConversation._id
      );
    } catch (error) {
      console.error("Error rejecting offer:", error);
    }
  };

  const handleLogout = async () => {
    // Properly disconnect socket on logout
    socketService.disconnect();
    try {
      const { authAPI } = await import("../utils/api");
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  const confirmDeleteConversation = (conversationId, userName) => {
    setDeleteModal({ open: true, conversationId, userName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, conversationId: null, userName: "" });
  };

  const handleDeleteConversation = async () => {
    const conversationId = deleteModal.conversationId;
    if (!conversationId) return;

    closeDeleteModal();

    try {
      await chatAPI.deleteConversation(conversationId);

      // Remove from conversations list
      setConversations((prev) =>
        prev.filter((conv) => conv._id !== conversationId)
      );

      // Clear selected conversation if it was deleted
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
        socketService.leaveConversation(conversationId);
      }

      // Remove from unread set if present - use String() for consistent comparison
      const convIdStr = String(conversationId);
      unreadConversationsRef.current.delete(convIdStr);
      setUnreadConversations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(convIdStr);
        return newSet;
      });
      // Also mark as read in global context
      markConversationRead(convIdStr);

      // Reload unread count
      await loadUnreadCount();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("Failed to delete conversation. Please try again.");
    }
  };

  if (loading || !currentUser) {
    return <Loader fullScreen size="lg" />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 pt-16 sm:pt-20">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Conversations List - Hidden on mobile when conversation is selected */}
        <div className={`
          ${selectedConversation ? 'hidden md:flex' : 'flex'}
          w-full md:w-80 lg:w-96 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col
          absolute md:relative inset-0 z-10 md:z-auto
        `}>
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Messages
              </h1>
              {unreadConversations.size > 0 && (
                <span className="px-2.5 py-0.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-semibold rounded-full shadow-sm">
                  {unreadConversations.size} new
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sortedConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-300">No conversations yet</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Start a conversation from the Marketplace</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    isActive={selectedConversation?._id === conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    currentUserId={currentUser?.id || ""}
                    hasUnread={unreadConversations.has(String(conversation._id))}
                    onDelete={confirmDeleteConversation}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area - Full width on mobile when conversation is selected */}
        <div className={`
          ${selectedConversation ? 'flex' : 'hidden md:flex'}
          w-full md:flex-1 flex-col
          absolute md:relative inset-0 z-20 md:z-auto
          bg-white dark:bg-gray-900
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
                {/* Back Button - Mobile Only */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Avatar */}
                {(() => {
                  const otherUser = selectedConversation.seller._id.toString() === currentUser.id.toString()
                    ? selectedConversation.buyer
                    : selectedConversation.seller;
                  return otherUser.avatar ? (
                    <img
                      src={otherUser.avatar}
                      alt={otherUser.name}
                      className="w-10 h-10 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold shadow-sm">
                      {otherUser.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  );
                })()}

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                    {selectedConversation.seller._id.toString() ===
                      currentUser.id.toString()
                      ? selectedConversation.buyer.name
                      : selectedConversation.seller.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {selectedConversation.product?.title || "Product"}
                    </span>
                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                      Rs. {(selectedConversation.product?.price || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
                {messages.map((message, index) => {
                  // Check if we need a date separator
                  const messageDate = new Date(message.createdAt);
                  const prevMessage = messages[index - 1];
                  const showDateSeparator =
                    !prevMessage ||
                    new Date(prevMessage.createdAt).toDateString() !==
                    messageDate.toDateString();

                  // Check if messages are grouped (same sender, close in time)
                  const isGrouped =
                    prevMessage &&
                    prevMessage.sender._id === message.sender._id &&
                    new Date(message.createdAt) - new Date(prevMessage.createdAt) <
                    60000; // 1 minute

                  const formatDateSeparator = (date) => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    if (date.toDateString() === today.toDateString()) {
                      return "Today";
                    } else if (date.toDateString() === yesterday.toDateString()) {
                      return "Yesterday";
                    } else {
                      return date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      });
                    }
                  };

                  return (
                    <React.Fragment key={message._id}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-4">
                          <div className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm">
                            {formatDateSeparator(messageDate)}
                          </div>
                        </div>
                      )}
                      <MessageBubble
                        message={message}
                        isOwnMessage={message.sender._id === currentUser.id}
                        onAcceptOffer={handleAcceptOffer}
                        onRejectOffer={handleRejectOffer}
                        isGrouped={isGrouped}
                      />
                    </React.Fragment>
                  );
                })}

                {typingUsers.size > 0 && (
                  <TypingIndicator
                    userName={Array.from(typingUsers).join(", ")}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Available for both buyers and sellers */}
              <MessageInput
                onSendMessage={handleSendMessage}
                onSendOffer={handleSendOffer}
                disabled={sending}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Select a conversation</p>
              <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Choose a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConversation}
        title="Delete Conversation"
        message={
          <>
            Are you sure you want to delete your conversation with{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {deleteModal.userName}
            </span>
            ? This will only remove it from your view.
          </>
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Chat;
