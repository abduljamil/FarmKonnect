import React from "react";
import { Check, CheckCheck } from "lucide-react";

const MessageBubble = ({
  message,
  isOwnMessage,
  onAcceptOffer,
  onRejectOffer,
  isGrouped = false,
}) => {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOfferMessage = () => {
    if (message.messageType !== "offer") return null;

    const getOfferStyles = () => {
      switch (message.offerStatus) {
        case "accepted":
          return {
            bg: isOwnMessage ? "bg-white/15" : "bg-primary-50 dark:bg-primary-900/30",
            border: isOwnMessage ? "border-white/20" : "border-primary-200 dark:border-primary-700",
            text: isOwnMessage ? "text-white" : "text-primary-700 dark:text-primary-300",
            badge: "bg-primary-600 text-white",
          };
        case "rejected":
          return {
            bg: isOwnMessage ? "bg-white/15" : "bg-red-50 dark:bg-red-900/30",
            border: isOwnMessage ? "border-white/20" : "border-red-200 dark:border-red-700",
            text: isOwnMessage ? "text-white" : "text-red-700 dark:text-red-300",
            badge: "bg-red-600 text-white",
          };
        case "countered":
          return {
            bg: isOwnMessage ? "bg-white/15" : "bg-amber-50 dark:bg-amber-900/30",
            border: isOwnMessage ? "border-white/20" : "border-amber-200 dark:border-amber-700",
            text: isOwnMessage ? "text-white" : "text-amber-700 dark:text-amber-300",
            badge: "bg-amber-600 text-white",
          };
        default:
          return {
            bg: isOwnMessage ? "bg-white/15" : "bg-primary-50 dark:bg-primary-900/30",
            border: isOwnMessage ? "border-white/20" : "border-primary-200 dark:border-primary-700",
            text: isOwnMessage ? "text-white" : "text-primary-700 dark:text-primary-300",
            badge: "bg-primary-600 text-white",
          };
      }
    };

    const styles = getOfferStyles();

    return (
      <div className={`mt-3 p-4 rounded-xl border ${styles.bg} ${styles.border}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-xs uppercase tracking-wide mb-1 ${isOwnMessage ? "text-white/60" : "text-gray-500 dark:text-gray-400"}`}>
              Price Offer
            </p>
            <p className={`text-xl font-bold ${styles.text}`}>
              Rs. {message.offerAmount?.toLocaleString()}
            </p>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${styles.badge}`}>
            {message.offerStatus || "pending"}
          </span>
        </div>

        {!isOwnMessage && message.offerStatus === "pending" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onAcceptOffer(message._id)}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow"
            >
              Accept Offer
            </button>
            <button
              onClick={() => onRejectOffer(message._id)}
              className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-all duration-200"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${isGrouped ? "mb-1" : "mb-3"}`}
    >
      <div className={`max-w-[75%] sm:max-w-[65%] ${isOwnMessage ? "order-2" : "order-1"}`}>
        {!isOwnMessage && !isGrouped && (
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-3">
            {message.sender?.name}
          </div>
        )}

        <div
          className={`relative px-4 py-2.5 ${isOwnMessage
              ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl rounded-br-md shadow-md"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-700"
            }`}
        >
          <div className="break-words text-[15px] leading-relaxed">{message.content}</div>
          {renderOfferMessage()}
          <div
            className={`flex items-center justify-end gap-1 mt-1 ${isOwnMessage
                ? "text-white/70"
                : "text-gray-400 dark:text-gray-500"
              }`}
          >
            <span className="text-[11px]">{formatTime(message.createdAt)}</span>
            {isOwnMessage && (
              message.read ? (
                <CheckCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MessageBubble);
