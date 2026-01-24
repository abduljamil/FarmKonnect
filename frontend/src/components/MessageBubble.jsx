import React from "react";

const MessageBubble = ({
  message,
  isOwnMessage,
  onAcceptOffer,
  onRejectOffer,
}) => {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOfferMessage = () => {
    if (message.messageType !== "offer") return null;

    const getOfferStatusColor = () => {
      switch (message.offerStatus) {
        case "accepted":
          return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700";
        case "rejected":
          return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700";
        case "countered":
          return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700";
        default:
          return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700";
      }
    };

    return (
      <div className={`mt-2 p-3 border-2 rounded-lg ${getOfferStatusColor()}`}>
        <div className="font-semibold text-lg">
          Offer: ${message.offerAmount?.toLocaleString()}
        </div>
        <div className="text-sm mt-1 capitalize">
          Status: {message.offerStatus || "pending"}
        </div>

        {!isOwnMessage && message.offerStatus === "pending" && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onAcceptOffer(message._id)}
              className="px-4 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 text-sm transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onRejectOffer(message._id)}
              className="px-4 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 text-sm transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : "order-1"}`}>
        {!isOwnMessage && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 ml-1">
            {message.sender?.name}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwnMessage
              ? "bg-primary-600 text-white rounded-br-none shadow-lg"
              : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
          }`}
        >
          <div className="break-words">{message.content}</div>
          {renderOfferMessage()}
          <div
            className={`text-xs mt-1 ${
              isOwnMessage
                ? "text-primary-100"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {formatTime(message.createdAt)}
            {isOwnMessage && message.read && <span className="ml-2">✓✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
