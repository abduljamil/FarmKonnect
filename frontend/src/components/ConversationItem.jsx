import React from "react";

const ConversationItem = ({
  conversation,
  isActive,
  onClick,
  currentUserId,
  hasUnread = false,
  onDelete,
}) => {
  // Safety check for conversation data - be more thorough
  if (!conversation) {
    console.error("Conversation is null or undefined");
    return null;
  }

  if (!conversation.seller || !conversation.seller._id) {
    console.error("Invalid seller data in conversation:", conversation);
    return null;
  }

  if (!conversation.buyer || !conversation.buyer._id) {
    console.error("Invalid buyer data in conversation:", conversation);
    return null;
  }

  if (!currentUserId || currentUserId === "") {
    // Silently return null during initial load - don't spam console
    return null;
  }

  // Convert IDs to strings for proper comparison
  const currentUserIdStr = String(currentUserId);
  const sellerIdStr = String(conversation.seller._id);
  const isSeller = sellerIdStr === currentUserIdStr;
  const otherUser = isSeller ? conversation.buyer : conversation.seller;

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent triggering onClick
    if (
      window.confirm(
        "Are you sure you want to delete this conversation? This will only remove it from your view."
      )
    ) {
      onDelete(conversation._id);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-4 cursor-pointer border-b border-gray-200 dark:border-gray-800 transition-all duration-200 relative ${
        isActive
          ? "bg-primary-100 dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-gray-800 shadow-sm"
          : hasUnread
          ? "bg-gradient-to-r from-primary-100 to-primary-50 dark:from-gray-800 dark:to-gray-850 hover:from-primary-100 hover:to-primary-100 dark:hover:from-gray-800 dark:hover:to-gray-800 border-l-4 border-l-primary-600 dark:border-l-primary-400 shadow-sm"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
    >
      {/* Unread indicator */}
      {hasUnread && !isActive && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse"></div>
      )}

      {/* Product Image */}
      <div className="flex-shrink-0">
        {conversation.product?.images?.[0] ? (
          <img
            src={conversation.product.images[0]}
            alt={conversation.product.title}
            className="w-14 h-14 rounded-lg object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-600 dark:text-gray-400 text-xs">
              No image
            </span>
          </div>
        )}
      </div>

      {/* Conversation Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3
              className={`text-gray-900 dark:text-gray-100 truncate ${
                hasUnread ? "font-bold" : "font-semibold"
              }`}
            >
              {otherUser.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {conversation.product?.title}
            </p>
          </div>
          <span
            className={`text-xs ml-2 flex-shrink-0 ${
              hasUnread
                ? "text-primary-600 dark:text-primary-400 font-semibold"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>

        {conversation.lastMessage && (
          <p
            className={`text-sm truncate mt-1 ${
              hasUnread
                ? "text-gray-900 dark:text-gray-100 font-semibold"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {conversation.lastMessage}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              conversation.product?.status === "active"
                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {conversation.product?.status || "N/A"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ${conversation.product?.price?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="flex-shrink-0 p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
        title="Delete conversation"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
};

export default ConversationItem;
