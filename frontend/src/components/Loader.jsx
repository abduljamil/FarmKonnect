import React from "react";

const Loader = ({ size = "md", fullScreen = false }) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
    xl: "w-24 h-24",
  };

  const loaderSize = sizeClasses[size] || sizeClasses.md;

  const content = (
    <div className="flex items-center justify-center">
      <div
        className={`${loaderSize}`}
        style={{
          aspectRatio: "1",
          background: `
            no-repeat radial-gradient(farthest-side, #22c55e 92%, transparent) top,
            no-repeat radial-gradient(farthest-side, #22c55e 92%, transparent) left,
            no-repeat radial-gradient(farthest-side, #22c55e 92%, transparent) right,
            no-repeat radial-gradient(farthest-side, #22c55e 92%, transparent) bottom
          `,
          backgroundSize: "25% 25%",
          animation: "loaderRotate 1s infinite linear",
        }}
      ></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      {content}
    </div>
  );
};

// Button loader for inline loading states
export const ButtonLoader = ({ size = 16 }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default Loader;
