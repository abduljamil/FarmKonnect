import React, { memo } from "react";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";

const StatsCard = ({
  title,
  value,
  unit = "",
  trend = null,
  trendLabel = "",
  icon: Icon,
  actionButton = null,
  className = "",
}) => {
  const isTrendingUp = trend && trend > 0;
  const trendColor = isTrendingUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  const bgColor = isTrendingUp ? "bg-green-50 dark:bg-green-900/30" : "bg-red-50 dark:bg-red-900/30";

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700
        hover:shadow-lg transition-shadow duration-300
        ${className}
      `}
    >
      {/* Header with Icon and Title */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            {title}
          </p>
        </div>
        {Icon && (
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
            <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
          {unit && <span className="text-lg text-gray-600 dark:text-gray-400 ml-1">{unit}</span>}
        </p>
      </div>

      {/* Trend */}
      {trend !== null && (
        <div className={`flex items-center gap-2 p-2 rounded ${bgColor} mb-4`}>
          {isTrendingUp ? (
            <TrendingUp className={`w-4 h-4 ${trendColor}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 ${trendColor}`} />
          )}
          <span className={`text-sm font-semibold ${trendColor}`}>
            {Math.abs(trend)}% {isTrendingUp ? "Up" : "Down"}
          </span>
          {trendLabel && (
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-auto">{trendLabel}</span>
          )}
        </div>
      )}

      {/* Action Button */}
      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className="
            w-full flex items-center justify-center gap-2
            bg-emerald-600 hover:bg-emerald-700 text-white
            font-medium py-2 px-4 rounded-lg
            transition-colors duration-200
          "
        >
          <Plus className="w-4 h-4" />
          {actionButton.label}
        </button>
      )}
    </div>
  );
};

export default memo(StatsCard);