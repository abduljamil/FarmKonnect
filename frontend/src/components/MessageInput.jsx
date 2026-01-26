import React, { useState } from "react";
import { Send, X } from "lucide-react";

const MessageInput = ({ onSendMessage, onSendOffer, disabled }) => {
  const [message, setMessage] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleSendOffer = (e) => {
    e.preventDefault();
    const amount = parseFloat(offerAmount);
    if (amount > 0) {
      onSendOffer(amount);
      setOfferAmount("");
      setShowOfferInput(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4">
      {showOfferInput ? (
        <form onSubmit={handleSendOffer} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Make a Price Offer
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowOfferInput(false);
                setOfferAmount("");
              }}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
              Rs.
            </span>
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-lg font-semibold placeholder-gray-300 dark:placeholder-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              min="0"
              step="1"
              autoFocus
              disabled={disabled}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled || !offerAmount || parseFloat(offerAmount) <= 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow hover:-translate-y-0.5"
            >
              Send Offer
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOfferInput(false);
                setOfferAmount("");
              }}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOfferInput(true)}
            className="flex-shrink-0 px-3 py-2.5 rounded-lg border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-semibold text-sm transition-all duration-200 disabled:opacity-50"
            disabled={disabled}
          >
            Make Offer
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              disabled={disabled}
            />
          </div>

          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="flex-shrink-0 p-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white disabled:text-gray-400 dark:disabled:text-gray-500 transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow hover:-translate-y-0.5"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      )}
    </div>
  );
};

export default MessageInput;
