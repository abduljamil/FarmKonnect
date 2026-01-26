import React from "react";
import { Trash2, MessageSquare } from "lucide-react";

const ConversationItem = ({
  conversation,
  isActive,
  onClick,
  currentUserId,
  hasUnread = false,
  onDelete,
}) => {
  // Safety checks
  if (!conversation || !conversation.seller?._id || !conversation.buyer?._id || !currentUserId) {
    return null;
  }

  const currentUserIdStr = String(currentUserId);
  const sellerIdStr = String(conversation.seller._id);
  const isSeller = sellerIdStr === currentUserIdStr;
  const otherUser = isSeller ? conversation.buyer : conversation.seller;
  const product = conversation.product;

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
    e.stopPropagation();
    onDelete(conversation._id, otherUser.name);
  };

  const getInitial = (name) => {
    return name?.charAt(0)?.toUpperCase() || "?";
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex gap-3 p-3 cursor-pointer transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg"
          : hasUnread
          ? "bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {otherUser.avatar ? (
          <img
            src={otherUser.avatar}
            alt={otherUser.name}
            className={`w-12 h-12 rounded-full object-cover ${isActive ? "ring-2 ring-white/40" : ""}`}
          />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
            isActive
              ? "bg-white/20 text-white"
              : "bg-gradient-to-br from-primary-500 to-primary-600 text-white"
          }`}>
            {getInitial(otherUser.name)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row - Name and time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`truncate text-[15px] font-semibold ${
              isActive
                ? "text-white"
                : hasUnread
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-800 dark:text-gray-200"
            }`}>
              {otherUser.name}
            </h3>
            {/* Unread indicator - next to name */}
            {hasUnread && !isActive && (
              <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className={`text-[11px] flex-shrink-0 font-medium ${
            isActive
              ? "text-white/70"
              : hasUnread
                ? "text-primary-600 dark:text-primary-400"
                : "text-gray-400 dark:text-gray-500"
          }`}>
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>

        {/* Product Info */}
        <div className={`flex items-center gap-2 mt-1.5 p-1.5 rounded-lg ${
          isActive
            ? "bg-white/15"
            : "bg-gray-100 dark:bg-gray-800"
        }`}>
          {/* Product Image */}
          {product?.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-9 h-9 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${
              isActive ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"
            }`}>
              <span className="text-sm">🌾</span>
            </div>
          )}
          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <p className={`text-xs truncate ${
              isActive ? "text-white/80" : "text-gray-600 dark:text-gray-400"
            }`}>
              {product?.title || "Product"}
            </p>
            <p className={`text-sm font-bold ${
              isActive ? "text-white" : "text-primary-600 dark:text-primary-400"
            }`}>
              Rs. {product?.price?.toLocaleString() || "0"}
            </p>
          </div>
        </div>

        {/* Last message preview - always show for consistent height */}
        <div className={`flex items-center gap-1.5 mt-2 h-5 ${
          isActive
            ? "text-white/60"
            : hasUnread
              ? "text-gray-700 dark:text-gray-300"
              : "text-gray-500 dark:text-gray-400"
        }`}>
          <MessageSquare className="w-3 h-3 flex-shrink-0" />
          <p className="text-[13px] truncate">
            {conversation.lastMessage || "No messages yet"}
          </p>
        </div>
      </div>

      {/* Delete button - shows on hover */}
      <button
        onClick={handleDelete}
        className={`absolute right-2 bottom-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-500 text-white hover:bg-red-600 shadow-sm`}
        title="Delete conversation"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ConversationItem;
