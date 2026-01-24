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

export default Loader;
