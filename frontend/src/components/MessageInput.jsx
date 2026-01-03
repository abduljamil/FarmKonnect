import React, { useState } from "react";
import Button from "./Button";

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

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      {showOfferInput ? (
        <form onSubmit={handleSendOffer} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enter Your Offer Amount
            </label>
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              step="0.01"
              autoFocus
              disabled={disabled}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                disabled || !offerAmount || parseFloat(offerAmount) <= 0
              }
            >
              Send Offer
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowOfferInput(false);
                setOfferAmount("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => setShowOfferInput(true)}
            className="px-4 py-2 border-2 border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 font-medium transition-colors disabled:opacity-50"
            disabled={disabled}
          >
            Make Offer
          </button>
          <Button type="submit" disabled={disabled || !message.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
};

export default MessageInput;
