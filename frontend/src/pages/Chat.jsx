import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ConversationItem from "../components/ConversationItem";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import socketService from "../utils/socket";
import chatAPI from "../utils/chatApi";
import useUserSync from "../hooks/useUserSync";

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);

  // Auto-sync user data (role updates)
  useUserSync(user, setUser, navigate);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadConversations, setUnreadConversations] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const hasAttemptedReloadRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

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
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");

    if (!token || !userData) {
      // Set loading to false before navigating to prevent white screen
      setLoading(false);
      navigate("/signin");
      return;
    }

    // Set current user
    const user = JSON.parse(userData);
    setCurrentUser(user);

    // Connect socket (singleton - only one instance will be created)
    socketService.connect(token);

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

    // Socket event listeners
    socketService.onNewMessage(async (message) => {
      // Handle null conversation gracefully
      if (!message.conversation && !message.conversationId) {
        return;
      }
      
      const currentConvId = selectedConversationRef.current?._id;
      // Handle both string and object conversation IDs
      const messageConvId =
        typeof message.conversation === "object" && message.conversation !== null
          ? message.conversation._id
          : message.conversation;
      const isCurrentConversation = messageConvId === currentConvId;
      const isOwnMessage = message.sender._id === user.id;

      // Add message to messages list if it matches current conversation
      setMessages((prevMessages) => {
        if (isCurrentConversation) {
          // Check if message already exists to prevent duplicates
          const messageExists = prevMessages.some((m) => m._id === message._id);
          if (!messageExists) {
            return [...prevMessages, message];
          }
        }
        return prevMessages;
      });

      // Update or check if conversation exists
      setConversations((prev) => {
        const existingConv = prev.find((conv) => conv._id === messageConvId);

        if (existingConv) {
          // Update existing conversation
          return prev.map((conv) =>
            conv._id === messageConvId
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
            } catch (error) {
              console.error("Error loading new conversation:", error);
            }
          })();

          return prev;
        }
      });

      // Handle unread notifications for messages from others
      if (!isOwnMessage) {
        // Add to unread conversations if not viewing this conversation
        if (!isCurrentConversation) {
          setUnreadConversations((prev) => {
            const newSet = new Set(prev);
            newSet.add(messageConvId);
            return newSet;
          });
          // Increment unread count
          setUnreadCount((prev) => prev + 1);
        }
      }
    });

    socketService.onUserTyping(({ userName }) => {
      setTypingUsers((prev) => new Set(prev).add(userName));
    });

    socketService.onUserStopTyping(({ userId }) => {
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

    // Listen for message sent confirmation
    if (socketService.socket) {
      socketService.socket.on("message_sent", (data) => {
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
      });
    }

    return () => {
      // Don't disconnect socket on cleanup - it's a singleton
      // Just cleanup will happen when user actually leaves the app
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
      // Check if conversation was unread
      const wasUnread = unreadConversations.has(selectedConversation._id);

      // Remove from unread when opening conversation
      setUnreadConversations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedConversation._id);
        return newSet;
      });

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
      setConversations(response.data);

      // Join all conversation rooms to receive new messages
      response.data.forEach((conversation) => {
        socketService.joinConversation(conversation._id);
      });
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, []);

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
      console.error("Socket is not connected. Reconnecting...");
      const token = sessionStorage.getItem("token");
      socketService.connect(token);
      // Wait a bit for connection
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setSending(true);
    try {
      socketService.sendMessage(selectedConversation._id, content, "text");
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
      const content = `Offer: $${amount.toLocaleString()}`;
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

  const handleLogout = () => {
    // Properly disconnect socket on logout
    socketService.disconnect();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  const handleDeleteConversation = async (conversationId) => {
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

      // Remove from unread set if present
      setUnreadConversations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Conversations List - Hidden on mobile when conversation is selected */}
        <div className={`
          ${selectedConversation ? 'hidden md:flex' : 'flex'} 
          w-full md:w-80 lg:w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col
          absolute md:relative inset-0 z-10 md:z-auto
        `}>
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Messages
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4 text-center">
                <div className="text-4xl mb-3">💬</div>
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Start a conversation from the Marketplace</p>
              </div>
            ) : (
              conversations
                .filter(
                  (conv) => conv && conv.seller && conv.buyer && conv.product
                )
                .map((conversation) => (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    isActive={selectedConversation?._id === conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    currentUserId={currentUser?.id || ""}
                    hasUnread={unreadConversations.has(conversation._id)}
                    onDelete={handleDeleteConversation}
                  />
                ))
            )}
          </div>
        </div>

        {/* Chat Area - Full width on mobile when conversation is selected */}
        <div className={`
          ${selectedConversation ? 'flex' : 'hidden md:flex'} 
          flex-1 flex-col
          absolute md:relative inset-0 z-20 md:z-auto
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
                {/* Back Button - Mobile Only */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                    {selectedConversation.seller._id.toString() ===
                    currentUser.id.toString()
                      ? selectedConversation.buyer.name
                      : selectedConversation.seller.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                    {selectedConversation.product.title} - Rs.{" "}
                    {selectedConversation.product.price.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((message) => (
                  <MessageBubble
                    key={message._id}
                    message={message}
                    isOwnMessage={message.sender._id === currentUser.id}
                    onAcceptOffer={handleAcceptOffer}
                    onRejectOffer={handleRejectOffer}
                  />
                ))}

                {typingUsers.size > 0 && (
                  <div className="text-sm text-gray-500 italic mb-2">
                    {Array.from(typingUsers).join(", ")} typing...
                  </div>
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
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 p-4">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
