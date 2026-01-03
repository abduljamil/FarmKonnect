import React from "react";
import PropTypes from "prop-types";

const Card = ({
  children,
  title,
  className = "",
  variant = "default",
  hover = false,
  padding = "default",
  onClick,
}) => {
  const variants = {
    default:
      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md",
    feature:
      "bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 border border-primary-200 dark:border-primary-800",
    info: "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
  };

  const paddings = {
    none: "",
    sm: "p-4",
    default: "p-6",
    lg: "p-8",
  };

  const hoverStyles =
    hover || onClick ? "hover:shadow-xl hover:scale-[1.02] cursor-pointer" : "";

  return (
    <div
      className={`rounded-xl transition-all duration-200 animate-fadeIn ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={onClick ? (e) => e.key === "Enter" && onClick(e) : undefined}
    >
      {title && (
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          {title}
        </h3>
      )}
      <div className="text-gray-600 dark:text-gray-100">{children}</div>
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(["default", "feature", "info"]),
  hover: PropTypes.bool,
  padding: PropTypes.oneOf(["none", "sm", "default", "lg"]),
  onClick: PropTypes.func,
};

export default Card;
