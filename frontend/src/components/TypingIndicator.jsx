import React from "react";

const TypingIndicator = ({ userName }) => {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="flex flex-col items-start max-w-[75%] sm:max-w-[65%]">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-3">
          {userName}
        </span>
        <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 bg-primary-400 dark:bg-primary-500 rounded-full animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "600ms" }}
            />
            <span
              className="w-2 h-2 bg-primary-400 dark:bg-primary-500 rounded-full animate-bounce"
              style={{ animationDelay: "150ms", animationDuration: "600ms" }}
            />
            <span
              className="w-2 h-2 bg-primary-400 dark:bg-primary-500 rounded-full animate-bounce"
              style={{ animationDelay: "300ms", animationDuration: "600ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
